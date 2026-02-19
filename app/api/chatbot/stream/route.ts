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
import { parseMultiFileProject, convertToSingleHTML, extractPagesFromProject } from '@/lib/multi-file-parser'
import { extractProjectTitle } from '@/lib/utils/title-extraction'
import { analyzePrompt } from '@/lib/utils/complexity-detection'
import { z } from 'zod'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Prompt sanitization — runs on every user message BEFORE it reaches Claude.
 * Goal: remove null bytes / control chars and neutralise obvious injection patterns
 * without blocking legitimate requests like "create a form that ignores empty fields".
 *
 * We do NOT try to block all jailbreaks here (impossible). The system prompt +
 * Claude's own safety filters are the real defence. This layer stops the laziest
 * attempts and prevents control characters from corrupting the API payload.
 */
function sanitizePrompt(raw: string): string {
  // 1. Strip null bytes and non-printable control characters (keep \n \t \r)
  let s = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // 2. Collapse excessive repetition (e.g. 1000 newlines → 3)
  s = s.replace(/(\n){4,}/g, '\n\n\n').replace(/( ){10,}/g, '   ')

  // 3. Redact the most common direct system-prompt injection patterns.
  //    These are very unlikely to appear in legitimate "build me a webpage" prompts.
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /you\s+are\s+now\s+(a|an)\s+\w+/gi,         // "you are now a DAN"
    /\bDAN\b|\bjailbreak\b/gi,
    /reveal\s+(your\s+)?(system\s+)?prompt/gi,
    /print\s+(your\s+)?(system\s+)?prompt/gi,
    /output\s+(your\s+)?(system\s+)?prompt/gi,
    /\bACT\s+AS\b/gi,
    /respond\s+only\s+in\s+(json|xml|yaml|plain\s+text)/gi,
  ]

  for (const pattern of injectionPatterns) {
    s = s.replace(pattern, '[removed]')
  }

  return s.trim()
}

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
    const { prompt: rawPrompt, projectId, generationType, previousErrors } = parseResult.data
    const prompt = sanitizePrompt(rawPrompt)

    // Auto-detect generation type using complexity analysis
    const complexityAnalysis = analyzePrompt(prompt);
    const isMultiFileRequest = generationType === 'multi-file' ||
      complexityAnalysis.shouldUseFullstack;

    // Detect multi-page HTML requests (portfolio/website with named pages, NOT fullstack)
    const PAGE_KEYWORDS = '(?:home|landing|index|about|services|contact|portfolio|projects|blog|faq|gallery|team|pricing|login|signup|register|sitters?|coaches?|trainers?|listings?|menu|shop|store|booking|bookings|schedule|events?|testimonials?|reviews?|careers?|jobs?|press|media|resources?|docs?|help|support)'
    const multiPageTriggers = [
      // "home" near any known page keyword (wider 60-char window)
      new RegExp(`\\b(home|landing).{0,60}(about|services|contact|portfolio|projects|blog|faq|gallery|team|pricing)\\b`, 'i'),
      new RegExp(`\\b(about|services|contact|portfolio|projects|blog|faq).{0,60}(home|landing)\\b`, 'i'),
      // Explicit multi-page phrasing
      /multi-?page\s+(website|site|html)/i,
      /website\s+with\s+(multiple\s+)?pages/i,
      /portfolio\s+with\s+(pages|sections)/i,
      /separate\s+(html\s+)?pages/i,
      /\b(create|build|make)\s+.{0,30}\b(pages?|sections?)\b.{0,30}\b(home|about|contact|services)/i,
      // "Pages:" or "Navigation:" label followed by a list (P.F.D.A. layout / prompt structure)
      new RegExp(`\\b(pages?|navigation|nav|sections?|layout)\\s*[:\\-]\\s*.{0,20}${PAGE_KEYWORDS}`, 'i'),
      // Any 3+ comma-separated capitalized/known page names (broader than before)
      new RegExp(`${PAGE_KEYWORDS}\\s*(?:,\\s*${PAGE_KEYWORDS}){2,}`, 'i'),
      // "home, X, Y, Z" where X/Y/Z can be anything (catches "Home, Find Sitters, About, Contact")
      /\bhome\b.{0,5},\s*.+,.{0,5},\s*.{0,30}(about|contact|services|faq)/i,
    ];
    const isMultiPageHTMLRequest = !isMultiFileRequest &&
      multiPageTriggers.some(p => p.test(prompt));

    // Use STRICT system prompt for single HTML files to enforce validation
    const systemPrompt = isMultiFileRequest
      ? ENHANCED_GENERATION_SYSTEM_PROMPT + complexityAnalysis.systemPromptSuffix
      : isMultiPageHTMLRequest
      ? BUILDFLOW_ENHANCED_SYSTEM_PROMPT
      : STRICT_HTML_GENERATION_PROMPT;

    // Multi-file projects need more tokens to avoid truncated JSON
    const maxTokens = isMultiFileRequest ? 64000 : getOptimalTokenLimit(prompt)

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
            // Sanitize: strip anything resembling a prompt injection attempt
            const safeErrors = previousErrors
              .slice(0, 20) // cap number of errors
              .map((e: string) => String(e).slice(0, 200)) // cap length
              .filter((e: string) => !/ignore|forget|disregard|system\s*prompt|instruction|pretend|jailbreak/i.test(e))
              .map((e: string) => e.replace(/[<>]/g, '')) // strip angle brackets
            enhancedPrompt = `${prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ PREVIOUS GENERATION HAD VALIDATION ERRORS - FIX THEM NOW ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${safeErrors.map((err: string) => `❌ ${err}`).join('\n')}

MANDATORY FIXES YOU MUST APPLY:
${previousErrors.some(e => e.includes('h1')) ? '✅ Add exactly ONE <h1>Page Title</h1> in the page\n' : ''}${previousErrors.some(e => e.includes('description')) ? '✅ Add <meta name="description" content="..."> in <head>\n' : ''}${previousErrors.some(e => e.includes('CSS') || e.includes('variable')) ? '✅ Define CSS variables in :root { --primary: ...; --text: ...; }\n' : ''}${previousErrors.some(e => e.includes('script')) ? '✅ Keep inline scripts under 50 lines or extract to external file\n' : ''}${previousErrors.some(e => e.includes('charset')) ? '✅ Add <meta charset="UTF-8"> in <head>\n' : ''}${previousErrors.some(e => e.includes('viewport')) ? '✅ Add <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' : ''}
DO NOT MAKE THE SAME MISTAKES AGAIN. Generate corrected code now.`;
          }

          console.log('📝 Streaming from Claude with strict validation requirements...');

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            // Lower temperature for JSON multi-file output — consistency matters more than creativity
            temperature: isMultiFileRequest ? 0.3 : 1,
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
            dependencies: parseResult.project.dependencies || {},
            devDependencies: parseResult.project.devDependencies || {},
            envVars: (parseResult.project.envVars || []) as unknown as import('@prisma/client').Prisma.InputJsonValue,
            setupInstructions: (parseResult.project.setupInstructions || []) as unknown as import('@prisma/client').Prisma.InputJsonValue,
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
              dependencies: parseResult.project.dependencies || {},
              devDependencies: parseResult.project.devDependencies || {},
              envVars: (parseResult.project.envVars || []) as unknown as import('@prisma/client').Prisma.InputJsonValue,
              setupInstructions: (parseResult.project.setupInstructions || []) as unknown as import('@prisma/client').Prisma.InputJsonValue,
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

        // Extract page routes from TSX files and create Page records for multi-page preview
        let extractedPages: Array<{ slug: string; title: string; content: string; isHomepage: boolean; order: number }> = [];
        let isMultiPage = false;

        try {
          extractedPages = extractPagesFromProject(parseResult.project);
          console.log(`📄 extractPagesFromProject returned ${extractedPages.length} pages:`, extractedPages.map(p => ({ slug: p.slug, title: p.title, isHomepage: p.isHomepage })));
        } catch (pageExtractionError) {
          console.error('❌ Page extraction failed:', pageExtractionError);
        }

        if (extractedPages.length > 0 && savedProjectId) {
          try {
            // Delete any existing pages for this project
            await prisma.page.deleteMany({ where: { projectId: savedProjectId } });

            for (const page of extractedPages) {
              // Extract SEO metadata from each page's HTML content
              const titleMatch = page.content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
              const metaDescMatch = page.content.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
                || page.content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
              const h1Match = page.content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
              const pMatch = page.content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

              const h1Text = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : '';
              const pText = pMatch ? pMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 160) : '';
              const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
              const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';

              await prisma.page.create({
                data: {
                  projectId: savedProjectId,
                  slug: page.slug,
                  title: page.title,
                  content: page.content,
                  description: pText || metaDesc || null,
                  metaTitle: rawTitle || h1Text || page.title,
                  metaDescription: metaDesc || pText || null,
                  isHomepage: page.isHomepage,
                  order: page.order,
                  isPublished: true,
                },
              });
            }

            await prisma.project.update({
              where: { id: savedProjectId },
              data: { multiPage: true },
            });

            isMultiPage = true;
            console.log(`✅ Multi-file project: created ${extractedPages.length} preview pages`);
          } catch (pageCreationError) {
            console.error('❌ Page creation failed:', pageCreationError);
            // Non-fatal: project was saved, just pages failed
          }
        } else {
          console.log(`⚠️ No pages extracted (${extractedPages.length} pages, savedProjectId: ${savedProjectId})`);
        }

        // Auto-detect API endpoints from multi-file project files
        if (savedProjectId && parseResult.project) {
          try {
            const apiRouteFiles = parseResult.project.files.filter(f =>
              /^(?:src\/)?app\/api\/.*\/route\.(ts|js)$/.test(f.path) ||
              /^(?:src\/)?pages\/api\/.*\.(ts|js)$/.test(f.path)
            );

            if (apiRouteFiles.length > 0) {
              await prisma.apiEndpoint.deleteMany({ where: { projectId: savedProjectId, name: { startsWith: '[auto]' } } });

              const endpoints: Array<{
                projectId: string; name: string; description: string;
                path: string; method: string; code: string;
                requiresAuth: boolean; usesDatabase: boolean;
                isActive: boolean; testsPassed: boolean;
              }> = [];

              for (const file of apiRouteFiles) {
                // Extract route path from file path
                const routePath = '/' + file.path
                  .replace(/^(?:src\/)?(?:app|pages)\//, '')
                  .replace(/\/route\.(ts|js)$/, '')
                  .replace(/\.(ts|js)$/, '')
                  .replace(/\[([^\]]+)\]/g, ':$1');

                // Detect HTTP methods exported
                const methodRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
                let methodMatch: RegExpExecArray | null;
                const methods: string[] = [];
                while ((methodMatch = methodRegex.exec(file.content)) !== null) {
                  methods.push(methodMatch[1]);
                }
                if (methods.length === 0) methods.push('GET'); // default

                const requiresAuth = /getServerSession|getToken|authorization/i.test(file.content);
                const usesDatabase = /prisma\.|from\s+['"]@prisma\/client['"]/.test(file.content);

                for (const method of methods) {
                  endpoints.push({
                    projectId: savedProjectId,
                    name: `[auto] ${method} ${routePath}`,
                    description: `Auto-detected from ${file.path}`,
                    path: routePath,
                    method,
                    code: file.content.slice(0, 2000), // Store first 2KB of code
                    requiresAuth,
                    usesDatabase,
                    isActive: true,
                    testsPassed: false,
                  });
                }
              }

              if (endpoints.length > 0) {
                await prisma.apiEndpoint.createMany({ data: endpoints, skipDuplicates: true });
                console.log(`✅ Auto-detected ${endpoints.length} API endpoints from ${apiRouteFiles.length} route files`);
              }
            }
          } catch (apiDetectionError) {
            console.error('⚠️ API endpoint detection failed (non-fatal):', apiDetectionError);
          }
        }

        // Send success to client with validation
        send(controller, {
          projectId: savedProjectId,
          isMultiFile: true,
          filesCount: parseResult.project.files.length,
          validation: validationData,
        });

        // Signal multi-page preview if pages were created
        if (isMultiPage) {
          send(controller, { isMultiPage: true, pagesCount: extractedPages.length, projectId: savedProjectId });
        }

        send(controller, { done: true });
        controller.close();
        return;
      } else {
        console.warn('⚠️ Multi-file parsing failed:', parseResult.error);
        // Don't fall through to single-HTML processing — raw JSON stored as code
        // would render as garbage in the preview. Send a graceful error instead.
        send(controller, {
          error: 'The AI generated a fullstack project but the output could not be parsed. Please try again.',
          done: true,
        });
        controller.close();
        return;
      }
    }

    // SINGLE HTML PROCESSING - runs only for non-multi-file requests
    // Clean and process code
    let html = generatedHtml.trim()
      .replace(/^```(?:html?)?\n?/i, '')  // strips ```html or ``` (but not ```json — handled above)
      .replace(/\n?```$/i, '')
      .trim()

    // Strip AI preamble prose (text before <!DOCTYPE html> or <html)
    const htmlStartIndex = html.search(/<!doctype html>|<html[\s>]/i)
    if (htmlStartIndex > 0) {
      html = html.slice(htmlStartIndex)
    }

    // ── MULTI-PAGE BYPASS ──────────────────────────────────────────────────────
    // Multi-page HTML contains <!-- File: page.html --> markers that span
    // multiple full HTML documents. Running single-page enhancement, validation,
    // and template-wrapping on this combined output would corrupt it.
    // Skip those pipelines and jump straight to the save + extraction step.
    if (isMultiPageHTMLRequest) {
      const multiHtml = html // already stripped of markdown fences above

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
      if (!user) throw new Error('User not found')

      let savedMultiProjectId = projectId || null
      const multiTitle = extractProjectTitle(prompt, multiHtml)

      if (!savedMultiProjectId) {
        const project = await prisma.project.create({
          data: {
            userId: user.id,
            name: multiTitle,
            description: prompt.slice(0, 200) || '',
            code: multiHtml,
            html: multiHtml,
            htmlCode: multiHtml,
            css: '',
            cssCode: '',
            type: 'landing-page',
            hasHtml: true,
            hasCss: false,
            hasJavaScript: false,
            isComplete: true,
            jsValid: true,
            jsError: null,
            validationScore: BigInt(90),
            validationPassed: true,
            validationErrors: JSON.stringify([]),
            validationWarnings: JSON.stringify([]),
            cspViolations: JSON.stringify([]),
            status: 'COMPLETED',
            tokensUsed: BigInt(tokenCount),
            generationTime: BigInt(Date.now()),
            retryCount: BigInt(0),
          },
        })
        savedMultiProjectId = project.id
      } else {
        await prisma.project.update({
          where: { id: savedMultiProjectId },
          data: {
            code: multiHtml,
            html: multiHtml,
            htmlCode: multiHtml,
            validationScore: BigInt(90),
            validationPassed: true,
            status: 'COMPLETED',
            tokensUsed: BigInt(tokenCount),
            updatedAt: new Date(),
          },
        })
      }

      // Send validation + html to client
      send(controller, {
        html: multiHtml,
        validation: {
          isComplete: true,
          hasHtml: true,
          hasCss: false,
          hasJs: false,
          validationScore: 90,
          validationPassed: true,
          errors: [],
          warnings: [],
          cspViolations: [],
          passed: true,
        },
      })

      // Extract <!-- File: --> sections → Page records
      const fileMatches = Array.from(
        multiHtml.matchAll(/<!--\s*File:\s*(.+?)\s*-->([\s\S]*?)(?=<!--\s*File:|$)/gi)
      )
      const htmlFiles = fileMatches.filter(m => m[1].trim().endsWith('.html'))
      console.log(`📁 Multi-HTML approach: found ${htmlFiles.length} HTML file sections in output`);
      
      if (htmlFiles.length > 0) {
        for (let i = 0; i < htmlFiles.length; i++) {
          const rawSlug = htmlFiles[i][1].trim().replace(/\.html$/, '')
          const slug = rawSlug === 'index' ? 'home' : rawSlug
          const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
          const content = htmlFiles[i][2].trim()

          // Extract SEO metadata from HTML content
          const pageTitleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
          const pageMetaDescMatch = content.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
            || content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
          const pageH1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
          const pagePMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i)

          const pageRawTitle = pageTitleMatch ? pageTitleMatch[1].replace(/<[^>]*>/g, '').trim() : ''
          const pageH1 = pageH1Match ? pageH1Match[1].replace(/<[^>]*>/g, '').trim() : ''
          const pageMetaDesc = pageMetaDescMatch ? pageMetaDescMatch[1].trim() : ''
          const pagePText = pagePMatch ? pagePMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 160) : ''

          await prisma.page.upsert({
            where: { projectId_slug: { projectId: savedMultiProjectId, slug } },
            update: {
              content, title: pageRawTitle || pageH1 || title,
              metaTitle: pageRawTitle || pageH1 || title,
              metaDescription: pageMetaDesc || pagePText || null,
              description: pagePText || pageMetaDesc || null,
            },
            create: {
              projectId: savedMultiProjectId,
              slug,
              title: pageRawTitle || pageH1 || title,
              content,
              description: pagePText || pageMetaDesc || null,
              metaTitle: pageRawTitle || pageH1 || title,
              metaDescription: pageMetaDesc || pagePText || null,
              isHomepage: i === 0,
              order: i,
              isPublished: true,
            },
          })
        }
        await prisma.project.update({
          where: { id: savedMultiProjectId },
          data: { multiPage: true },
        })
        console.log(`✅ Multi-page: saved ${htmlFiles.length} pages`)
        send(controller, { isMultiPage: true, pagesCount: htmlFiles.length, projectId: savedMultiProjectId })
      }

      send(controller, { projectId: savedMultiProjectId })
      send(controller, { done: true })
      controller.close()
      return
    }
    // ── END MULTI-PAGE BYPASS ───────────────────────────────────────────────────

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

          // Inject BuildFlow copyright footer before </body>
          const buildflowFooter = `
  <footer style="text-align:center;padding:16px 0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;margin-top:40px;">
    &copy; ${new Date().getFullYear()} Built with <a href="https://buildflow.ai" style="color:#7c3aed;text-decoration:none;" target="_blank" rel="noopener">BuildFlow</a>
  </footer>`
          if (finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', buildflowFooter + '\n</body>')
          }

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