// app/api/chatbot/stream/route.ts
// ENHANCED - Support multi-file Next.js generation

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import CodeValidator from '@/lib/validators/code-validator'
import { processGeneratedCode } from '@/utils/extractInlineStyles.server'
import { ENHANCED_GENERATION_SYSTEM_PROMPT } from '@/lib/enhanced-system-prompt'
import { STRICT_HTML_GENERATION_PROMPT } from '@/lib/generation/systemPrompt'
import { BUILDFLOW_ENHANCED_SYSTEM_PROMPT } from '@/lib/prompts/buildflow-enhanced-prompt'
import { ensureValidHTML } from '@/lib/templates/htmlTemplate'
import { completeIncompleteHTML } from '@/lib/code-parser'
import { enhanceGeneratedCode } from '@/lib/code-enhancer'
import { parseMultiFileProject, convertToSingleHTML } from '@/lib/multi-file-parser'
import { extractProjectTitle } from '@/lib/utils/title-extraction'
import { analyzePrompt } from '@/lib/utils/complexity-detection'
import { z } from 'zod'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const runtime = 'nodejs'
export const maxDuration = 300

// Validation schema
const chatbotRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  projectId: z.string().optional(),
  generationType: z.enum(['single-html', 'multi-file']).optional().default('single-html'),
  previousErrors: z.array(z.string()).optional(), // For validation feedback loop
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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
    }

    // Validate input
    const parseResult = chatbotRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parseResult.error.issues }),
        { status: 422 }
      )
    }
    const { prompt, projectId, generationType, previousErrors } = parseResult.data

    // Auto-detect generation type using complexity analysis
    const complexityAnalysis = analyzePrompt(prompt);
    const isMultiFileRequest = generationType === 'multi-file' ||
      complexityAnalysis.shouldUseFullstack;

    // Detect multi-page HTML requests (portfolio/website with named pages, NOT fullstack)
    const multiPageTriggers = [
      /\b(home|landing).{0,30}(about|services|contact|portfolio|projects|blog)\b/i,
      /\b(about|services|contact|portfolio|projects|blog).{0,30}(home|landing)\b/i,
      /multi-?page\s+(website|site|html)/i,
      /website\s+with\s+(multiple\s+)?pages/i,
      /portfolio\s+with\s+(pages|sections)/i,
      /\b(home|about|services|contact|portfolio|projects|blog|faq)\s*(,\s*(home|about|services|contact|portfolio|projects|blog|faq)){2,}/i,
    ];
    const isMultiPageHTMLRequest = !isMultiFileRequest &&
      multiPageTriggers.some(p => p.test(prompt));

    // Use STRICT system prompt for single HTML files to enforce validation
    const systemPrompt = isMultiFileRequest
      ? ENHANCED_GENERATION_SYSTEM_PROMPT + complexityAnalysis.systemPromptSuffix
      : isMultiPageHTMLRequest
      ? BUILDFLOW_ENHANCED_SYSTEM_PROMPT
      : STRICT_HTML_GENERATION_PROMPT;

    const maxTokens = getOptimalTokenLimit(prompt)

    console.log('🚀 Starting generation:', {
      projectId: projectId || 'new',
      promptLength: prompt.length,
      isMultiFile: isMultiFileRequest,
      isMultiPageHTML: isMultiPageHTMLRequest,
      usingStrictPrompt: !isMultiFileRequest && !isMultiPageHTMLRequest
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let generatedHtml = ''
          let tokenCount = 0
          let savedProjectId: string | null = projectId || null;

          // Build enhanced prompt if there were previous validation errors
          let enhancedPrompt = prompt;
          if (previousErrors && previousErrors.length > 0) {
            console.log('🔄 Regenerating with error feedback:', previousErrors.length, 'issues');
            enhancedPrompt = `${prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ PREVIOUS GENERATION HAD VALIDATION ERRORS - FIX THEM NOW ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${previousErrors.map(err => `❌ ${err}`).join('\n')}

MANDATORY FIXES YOU MUST APPLY:
${previousErrors.some(e => e.includes('h1')) ? '✅ Add exactly ONE <h1>Page Title</h1> in the page\n' : ''}${previousErrors.some(e => e.includes('description')) ? '✅ Add <meta name="description" content="..."> in <head>\n' : ''}${previousErrors.some(e => e.includes('CSS') || e.includes('variable')) ? '✅ Define CSS variables in :root { --primary: ...; --text: ...; }\n' : ''}${previousErrors.some(e => e.includes('script')) ? '✅ Keep inline scripts under 50 lines or extract to external file\n' : ''}${previousErrors.some(e => e.includes('charset')) ? '✅ Add <meta charset="UTF-8"> in <head>\n' : ''}${previousErrors.some(e => e.includes('viewport')) ? '✅ Add <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' : ''}
DO NOT MAKE THE SAME MISTAKES AGAIN. Generate corrected code now.`;
          }

          console.log('📝 Streaming from Claude with strict validation requirements...');

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            temperature: 1,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: enhancedPrompt
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

          // Extract clean project title
          const projectTitle = extractProjectTitle(prompt, generatedHtml);

          const project = await prisma.project.create({
            data: {
              userId: user.id,
              name: projectTitle,
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

          // Extract clean project title
          const projectTitle = extractProjectTitle(prompt, generatedHtml);

          // Update project
          await prisma.project.update({
            where: { id: savedProjectId, userId: user.id },
            data: {
              name: projectTitle,
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

        let validationData: {
          hasHtml: boolean;
          hasCss: boolean;
          hasJs: boolean;
          validationScore: number;
          validationPassed: boolean;
          errors: Array<{ message: string; line?: number; severity?: string }>;
          warnings: Array<{ message: string; line?: number; severity?: string }>;
          cspViolations: string[];
          passed: boolean;
          autoFix: null | object;
        } = {
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
        console.warn('⚠️ Multi-file parsing failed, falling back to single HTML:', parseResult.error);
        console.log('🔄 Processing as single HTML file...');
        // Continue to single HTML processing below (don't return)
      }
    }

    // SINGLE HTML PROCESSING - runs if not multi-file OR if multi-file parsing failed
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

          // Auto-fix common issues - ALWAYS run to catch h1, meta tags, etc.
          let autoFixResult: { fixed: string; appliedFixes: string[]; remainingIssues: number } | null = null
          if (safeValidation.errors.length > 0 || safeValidation.warnings.length > 0) {
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
                  severity: (e.severity || 'high') as 'high' | 'medium' | 'low',
                  fix: undefined
                })),
                warnings: safeValidation.warnings.map(w => ({
                  type: 'warning' as const,
                  category: 'best-practices' as const,
                  message: w.message,
                  severity: (w.severity || 'medium') as 'high' | 'medium' | 'low',
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

          // LAYER 5: Template-based HTML wrapper (final safety net)
          // Extract title from prompt for template
          const projectTitle = prompt.split('\n')[0].slice(0, 50) || 'Generated Project'
          
          // Only wrap if score is too low (< 90)
          if (safeValidation.score < 90) {
            console.log('⚠️ Score too low (' + safeValidation.score + '), applying template wrapper')
            
            // Apply template wrapper to guarantee all critical elements
            finalHtml = ensureValidHTML(finalHtml, projectTitle)
            
            console.log('🛡️ Template wrapper applied')
            
            // CRITICAL: Re-validate after template wrapper to get accurate results
            const finalValidationResult = validator.validateAll(finalHtml, finalCss, '') as ValidationResult
            safeValidation = {
              score: finalValidationResult?.score ?? 0,
              passed: finalValidationResult?.passed ?? false,
              errors: Array.isArray(finalValidationResult?.errors) ? finalValidationResult.errors : [],
              warnings: Array.isArray(finalValidationResult?.warnings) ? finalValidationResult.warnings : [],
            }
            
            console.log('📊 Final quality after template wrapper:', {
              score: safeValidation.score,
              passed: safeValidation.passed,
              errors: safeValidation.errors.length,
              warnings: safeValidation.warnings.length,
            })
          } else {
            console.log('✅ Score acceptable (' + safeValidation.score + '), skipping template wrapper')
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
            
            // Extract clean project title
            const projectTitle = extractProjectTitle(prompt, generatedHtml);
            
            const project = await prisma.project.create({
              data: {
                userId: user.id,
                name: projectTitle,
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

          // ── Multi-page HTML: extract <!-- File: --> sections → Page records ──
          if (isMultiPageHTMLRequest && savedProjectId && finalHtml.includes('<!-- File:')) {
            try {
              const fileMatches = Array.from(
                finalHtml.matchAll(/<!--\s*File:\s*(.+?)\s*-->([\s\S]*?)(?=<!--\s*File:|$)/gi)
              );
              const htmlFiles = fileMatches.filter(m => m[1].trim().endsWith('.html'));

              if (htmlFiles.length > 0) {
                for (let i = 0; i < htmlFiles.length; i++) {
                  const rawSlug = htmlFiles[i][1].trim().replace(/\.html$/, '');
                  const slug = rawSlug === 'index' ? 'home' : rawSlug;
                  const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
                  const content = htmlFiles[i][2].trim();
                  await prisma.page.upsert({
                    where: { projectId_slug: { projectId: savedProjectId, slug } },
                    update: { content, title },
                    create: {
                      projectId: savedProjectId,
                      slug,
                      title,
                      content,
                      isHomepage: i === 0,
                      order: i,
                      isPublished: true,
                    },
                  });
                }
                await prisma.project.update({
                  where: { id: savedProjectId },
                  data: { multiPage: true },
                });
                console.log(`✅ Saved ${htmlFiles.length} pages to Page model`);
                send(controller, { isMultiPage: true, pagesCount: htmlFiles.length });
              }
            } catch (pageErr) {
              console.error('❌ Multi-page extraction error:', pageErr);
            }
          }

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