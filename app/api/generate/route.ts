import { NextRequest, NextResponse } from 'next/server'
import { checkUserRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'
import type { ZodError } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages'
import prisma from '@/lib/prisma'
import { parseGeneratedCode, analyzeCodeQuality, checkCSPViolations, completeIncompleteHTML } from '@/lib/code-parser'
import { enhanceGeneratedCode } from '@/lib/code-enhancer'
import { ProjectStatus } from '@prisma/client'
import { apiQueue } from '@/lib/api-queue'

// ============================================================================
// VALIDATION
// ============================================================================

const generateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  projectId: z.string().uuid().optional(),
  generationType: z.string().max(50).optional(),
  retryAttempt: z.number().int().min(0).max(5).optional(),
  continuationContext: z.string().max(50000).optional()
});

// ============================================================================
// TYPES
// ============================================================================

interface StreamEvent {
  type: 'content' | 'html' | 'complete' | 'error' | 'retry'
  text?: string
  content?: string
  totalLength?: number
  message?: string
  attempt?: number
  error?: string
  parsed?: {
    hasHtml: boolean
    hasCss: boolean
    hasJavaScript: boolean
    isComplete: boolean
  }
  metadata?: {
    tokensUsed: number
    generationTime: number
    wasTruncated: boolean
    stopReason: string
  }
}

// ============================================================================
// ENTERPRISE SYSTEM PROMPT
// ============================================================================

const ENTERPRISE_SYSTEM_PROMPT = `You are an expert full-stack web developer creating production-ready web applications.

CRITICAL RULES:
1. Generate COMPLETE, FULLY FUNCTIONAL code in a SINGLE HTML file
2. ALL CSS must be in <style> tags in <head>
3. ALL JavaScript must be in <script> tags before </body>
4. ALWAYS wrap JavaScript in DOMContentLoaded event listener
5. NEVER use external dependencies or CDN links
6. Include proper error handling and null checks
7. Use modern ES6+ JavaScript
8. Make it responsive and accessible
9. Include smooth animations where appropriate
10. COMPLETE the entire application - no truncation

CODE STRUCTURE TEMPLATE:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>App Title</title>
   <style>
       /* ALL CSS HERE */
   </style>
</head>
<body>
   <!-- ALL HTML CONTENT HERE -->
   
   <script>
   document.addEventListener('DOMContentLoaded', () => {
       // ALL JAVASCRIPT HERE
       
       const todoApp = {
           todos: [],
           
           init() {
               this.loadTodos();
               this.render();
           },
           
           addTodo() {
               const input = document.getElementById('todoInput');
               if (!input || !input.value.trim()) return;
               
               this.todos.push({
                   id: Date.now(),
                   text: input.value.trim(),
                   completed: false
               });
               
               input.value = '';
               this.saveTodos();
               this.render();
           },
           
           loadTodos() {
               try {
                   const saved = localStorage.getItem('todos');
                   if (saved) this.todos = JSON.parse(saved);
               } catch (e) {
                   console.error('Failed to load todos:', e);
               }
           },
           
           saveTodos() {
               try {
                   localStorage.setItem('todos', JSON.stringify(this.todos));
               } catch (e) {
                   console.error('Failed to save todos:', e);
               }
           },
           
           render() {
               const list = document.getElementById('todoList');
               if (!list) return;
               
               list.innerHTML = this.todos.map(todo => \`
                   <div class="todo-item">
                       \${this.escapeHtml(todo.text)}
                   </div>
               \`).join('');
           },
           
           escapeHtml(text) {
               const div = document.createElement('div');
               div.textContent = text;
               return div.innerHTML;
           }
       };
       
       todoApp.init();
   });
   </script>
</body>
</html>
\`\`\`

REMEMBER:
- ONE file with EVERYTHING inside
- NO external references
- ALL code wrapped in DOMContentLoaded
- ALWAYS check elements exist
- Use proper error handling
- Complete and valid HTML/CSS/JS`

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getOptimalTokenLimit(prompt: string, generationType: string): number {
  // Estimate tokens needed based on prompt length and type
  const baseTokens = 15000 // Increased base for more complete generations
  const promptTokenEstimate = Math.ceil(prompt.length / 4)
  
  // Detect complex prompts (longer descriptions, multiple features)
  const isComplexPrompt = prompt.length > 500 || 
                          prompt.includes('dashboard') || 
                          prompt.includes('multiple') ||
                          prompt.includes('pages') ||
                          prompt.includes('CRM') ||
                          prompt.includes('admin')
  
  if (generationType === 'landing-page') {
    const limit = isComplexPrompt ? 25000 : 18000
    return Math.min(limit, baseTokens + promptTokenEstimate * 2)
  } else if (generationType === 'webapp') {
    const limit = isComplexPrompt ? 40000 : 30000
    return Math.min(limit, baseTokens + promptTokenEstimate * 3)
  }
  
  return baseTokens
}

async function createMessageWithRetry(
  anthropic: Anthropic,
  params: MessageCreateParams & { stream: true }
): Promise<ReturnType<Anthropic['messages']['stream']>> {
  const maxRetries = 3
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await anthropic.messages.stream(params)
    } catch (error) {
      lastError = error as Error
      
      // Check if it's an overload error
      if (error instanceof Error && error.message.includes('overloaded')) {
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        console.log(`⏳ API overloaded, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // For other errors, throw immediately
      throw error
    }
  }
  
  throw lastError || new Error('Failed to create message after retries')
}

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  try {
    // ============================================================================
    // 1. AUTHENTICATION
    // ============================================================================
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // 2. GET USER DATA & VALIDATE SUBSCRIPTION
    // ============================================================================
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    })

    if (!user || user.subscriptionStatus !== 'active') {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }

    // ============================================================================
    // 3. RATE LIMIT CHECK
    // ============================================================================
    const rateLimit = await checkUserRateLimit(
      req,
      user.id,
      user.subscriptionTier,
      user.subscriptionStatus
    )

    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit, user.subscriptionTier)
    }

    // ============================================================================
    // 4. PROCESS REQUEST & VALIDATE INPUT
    // ============================================================================
    const body = await req.json()
    const validatedData = generateRequestSchema.parse(body);
    const { prompt, projectId, generationType = 'webapp', retryAttempt = 0, continuationContext } = validatedData;

    console.log('🚀 Starting generation:', {
      projectId,
      promptLength: prompt.length,
      generationType,
      maxTokens: getOptimalTokenLimit(prompt, generationType),
      retryAttempt
    })

    // ============================================================================
    // 5. STREAM AI GENERATION
    // ============================================================================
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = ''
          let inputTokens = 0

          // Build enhanced prompt with continuation context if available
          const enhancedPrompt = continuationContext
            ? `${prompt}\n\nCONTINUATION CONTEXT: You previously generated:\n${continuationContext}\n\nPlease complete the generation, focusing on what's missing.`
            : prompt

          // Create message with streaming using retry logic
          const messageStream = await apiQueue.add(() =>
            createMessageWithRetry(anthropic, {
              model: 'claude-sonnet-4-20250514',
              max_tokens: getOptimalTokenLimit(prompt, generationType),
              messages: [{ role: 'user', content: enhancedPrompt }],
              system: ENTERPRISE_SYSTEM_PROMPT,
              stream: true,
            })
          )

          // Process streaming response
          for await (const event of messageStream) {
            if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens
              if (process.env.NODE_ENV === 'development') {
                console.log('📝 Input tokens:', inputTokens)
              }
            }

            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                const text = event.delta.text
                fullContent += text

                // Stream content to client
                const streamEvent: StreamEvent = {
                  type: 'content',
                  text,
                  totalLength: fullContent.length,
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamEvent)}\n\n`))
              }
            }

            if (event.type === 'message_delta') {
              if (event.delta.stop_reason && process.env.NODE_ENV === 'development') {
                console.log('⏹️ Stop reason:', event.delta.stop_reason)
              }
            }

            if (event.type === 'message_stop') {
              console.log('✅ Stream complete. Total characters:', fullContent.length)
            }
          }

          // Parse and validate generated code
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Parsing generated code (' + fullContent.length + ' characters)...')
          }
          
          const parsed = parseGeneratedCode(fullContent)
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📦 Parsed result:', {
              hasHtml: parsed.hasHtml,
              hasCss: parsed.hasCss,
              hasJavaScript: parsed.hasJavaScript,
              isComplete: parsed.isComplete,
              htmlLength: parsed.html?.length || 0,
              cssLength: parsed.css?.length || 0,
              jsLength: parsed.javascript?.length || 0,
              jsValid: parsed.jsValid,
              jsError: parsed.jsError
            })
          }

          const generationTime = Date.now() - startTime

          // Check if JavaScript is valid
          if (parsed.hasJavaScript && !parsed.jsValid) {
            console.error('❌ JavaScript validation failed:', parsed.jsError)
            
            // If this is not already a retry, attempt retry
            if (retryAttempt < 2) {
              const retryEvent: StreamEvent = {
                type: 'retry',
                message: 'JavaScript validation failed, retrying...',
                attempt: retryAttempt + 1,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(retryEvent)}\n\n`))
            }
          }

          // Analyze code quality
          const quality = parsed.html && parsed.javascript 
            ? analyzeCodeQuality(parsed)
            : { score: 0, issues: [], warnings: [] }

          if (process.env.NODE_ENV === 'development') {
            console.log('📊 Code quality analysis:', {
              score: quality.score,
              issuesCount: quality.issues.length,
              warningsCount: quality.warnings.length
            })
          }

          // Auto-enhance code with quality improvements
          const enhanced = enhanceGeneratedCode(
            parsed.html || '',
            parsed.css || '',
            parsed.javascript || '',
            {
              addMediaQueries: true,
              addFocusStyles: true,
              addCSSVariables: false, // Keep disabled for now
              addFormLabels: true,
              addARIA: true,
              addReducedMotion: true,
            }
          )

          if (enhanced.enhancements.length > 0 && process.env.NODE_ENV === 'development') {
            console.log('✨ Code enhancements applied:', enhanced.enhancements)
          }

          // Update parsed with enhanced code
          parsed.html = enhanced.html
          parsed.css = enhanced.css
          parsed.javascript = enhanced.js

          // Combine HTML, CSS, and JavaScript into a single complete HTML file
          let completeHtml = ''
          
          if (parsed.html) {
            // Already complete HTML (from the AI generation)
            // Auto-complete any missing closing tags if truncated
            completeHtml = completeIncompleteHTML(parsed.html)
          } else if (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript) {
            // Need to combine separate parts into complete HTML
            const cssBlock = parsed.css ? `<style>\n${parsed.css}\n</style>` : ''
            const jsBlock = parsed.javascript ? `<script>\n${parsed.javascript}\n</script>` : ''
            
            completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Project</title>
    ${cssBlock}
</head>
<body>
    <!-- Generated Content -->
    ${jsBlock}
</body>
</html>`
          }

          // Send the parsed HTML to the client IMMEDIATELY
          if (completeHtml) {
            const htmlEvent: StreamEvent = {
              type: 'html',
              content: completeHtml,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(htmlEvent)}\n\n`))
            console.log('📤 Sent HTML event to client:', completeHtml.length, 'chars')
          }

          // Save to database if projectId provided
          if (projectId && (parsed.hasHtml || parsed.hasCss || parsed.hasJavaScript)) {
            try {
              if (process.env.NODE_ENV === 'development') {
                console.log('💾 Auto-saving project:', projectId)
                console.log('📦 Complete HTML length:', completeHtml.length)
              }

              // Save to ALL THREE fields
              await prisma.project.update({
                where: { id: projectId },
                data: {
                  // CRITICAL: Save complete HTML to all three fields
                  code: completeHtml,              // Preview pages use this
                  html: completeHtml,               // Complete HTML
                  htmlCode: completeHtml,           // Edit functionality uses this

                  // Keep the separate parts for reference
                  css: parsed.css || '',
                  javascript: parsed.javascript || '',

                  // Code structure flags
                  hasHtml: parsed.hasHtml || !!completeHtml,
                  hasCss: parsed.hasCss,
                  hasJavaScript: parsed.hasJavaScript,
                  isComplete: parsed.isComplete,
                  jsValid: parsed.jsValid,
                  jsError: parsed.jsError,

                  // Validation results
                  validationScore: quality.score,
                  validationPassed: quality.score >= 70,
                  validationErrors: quality.issues,
                  validationWarnings: quality.warnings,
                  cspViolations: parsed.html && parsed.javascript 
                    ? checkCSPViolations(parsed.html, parsed.javascript)
                    : [],

                  // Metadata
                  status: parsed.isComplete ? ProjectStatus.COMPLETED : ProjectStatus.GENERATING,
                  tokensUsed: inputTokens,
                  generationTime,
                  retryCount: retryAttempt,
                  updatedAt: new Date(),
                },
              })

              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Project auto-saved successfully')
                console.log('📝 Code field length:', completeHtml.length)
              }
            } catch (dbError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('❌ Database save error:', dbError)
              }
              // Don't fail the request if save fails
            }
          }

          // Send completion event
          const completeEvent: StreamEvent = {
            type: 'complete',
            parsed: {
              hasHtml: parsed.hasHtml,
              hasCss: parsed.hasCss,
              hasJavaScript: parsed.hasJavaScript,
              isComplete: parsed.isComplete,
            },
            metadata: {
              tokensUsed: inputTokens,
              generationTime,
              wasTruncated: !parsed.isComplete,
              stopReason: parsed.isComplete ? 'complete' : 'incomplete',
            },
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))

          console.log('⏱️ Generation completed in ' + generationTime + 'ms')
          controller.close()

        } catch (error) {
          console.error('Stream error:', error)

          // Check if it's an overload error
          let errorMessage = 'An error occurred during generation'
          
          if (error instanceof Error) {
            if (error.message.includes('overloaded') || error.message.includes('Overloaded')) {
              errorMessage = 'Anthropic API is currently experiencing high load. Please try again in a moment.'
            } else {
              errorMessage = error.message
            }
          }

          const errorEvent: StreamEvent = {
            type: 'error',
            error: errorMessage,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
      },
    })

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: zodError.issues.map(e => `${e.path.join('.')}: ${e.message}`) 
        },
        { status: 400 }
      );
    }
    
    console.error('Generation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate code',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}