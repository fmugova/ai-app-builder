// app/api/chatbot/stream/route.ts
// ENHANCED - Avoid inline styles in system prompt

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { CodeValidator } from '@/lib/validators'
import { processGeneratedCode } from '@/utils/extractInlineStyles.server'
import { BUILDFLOW_SYSTEM_PROMPT } from '@/lib/system-prompt'
import { completeIncompleteHTML } from '@/lib/code-parser'
import { enhanceGeneratedCode } from '@/lib/code-enhancer'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const runtime = 'nodejs'
export const maxDuration = 300

function getOptimalTokenLimit(prompt: string): number {
  const baseTokens = 15000
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
    const { prompt, projectId } = body

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Invalid prompt', { status: 400 })
    }

    const maxTokens = getOptimalTokenLimit(prompt)
    
    console.log('🚀 Starting generation:', {
      projectId: projectId || 'new',
      promptLength: prompt.length,
      maxTokens,
    })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let generatedHtml = ''
          let tokenCount = 0

          console.log('📝 Streaming from Claude...')

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            temperature: 1,
            messages: [
              {
                role: 'user',
                content: BUILDFLOW_SYSTEM_PROMPT + '\n\n' + prompt
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
          const finalHtml = enhanced.html
          const finalCss = enhanced.css

          const hasHtml = html.length > 0
          const hasCss = html.includes('<style') || finalCss.length > 0
          const hasJavaScript = html.includes('<script')

          console.log('📊 Running validation...')

          const validator = new CodeValidator()
          const validationResult = validator.validateAll(finalHtml, finalCss, '') as ValidationResult

          // Ensure validation result has proper structure
          const safeValidation: ValidationResult = {
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

          // Log validation errors if any
          if (safeValidation.errors.length > 0) {
            console.log('⚠️  Validation errors:')
            safeValidation.errors.forEach((err, i) => {
              console.log(`  ${i + 1}. [${err.severity || 'error'}] ${err.message}`)
            })
          }

          let savedProjectId = projectId

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
          };
          
          console.log('📤 Sending validation to client:', {
            score: validationData.validationScore,
            passed: validationData.validationPassed,
            errorsCount: validationData.errors.length,
            warningsCount: validationData.warnings.length,
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