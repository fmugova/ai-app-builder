import { NextRequest, NextResponse } from 'next/server'
import { checkUserRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages'
import prisma from '@/lib/prisma'
import { parseGeneratedCode, analyzeCodeQuality, completeIncompleteHTML } from '@/lib/code-parser'
import { enhanceGeneratedCode } from '@/lib/code-enhancer'
import { validateCode } from '@/lib/validators/code-validator'
import { autoFixCode } from '@/lib/validators/auto-fixer'
import { ensureValidHTML } from '@/lib/templates/htmlTemplate'
import { ProjectStatus } from '@prisma/client'
import { apiQueue } from '@/lib/api-queue'
import { analyzePrompt } from '@/lib/utils/complexity-detection'
import { IterationDetector } from '@/lib/services/iterationDetector'
import { PromptBuilder, buildUserMessageWithContext } from '@/lib/services/promptBuilder'
import { saveProjectFiles, updateProjectMetadata } from '@/lib/services/projectService'
import { BUILDFLOW_ENHANCED_SYSTEM_PROMPT } from '@/lib/prompts/buildflow-enhanced-prompt'
import {
  ENHANCED_GENERATION_SYSTEM_PROMPT,
  STAGE1_CORE_SYSTEM_PROMPT,
  STAGE2_REMAINING_SYSTEM_PROMPT,
} from '@/lib/enhanced-system-prompt'
import { parseMultiFileProject } from '@/lib/multi-file-parser'
import { 
  GENERATED_APP_ITERATION_DETECTOR, 
  GENERATED_APP_SUPABASE_CONFIG,
  GENERATED_APP_DATABASE_SCHEMA 
} from '@/lib/templates/iteration-templates'

// ============================================================================
// VALIDATION
// ============================================================================

const generateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  projectId: z.string().optional(),
  generationType: z.string().max(50).optional(),
  retryAttempt: z.number().int().min(0).max(5).optional(),
  continuationContext: z.string().max(50000).optional(),
  previousPrompts: z.array(z.string()).optional(),
  /** When true (user selected "Add to Existing" mode), skip keyword heuristics
   *  and always treat the request as an iteration over the existing project. */
  forceIteration: z.boolean().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

interface StreamEvent {
  type: 'content' | 'html' | 'multifile' | 'complete' | 'error' | 'retry' | 'status'
  text?: string
  content?: string
  totalLength?: number
  message?: string
  statusMessage?: string
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
- Complete and valid HTML/CSS/JS

OUTPUT RULES:
- Return ONLY the HTML code
- DO NOT include explanatory text like "I'll create..." or "Here's the implementation"
- DO NOT include validation checklists or confirmation messages
- DO NOT add summary sections, feature lists, or descriptions after the code
- Start immediately with <!DOCTYPE html>
- End with </html> and nothing after`

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getOptimalTokenLimit(prompt: string, generationType: string): number {
  // Claude Sonnet 4 supports up to 64 K output tokens.
  // Use generous limits so complex apps are never cut off mid-generation.
  const MAX_TOKENS = 64000

  // Detect complex prompts (longer descriptions, multiple features)
  const isComplexPrompt = prompt.length > 500 ||
                          prompt.includes('dashboard') ||
                          prompt.includes('multiple') ||
                          prompt.includes('pages') ||
                          prompt.includes('CRM') ||
                          prompt.includes('admin') ||
                          prompt.includes('fullstack') ||
                          prompt.includes('full-stack') ||
                          prompt.includes('next.js') ||
                          prompt.includes('database') ||
                          prompt.includes('authentication') ||
                          prompt.includes('auth')

  if (generationType === 'landing-page') {
    return isComplexPrompt ? 32000 : 24000
  } else if (generationType === 'webapp') {
    return isComplexPrompt ? MAX_TOKENS : 48000
  }

  // Default: fullstack / unknown type — use max
  return MAX_TOKENS
}

/**
 * Detects if the prompt requests a new multi-page HTML site (not fullstack).
 * These requests need BUILDFLOW_ENHANCED_SYSTEM_PROMPT for separate .html files.
 */
function isNewMultiPageHTMLRequest(
  prompt: string,
  complexityAnalysis: { shouldUseFullstack: boolean }
): boolean {
  if (complexityAnalysis.shouldUseFullstack) return false;
  const lower = prompt.toLowerCase();
  const multiPageTriggers = [
    'home, about', 'home, services', 'home, contact',
    'about, contact', 'about, services',
    'multi-page', 'multiple pages', 'multiple html',
    'portfolio with', 'website with pages',
    'navigation to', 'nav to',
  ];
  const hasNamedPages = /\b(home|landing)\b.{0,60}\b(about|services|contact|projects|portfolio|blog)\b/i.test(prompt);
  return hasNamedPages || multiPageTriggers.some(t => lower.includes(t));
}

/**
 * Determines if the generated app should include iteration detection capabilities
 */
function shouldIncludeIterationSupport(
  prompt: string, 
  complexityAnalysis: { analysis: { mode: string; confidence: number }; systemPromptSuffix: string; shouldUseFullstack: boolean }
): boolean {
  const lowerPrompt = prompt.toLowerCase();
  
  // Include iteration support for complex full-stack applications
  const iterationKeywords = [
    'full-stack', 'fullstack', 'full stack',
    'dashboard', 'crm', 'admin panel',
    'multi-page', 'multiple pages',
    'database', 'backend', 'api',
    'supabase', 'authentication', 'auth',
    'iteration', 'improve', 'update'
  ];
  
  const hasIterationKeyword = iterationKeywords.some(kw => lowerPrompt.includes(kw));
  const isComplexApp = complexityAnalysis.analysis?.mode === 'multi-page' || 
                       complexityAnalysis.analysis?.mode === 'dashboard';
  
  return hasIterationKeyword || isComplexApp;
}

async function createMessageWithRetry(
  anthropic: Anthropic,
  params: MessageCreateParams & { stream: true }
): Promise<ReturnType<Anthropic['messages']['stream']>> {
  const maxRetries = 3
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return anthropic.messages.stream(params)
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
    const { prompt, projectId, generationType = 'webapp', retryAttempt = 0, continuationContext, forceIteration = false } = validatedData;

    // =========================================================================
    // PROMPT INJECTION DETECTION
    // =========================================================================
    const injectionPatterns = [
      /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?|constraints?)/i,
      /forget\s+(everything|all|your\s+instructions?|previous)/i,
      /you\s+are\s+now\s+(a|an)\s+/i,
      /new\s+(persona|identity|role|instructions?):/i,
      /\[system\]/i,
      /\]\s*system\s*\[/i,
      /override\s+(system|safety|rules?|constraints?)/i,
      /act\s+as\s+(if\s+you\s+(are|were)|a\s+)/i,
      /do\s+not\s+(follow|apply|use)\s+(your\s+)?(guidelines|rules|instructions|safety)/i,
      /reveal\s+(your\s+)?(system\s+prompt|instructions?|prompt)/i,
      /print\s+(your\s+)?(system\s+prompt|instructions?)/i,
    ]
    const injectionMatch = injectionPatterns.find(p => p.test(prompt))
    if (injectionMatch) {
      return NextResponse.json(
        { error: 'Prompt contains disallowed content. Please describe what you want to build.' },
        { status: 400 }
      )
    }

    console.log('🚀 Starting generation:', {
      projectId,
      promptLength: prompt.length,
      generationType,
      maxTokens: getOptimalTokenLimit(prompt, generationType),
      retryAttempt
    })

    // =========================================================================
    // ITERATION DETECTION
    // =========================================================================
    console.log('🔍 Detecting iteration context...');

    let iterationContext = await IterationDetector.detectIteration(
      prompt,
      projectId || undefined
    );

    // When the user explicitly chose "Add to Existing" mode, override the
    // keyword heuristics: if the project has files, force iteration so the
    // existing code is always included in context regardless of prompt wording.
    if (forceIteration && projectId && !iterationContext.isIteration && iterationContext.existingFiles.length === 0) {
      // Re-detect with a guaranteed iteration signal
      iterationContext = await IterationDetector.detectIteration(
        `update and extend the existing project: ${prompt}`,
        projectId
      );
    }

    console.log('📊 Iteration Context:', {
      isIteration: iterationContext.isIteration,
      changeScope: iterationContext.changeScope,
      existingFiles: iterationContext.existingFiles.length,
      filesCount: iterationContext.existingFiles.length
    });

    // Build appropriate system prompt based on context
    const promptBuilder = new PromptBuilder();
    const iterationSystemPrompt = promptBuilder.buildSystemPrompt(iterationContext);

    // Enhance user message with context if iterating
    const enhancedPromptFromIterator = buildUserMessageWithContext(prompt, iterationContext);

    console.log('💬 Using enhanced prompt strategy:', iterationContext.changeScope);

    // ============================================================================
    // 4. ANALYZE COMPLEXITY & ITERATION CAPABILITY
    // ============================================================================
    const complexityAnalysis = analyzePrompt(prompt);
    const wantsIterationCapability = shouldIncludeIterationSupport(prompt, complexityAnalysis);
    
    if (wantsIterationCapability) {
      console.log('🔄 Generated app will include iteration detection capabilities');
    }

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
          
          // Use iteration-aware system prompt if available, otherwise fall back to complexity-based
          const isMultiPageHTML = isNewMultiPageHTMLRequest(prompt, complexityAnalysis);
          const isFullstackGeneration = !iterationContext.isIteration && complexityAnalysis.shouldUseFullstack;
          const systemPrompt = iterationContext.isIteration
            ? iterationSystemPrompt
            : isFullstackGeneration
            ? ENHANCED_GENERATION_SYSTEM_PROMPT
            : isMultiPageHTML
            ? BUILDFLOW_ENHANCED_SYSTEM_PROMPT
            : ENTERPRISE_SYSTEM_PROMPT + complexityAnalysis.systemPromptSuffix;

          if (process.env.NODE_ENV === 'development') {
            console.log('🎯 Complexity Analysis:', {
              mode: complexityAnalysis.analysis.mode,
              confidence: complexityAnalysis.analysis.confidence,
              features: complexityAnalysis.analysis.detectedFeatures.slice(0, 5),
              usingIterationPrompt: iterationContext.isIteration
            });
          }

          // Build enhanced prompt with iteration context or continuation context
          const enhancedPrompt = iterationContext.isIteration
            ? enhancedPromptFromIterator
            : continuationContext
            ? `${prompt}\n\nCONTINUATION CONTEXT: You previously generated:\n${continuationContext}\n\nPlease complete the generation, focusing on what's missing.`
            : prompt

          // ============================================================================
          // GENERATION — staged (fullstack) or single-pass (HTML / multi-page)
          // ============================================================================
          if (isFullstackGeneration) {
            // ── STAGE 1: Core architecture ──────────────────────────────────────────
            const s1Status: StreamEvent = { type: 'status', statusMessage: 'Stage 1/2: Generating core architecture...' }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(s1Status)}\n\n`))

            const stage1Stream = await apiQueue.add(() =>
              createMessageWithRetry(anthropic, {
                model: 'claude-sonnet-4-20250514',
                max_tokens: 32000,
                temperature: 0.3,
                messages: [{ role: 'user', content: enhancedPrompt }],
                system: STAGE1_CORE_SYSTEM_PROMPT,
                stream: true,
              })
            )

            let stage1Content = ''
            for await (const event of stage1Stream) {
              if (event.type === 'message_start') inputTokens += event.message.usage.input_tokens
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                stage1Content += event.delta.text
                const se: StreamEvent = { type: 'content', text: event.delta.text, totalLength: stage1Content.length }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(se)}\n\n`))
              }
            }
            console.log('✅ Stage 1 complete:', stage1Content.length, 'chars')

            // Parse Stage 1 to extract core file list for Stage 2 context
            const stage1Result = parseMultiFileProject(stage1Content)
            const stage1Files = stage1Result.success && stage1Result.project ? stage1Result.project.files : []
            const stage1FileList = stage1Files.map(f => `  - ${f.path}`).join('\n')

            // ── STAGE 2: Remaining pages, API routes, components ─────────────────────
            const s2Status: StreamEvent = {
              type: 'status',
              statusMessage: `Stage 2/2: Generating remaining pages & features (${stage1Files.length} core files done)...`,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(s2Status)}\n\n`))

            const stage2UserPrompt = stage1Files.length > 0
              ? `${enhancedPrompt}\n\n---\nSTAGE 2 CONTEXT — Core files already generated in Stage 1:\n${stage1FileList}\n\nNow generate ALL remaining pages, API routes, feature components, hooks, and stores. DO NOT regenerate any file listed above.`
              : enhancedPrompt

            const stage2Stream = await apiQueue.add(() =>
              createMessageWithRetry(anthropic, {
                model: 'claude-sonnet-4-20250514',
                max_tokens: 32000,
                temperature: 0.3,
                messages: [{ role: 'user', content: stage2UserPrompt }],
                system: STAGE2_REMAINING_SYSTEM_PROMPT,
                stream: true,
              })
            )

            let stage2Content = ''
            for await (const event of stage2Stream) {
              if (event.type === 'message_start') inputTokens += event.message.usage.input_tokens
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                stage2Content += event.delta.text
                const se: StreamEvent = {
                  type: 'content',
                  text: event.delta.text,
                  totalLength: stage1Content.length + stage2Content.length,
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(se)}\n\n`))
              }
            }
            console.log('✅ Stage 2 complete:', stage2Content.length, 'chars')

            // ── Merge Stage 1 + Stage 2 results ─────────────────────────────────────
            const stage2Result = parseMultiFileProject(stage2Content)
            const stage2Files = stage2Result.success && stage2Result.project ? stage2Result.project.files : []

            // Base project metadata from Stage 1 (has full dep list)
            const baseProject = (stage1Result.success && stage1Result.project)
              ? stage1Result.project
              : (stage2Result.success && stage2Result.project ? stage2Result.project : null)

            if (baseProject && (stage1Files.length > 0 || stage2Files.length > 0)) {
              const stage1Paths = new Set(stage1Files.map(f => f.path))
              const mergedFiles = [
                ...stage1Files,
                ...stage2Files.filter(f => !stage1Paths.has(f.path)),
              ]
              // Merge any additional deps declared in Stage 2
              const stage2Deps = (stage2Result.success && stage2Result.project)
                ? (stage2Result.project.dependencies ?? {})
                : {}
              const mergedProject = {
                ...baseProject,
                dependencies: { ...baseProject.dependencies, ...stage2Deps },
                files: mergedFiles,
              }

              console.log(`✅ Staged fullstack merged: ${mergedFiles.length} files (S1: ${stage1Files.length}, S2: ${stage2Files.length})`)

              const multifileEvent: StreamEvent = { type: 'multifile', content: JSON.stringify(mergedProject) }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(multifileEvent)}\n\n`))

              if (projectId) {
                try {
                  await saveProjectFiles(projectId, mergedProject.files)
                  await updateProjectMetadata(projectId, { multiPage: true, isMultiFile: true })
                  await prisma.project.update({
                    where: { id: projectId },
                    data: {
                      status: ProjectStatus.COMPLETED,
                      tokensUsed: inputTokens,
                      generationTime: Date.now() - startTime,
                      updatedAt: new Date(),
                    },
                  })
                  console.log('✅ Staged fullstack project saved to DB')
                } catch (dbErr) {
                  console.error('❌ Staged fullstack DB save error:', dbErr)
                }
              }

              const completeEvent: StreamEvent = {
                type: 'complete',
                parsed: { hasHtml: true, hasCss: true, hasJavaScript: true, isComplete: true },
                metadata: {
                  tokensUsed: inputTokens,
                  generationTime: Date.now() - startTime,
                  wasTruncated: false,
                  stopReason: 'complete',
                },
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))
              controller.close()
              return
            }

            // Both stages failed to produce parseable JSON → fall back to HTML pipeline
            console.warn('⚠️ Staged fullstack parse failed, falling back to HTML pipeline')
            fullContent = stage1Content + '\n' + stage2Content

          } else {
            // ── SINGLE-PASS GENERATION (HTML / multi-page HTML) ──────────────────────
            const messageStream = await apiQueue.add(() =>
              createMessageWithRetry(anthropic, {
                model: 'claude-sonnet-4-20250514',
                max_tokens: getOptimalTokenLimit(prompt, generationType),
                temperature: 0.3,
                messages: [{ role: 'user', content: enhancedPrompt }],
                system: systemPrompt,
                stream: true,
              })
            )

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
          }

          // ============================================================================
          // HTML PIPELINE — parse and validate single-file or multi-page HTML output
          // ============================================================================

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

          // ============================================================================
          // CRITICAL: VALIDATION & AUTO-FIX PIPELINE
          // ============================================================================
          
          console.log('📝 Generated code length:', completeHtml.length)
          
          // Step 1: Validate generated code
          console.log('🔍 Validating generated code...')
          let validation = validateCode(completeHtml)
          
          console.log('📊 Initial validation:', {
            score: validation.score,
            passed: validation.passed,
            errors: validation.summary.errors,
            warnings: validation.summary.warnings,
          })

          // Step 2: Apply auto-fix if there are issues
          let autoFixResult = null
          if (validation.summary.errors > 0 || validation.summary.warnings > 0) {
            console.log('🔧 Applying server-side auto-fix...')
            autoFixResult = autoFixCode(completeHtml, validation)
            
            console.log('✅ Server applied fixes:', autoFixResult.appliedFixes)
            console.log('📏 Code length change:', completeHtml.length, '→', autoFixResult.fixed.length)
            
            // Update with fixed code
            completeHtml = autoFixResult.fixed

            // Re-validate after auto-fix
            validation = validateCode(completeHtml)
            console.log('📊 After auto-fix validation:', {
              score: validation.score,
              passed: validation.passed,
              errors: validation.summary.errors,
              warnings: validation.summary.warnings,
            })
          }

          // Step 3: Apply template wrapper as final safety net (only if needed)
          const projectTitle = prompt.split('\n')[0].slice(0, 50) || 'Generated Project'
          
          // Only wrap if score is too low (< 90)
          if (validation.score < 90) {
            console.log('⚠️ Score too low (' + validation.score + '), applying template wrapper');
            completeHtml = ensureValidHTML(completeHtml, projectTitle)
            
            // Step 4: Final validation after template wrapper
            validation = validateCode(completeHtml)
            console.log('📊 Final validation after template wrapper:', {
              score: validation.score,
              passed: validation.passed,
              errors: validation.summary.errors,
              warnings: validation.summary.warnings,
            })
          } else {
            console.log('✅ Score acceptable (' + validation.score + '), skipping template wrapper');
          }

          // Send the validated & fixed HTML to the client
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

                  // Validation results (from new validation system)
                  validationScore: BigInt(Math.round(validation.score)),
                  validationPassed: validation.passed,
                  validationErrors: JSON.stringify(validation.errors.map(e => ({
                    severity: e.severity || 'error',
                    message: e.message,
                    line: e.line,
                    column: e.column,
                  }))),
                  validationWarnings: JSON.stringify(validation.warnings.map(w => ({
                    severity: w.severity || 'warning',
                    message: w.message,
                    line: w.line,
                    column: w.column,
                  }))),
                  cspViolations: JSON.stringify([]),

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

              // =========================================================================
              // MULTI-FILE PROJECT HANDLING
              // =========================================================================
              if (iterationContext.isIteration || completeHtml.includes('<!-- File:') || completeHtml.includes('// File:')) {
                try {
                  // Extract files from the generated code
                  const fileMatches = Array.from(completeHtml.matchAll(/(?:\/\/\s*(?:File|Filename):\s*(.+)|<!--\s*File:\s*(.+?)\s*-->)([\s\S]*?)(?=(?:\/\/\s*(?:File|Filename):|<!--\s*File:)|$)/gi));
                  
                  const extractedFiles = [];
                  for (const match of fileMatches) {
                    const filename = match[1] || match[2];
                    const content = match[3].trim();
                    if (filename && content) {
                      extractedFiles.push({
                        path: filename.trim(),
                        content: content
                      });
                    }
                  }

                  // Add iteration detection files for full-stack apps
                  if (wantsIterationCapability && extractedFiles.length > 0) {
                    console.log('🔄 Adding iteration detection capabilities to generated app...');
                    
                    // Add iteration detector service
                    extractedFiles.push({
                      path: 'services/iterationDetector.ts',
                      content: GENERATED_APP_ITERATION_DETECTOR
                    });
                    
                    // Add Supabase config
                    extractedFiles.push({
                      path: 'lib/supabase.ts',
                      content: GENERATED_APP_SUPABASE_CONFIG
                    });
                    
                    // Add database schema
                    extractedFiles.push({
                      path: 'schema.sql',
                      content: GENERATED_APP_DATABASE_SCHEMA
                    });
                    
                    // Add environment template
                    extractedFiles.push({
                      path: '.env.example',
                      content: `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Configuration
ANTHROPIC_API_KEY=your-anthropic-key`
                    });
                    
                    console.log('✅ Iteration detection files added');
                  }

                  // If files were extracted, save them
                  if (extractedFiles.length > 0) {
                    console.log(`📁 Saving ${extractedFiles.length} files for project ${projectId}`);
                    
                    await saveProjectFiles(projectId, extractedFiles);
                    
                    await updateProjectMetadata(projectId, {
                      multiPage: extractedFiles.length > 1,
                      isMultiFile: true
                    });

                    console.log('✅ Multi-file project saved successfully');
                  } else if (iterationContext.isIteration) {
                    // For iterations without explicit file markers, save as single file update
                    await saveProjectFiles(projectId, [{
                      path: 'index.html',
                      content: completeHtml
                    }]);
                    console.log('✅ Iteration saved to index.html');
                  }
                } catch (multiFileError) {
                  console.error('❌ Multi-file handling error:', multiFileError);
                  // Don't fail the request
                }
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