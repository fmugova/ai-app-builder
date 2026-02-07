// app/api/chatbot/stream/route.ts
// ENHANCED - Support multi-file Next.js generation

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import CodeValidator from '@/lib/validators/code-validator'
import { processGeneratedCode } from '@/utils/extractInlineStyles.server'
import { BUILDFLOW_SYSTEM_PROMPT } from '@/lib/system-prompt'
import { ENHANCED_GENERATION_SYSTEM_PROMPT } from '@/lib/enhanced-system-prompt'
import { completeIncompleteHTML } from '@/lib/code-parser'
import { enhanceGeneratedCode } from '@/lib/code-enhancer'
import { parseMultiFileProject, convertToSingleHTML } from '@/lib/multi-file-parser'
import { z } from 'zod'
import type { ZodError } from 'zod'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const runtime = 'nodejs'
export const maxDuration = 300

// Validation schema
const chatbotRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  projectId: z.string().uuid().optional(),
  generationType: z.enum(['single-html', 'multi-file']).optional().default('single-html'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

function getOptimalTokenLimit(prompt: string): number {
  const isComplexPrompt = prompt.length > 500 || 
                          prompt.includes('dashboard') || 
                          prompt.includes('multiple') ||
                          prompt.includes('pages') ||
                          prompt.includes('CRM') ||
                          prompt.includes('admin')
  
  return isComplexPrompt ? 40000 : 30000
}

interface ValidationError {
  severity: string
  message: string
  line?: number
  column?: number
}

interface ValidationWarning {
  severity: string
  message: string
  line?: number
  column?: number
}

interface ValidationResult {
  score: number
  passed: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, data: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    
    // Validate input
    const validatedData = chatbotRequestSchema.parse(body);
    const { prompt, projectId, generationType } = validatedData;

    // Auto-detect generation type based on prompt keywords
    const isMultiFileRequest = generationType === 'multi-file' || 
      prompt.toLowerCase().includes('next.js') ||
      prompt.toLowerCase().includes('nextjs') ||
      prompt.toLowerCase().includes('full stack') ||
      prompt.toLowerCase().includes('fullstack') ||
      prompt.toLowerCase().includes('database') ||
      prompt.toLowerCase().includes('supabase') ||
      prompt.toLowerCase().includes('auth') ||
      prompt.toLowerCase().includes('api route');

    const systemPrompt = isMultiFileRequest ? ENHANCED_GENERATION_SYSTEM_PROMPT : BUILDFLOW_SYSTEM_PROMPT;

    const maxTokens = getOptimalTokenLimit(prompt)
    
    console.log('🚀 Starting generation:', {
      projectId: projectId || 'new',
      promptLength: prompt.length,
      isMultiFile: isMultiFileRequest
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let generatedHtml = ''
          let tokenCount = 0
          let savedProjectId: string | null = projectId || null;

          const enhancedPrompt = isMultiFileRequest 
            ? prompt 
            : `⚠️ CRITICAL: Every page in your app MUST have exactly ONE <h1> tag for the main page title. This is mandatory for validation.\n\n${prompt}`;

          console.log('📝 Streaming from Claude...');

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            temperature: 1,
            messages: [
              {
                role: 'user',
                content: systemPrompt + '\n\n' + enhancedPrompt
              }
            ],
            stream: true,
          })

          for await (const event of response) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text
        generatedHtml += text
        tokenCount++
        
        // Send code chunks as they arrive
        send(controller, { code: text })
      }
    }

    console.log('✅ Stream complete:', generatedHtml.length, 'chars')

    // Check if this is a multi-file project response
    if (isMultiFileRequest) {
      console.log('🔍 Parsing multi-file project...');
      const parseResult = parseMultiFileProject(generatedHtml);

      if (parseResult.success && parseResult.project) {
        console.log('✅ Multi-file project parsed:', {
          name: parseResult.project.projectName,
          filesCount: parseResult.project.files.length,
          type: parseResult.project.projectType,
        });

        // Get user
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Create or update project
        if (!savedProjectId) {
          console.log('💾 Creating multi-file project...');
          
          // Quick validation check for initial score
          const mainFile = parseResult.project.files.find(f => 
            f.path === 'index.html' || f.path === 'app/page.tsx'
          );
          let initialScore = 100;
          let initialPassed = true;

          if (mainFile) {
            const validator = new CodeValidator();
            let content = mainFile.content;
            if (mainFile.path.endsWith('.tsx')) {
              const jsxMatch = content.match(/return\s*\(([\s\S]*?)\);?\s*}/);
              if (jsxMatch) {
                content = `<!DOCTYPE html><html><body>${jsxMatch[1]}</body></html>`;
              }
            }
            const quickValidation = validator.validateAll(content, '', '');
            initialScore = quickValidation.summary.score;
            initialPassed = quickValidation.passed;
          }

          const project = await prisma.project.create({
            data: {
              userId: user.id,
              name: parseResult.project.projectName,
              description: parseResult.project.description,
              code: convertToSingleHTML(parseResult.project), // Preview HTML
              html: convertToSingleHTML(parseResult.project),
              type: parseResult.project.projectType,
              projectType: parseResult.project.projectType,
            isMultiFile: true,
            dependencies: JSON.stringify(parseResult.project.dependencies),
            devDependencies: JSON.stringify(parseResult.project.devDependencies),
            envVars: JSON.stringify(parseResult.project.envVars),
            setupInstructions: JSON.stringify(parseResult.project.setupInstructions),
            isComplete: true,
            status: 'COMPLETED',
            tokensUsed: BigInt(tokenCount),
            validationScore: BigInt(initialScore),
            validationPassed: initialPassed,
          },
          });

          savedProjectId = project.id;

          // Save all files
          await prisma.projectFile.createMany({
            data: parseResult.project.files.map((file, index) => ({
              projectId: project.id,
              path: file.path,
              content: file.content,
              language: file.language || 'text',
              order: index,
            })),
          });

          console.log('✅ Multi-file project created:', savedProjectId);
        } else {
          console.log('🔄 Updating multi-file project:', savedProjectId);
          
          // Delete old files
          await prisma.projectFile.deleteMany({
            where: { projectId: savedProjectId },
          });

          // Update project
          await prisma.project.update({
            where: { id: savedProjectId, userId: user.id },
            data: {
              name: parseResult.project.projectName,
              description: parseResult.project.description,
              code: convertToSingleHTML(parseResult.project),
              html: convertToSingleHTML(parseResult.project),
              projectType: parseResult.project.projectType,
              isMultiFile: true,
              dependencies: JSON.stringify(parseResult.project.dependencies),
              devDependencies: JSON.stringify(parseResult.project.devDependencies),
              envVars: JSON.stringify(parseResult.project.envVars),
              setupInstructions: JSON.stringify(parseResult.project.setupInstructions),
              updatedAt: new Date(),
            },
          });

          // Save new files
          await prisma.projectFile.createMany({
            data: parseResult.project.files.map((file, index) => ({
              projectId: savedProjectId!,
              path: file.path,
              content: file.content,
              language: file.language || 'text',
              order: index,
            })),
          });

          console.log('✅ Multi-file project updated');
        }

        // Run validation on the main HTML file or index.html
        const mainHtmlFile = parseResult.project.files.find(f => 
          f.path === 'index.html' || 
          f.path === 'app/page.tsx' ||
          f.path.includes('index.html')
        );

        let validationData: any = {
          hasHtml: true,
          hasCss: true,
          hasJs: true,
          validationScore: 100,
          validationPassed: true,
          errors: [],
          warnings: [],
          cspViolations: [],
          passed: true,
          autoFix: null,
        };

        if (mainHtmlFile && (mainHtmlFile.path.endsWith('.html') || mainHtmlFile.path === 'app/page.tsx')) {
          console.log('📊 Running validation on:', mainHtmlFile.path);
          
          // For React/Next.js files, extract JSX to validate
          let htmlContent = mainHtmlFile.content;
          if (mainHtmlFile.path.endsWith('.tsx') || mainHtmlFile.path.endsWith('.jsx')) {
            // Simple extraction of JSX return statement for validation
            const jsxMatch = htmlContent.match(/return\s*\(([\s\S]*?)\);?\s*}/);
            if (jsxMatch) {
              htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>App</title></head><body>${jsxMatch[1]}</body></html>`;
            }
          }

          const validator = new CodeValidator();
          const result = validator.validateAll(htmlContent, '', '');
          
          validationData = {
            hasHtml: true,
            hasCss: true,
            hasJs: true,
            validationScore: result.summary.score,
            validationPassed: result.passed,
            errors: result.errors,
            warnings: result.warnings,
            cspViolations: [],
            passed: result.passed,
            autoFix: null,
          };

          console.log('📊 Multi-file validation:', {
            score: result.summary.score,
            passed: result.passed,
            errors: result.errors.length,
            warnings: result.warnings.length,
          });
        }

        // Send success to client with validation
        send(controller, { 
          projectId: savedProjectId,
          isMultiFile: true,
          filesCount: parseResult.project.files.length,
          validation: validationData,
        });
        send(controller, { done: true });
        controller.close();
        return;
      } else {
        console.error('❌ Multi-file parsing failed:', parseResult.error);
        
        // Return error to client instead of generating invalid fallback
        send(controller, { 
          error: 'Failed to generate valid project structure. The AI response had formatting errors. Please try regenerating.',
          canRetry: true,
          parseError: parseResult.error
        });
        send(controller, { done: true });
        controller.close();
        return;
      }
    }

    // SINGLE HTML PROCESSING (existing code)
    // Clean and process code
    let html = generatedHtml.trim()
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    // Ensure DOCTYPE
    if (!html.toLowerCase().includes('<!doctype html>')) {
            html = '<!DOCTYPE html>\n' + html
          }
          
          // Auto-complete any missing closing tags
          html = completeIncompleteHTML(html)
          
          // Ensure lang attribute on html tag
          if (!html.includes('<html lang=')) {
            html = html.replace(/<html([^>]*)>/i, '<html lang="en"$1>')
          }

          // Extract inline styles AND inline handlers
          const { 
            html: cleanHtml, 
            css: combinedCss, 
            hasInlineStyles, 
            hasInlineHandlers 
          } = processGeneratedCode(html, '')

          if (hasInlineStyles) {
            console.log('✅ Extracted inline styles to CSS')
          }
          
          if (hasInlineHandlers) {
            console.log('✅ Converted inline handlers to addEventListener')
          }

          // Auto-enhance code with quality improvements
          const enhanced = enhanceGeneratedCode(
            cleanHtml,
            combinedCss,
            '',
            {
              addMediaQueries: true,
              addFocusStyles: true,
              addCSSVariables: false,
              addFormLabels: true,
              addARIA: true,
              addReducedMotion: true,
            }
          )

          if (enhanced.enhancements.length > 0) {
            console.log('✨ Code enhancements applied:', enhanced.enhancements)
          }

          // Use enhanced code for validation
          let finalHtml = enhanced.html
          const finalCss = enhanced.css

          const hasHtml = html.length > 0
          const hasCss = html.includes('<style') || finalCss.length > 0
          const hasJavaScript = html.includes('<script')

          console.log('📊 Running validation...')

          const validator = new CodeValidator()
          const validationResult = validator.validateAll(finalHtml, finalCss, '') as ValidationResult

          // Ensure validation result has proper structure
          let safeValidation: ValidationResult = {
            score: validationResult?.score ?? 0,
            passed: validationResult?.passed ?? false,
            errors: Array.isArray(validationResult?.errors) ? validationResult.errors : [],
            warnings: Array.isArray(validationResult?.warnings) ? validationResult.warnings : [],
          }

          console.log('📊 Quality:', {
            score: safeValidation.score,
            passed: safeValidation.passed,
            errors: safeValidation.errors.length,
            warnings: safeValidation.warnings.length,
          })

          // Auto-fix common issues if validation failed
          let autoFixResult: { fixed: string; appliedFixes: string[]; remainingIssues: number } | null = null
          if (!safeValidation.passed && safeValidation.errors.length > 0) {
            try {
              const { autoFixCode } = await import('@/lib/validators/auto-fixer')
              
              console.log('🔧 Attempting auto-fix...')
              autoFixResult = autoFixCode(finalHtml, {
                summary: {
                  total: safeValidation.errors.length + safeValidation.warnings.length,
                  errors: safeValidation.errors.length,
                  warnings: safeValidation.warnings.length,
                  info: 0,
                  score: safeValidation.score,
                  grade: 'F',
                  status: 'failed'
                },
                passed: false,
                score: safeValidation.score,
                errors: safeValidation.errors.map(e => ({
                  type: 'error' as const,
                  category: 'syntax' as const,
                  message: e.message,
                  severity: (e.severity || 'high') as any,
                  fix: undefined
                })),
                warnings: safeValidation.warnings.map(w => ({
                  type: 'warning' as const,
                  category: 'best-practices' as const,
                  message: w.message,
                  severity: (w.severity || 'medium') as any,
                  fix: undefined
                })),
                info: []
              })

              if (autoFixResult.appliedFixes.length > 0) {
                console.log('✅ Auto-fixes applied:', autoFixResult.appliedFixes)
                
                // Update the HTML with auto-fixed version
                finalHtml = autoFixResult.fixed

                // Re-validate after auto-fix
                const revalidationResult = validator.validateAll(finalHtml, finalCss, '') as ValidationResult
                safeValidation = {
                  score: revalidationResult?.score ?? 0,
                  passed: revalidationResult?.passed ?? false,
                  errors: Array.isArray(revalidationResult?.errors) ? revalidationResult.errors : [],
                  warnings: Array.isArray(revalidationResult?.warnings) ? revalidationResult.warnings : [],
                }

                console.log('📊 Quality after auto-fix:', {
                  score: safeValidation.score,
                  passed: safeValidation.passed,
                  errors: safeValidation.errors.length,
                  warnings: safeValidation.warnings.length,
                })
              }
            } catch (autoFixError) {
              console.error('❌ Auto-fix failed:', autoFixError)
              // Continue without auto-fix
            }
          }

          // Log validation errors if any
          if (safeValidation.errors.length > 0) {
            console.log('⚠️  Validation errors:')
            safeValidation.errors.forEach((err, i) => {
              console.log(`  ${i + 1}. [${err.severity || 'error'}] ${err.message}`)
            })
          }

          // Get user
          const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
          })

          if (!user) {
            throw new Error('User not found')
          }

          // Prepare validation data for database
          const validationErrors = safeValidation.errors.map(e => ({
            severity: e.severity || 'error',
            message: e.message,
            line: e.line,
            column: e.column,
          }))

          const validationWarnings = safeValidation.warnings.map(w => ({
            severity: w.severity || 'warning',
            message: w.message,
            line: w.line,
            column: w.column,
          }))

          if (!savedProjectId) {
            console.log('💾 Auto-saving project...')
            
            const project = await prisma.project.create({
              data: {
                userId: user.id,
                name: prompt.slice(0, 50) || 'New Project',
                description: prompt.slice(0, 200) || '',
                code: finalHtml,
                html: finalHtml,
                htmlCode: finalHtml,
                css: finalCss,
                cssCode: finalCss,
                type: 'landing-page',
                hasHtml,
                hasCss,
                hasJavaScript,
                isComplete: true,
                jsValid: true,
                jsError: null,
                validationScore: BigInt(Math.round(safeValidation.score)),
                validationPassed: safeValidation.passed,
                validationErrors: JSON.stringify(validationErrors),
                validationWarnings: JSON.stringify(validationWarnings),
                cspViolations: JSON.stringify([]),
                status: 'COMPLETED',
                tokensUsed: BigInt(tokenCount),
                generationTime: BigInt(Date.now()),
                retryCount: BigInt(0),
              },
            })

            savedProjectId = project.id
            console.log('✅ Project auto-saved:', savedProjectId)
          } else {
            console.log('🔄 Updating project:', savedProjectId)
            
            await prisma.project.update({
              where: { id: savedProjectId, userId: user.id },
              data: {
                code: finalHtml,
                html: finalHtml,
                htmlCode: finalHtml,
                css: finalCss,
                cssCode: finalCss,
                hasHtml,
                hasCss,
                hasJavaScript,
                isComplete: true,
                jsValid: true,
                validationScore: BigInt(Math.round(safeValidation.score)),
                validationPassed: safeValidation.passed,
                validationErrors: JSON.stringify(validationErrors),
                validationWarnings: JSON.stringify(validationWarnings),
                status: 'COMPLETED',
                tokensUsed: BigInt(tokenCount),
                updatedAt: new Date(),
              },
            })
            
            console.log('✅ Project updated successfully')
          }

          // Send validation result to client
          const validationData = {
            isComplete: true,
            hasHtml,
            hasCss,
            hasJs: hasJavaScript,
            validationScore: safeValidation.score,
            validationPassed: safeValidation.passed,
            errors: safeValidation.errors,
            warnings: safeValidation.warnings,
            cspViolations: [],
            passed: safeValidation.passed,
            autoFix: autoFixResult ? {
              appliedFixes: autoFixResult.appliedFixes,
              remainingIssues: autoFixResult.remainingIssues
            } : null,
          };
          
          console.log('📤 Sending validation to client:', {
            score: validationData.validationScore,
            passed: validationData.validationPassed,
            errorsCount: validationData.errors.length,
            warningsCount: validationData.warnings.length,
            autoFixApplied: autoFixResult?.appliedFixes.length ?? 0,
          });
          
          send(controller, { validation: validationData })

          // Send project ID
          send(controller, { projectId: savedProjectId })

          // Send completion
          send(controller, { done: true })

          console.log('⏱️  Generation completed successfully')
          controller.close()
          
        } catch (error) {
          console.error('❌ Generation error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Generation failed'
          send(controller, { error: errorMessage })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: zodError.issues.map(e => e.message) 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.error('❌ Route error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}