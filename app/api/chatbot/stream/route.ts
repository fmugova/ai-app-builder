// app/api/chatbot/stream/route.ts
// ENHANCED - Avoid inline styles in system prompt

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { CodeValidator } from '@/lib/validators'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })

    const body = await req.json()
    const { prompt, projectId } = body

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Invalid prompt', { status: 400 })
    }

    console.log('🚀 Starting generation:', {
      projectId,
      promptLength: prompt.length,
      maxTokens: 8000,
    })

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

        try {
          // ✅ ENHANCED SYSTEM PROMPT - Avoid inline styles
          const systemPrompt = `You are an expert web developer. Generate complete, production-ready HTML code.

CRITICAL REQUIREMENTS:
1. Generate ONLY complete, valid HTML with <!DOCTYPE html>
2. Include ALL necessary CSS in <style> tags in <head> - NO inline style attributes
3. Include ALL JavaScript in <script> tags at end of <body>
4. Make it responsive and beautiful with modern design
5. Include proper meta tags (viewport, charset, description)
6. Use CSS classes instead of inline styles (style="...")
7. NO placeholders - everything must be complete and functional
8. Ensure good accessibility (alt text, ARIA labels, semantic HTML)

IMPORTANT: Avoid inline style attributes to prevent CSP violations. Put all styles in <style> tags.

Output ONLY the HTML code, no explanations.`

          let generatedHtml = ''
          let tokenCount = 0

          console.log('📝 Streaming from Claude...')

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            temperature: 1,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          })

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              generatedHtml += event.delta.text
              tokenCount++
              if (tokenCount % 50 === 0) send({ type: 'progress', length: generatedHtml.length })
            }
          }

          console.log('✅ Stream complete:', generatedHtml.length, 'chars')

          // Clean code
          let html = generatedHtml.trim().replace(/^```html?\n?/i, '').replace(/\n?```$/i, '')
          if (!html.toLowerCase().includes('<!doctype html>')) html = '<!DOCTYPE html>\n' + html

          const hasHtml = html.length > 0
          const hasCss = html.includes('<style')
          const hasJavaScript = html.includes('<script')

          console.log('📊 Running validation...')

          const validator = new CodeValidator()
          const validationResult = validator.validateAll(html, '', '')

          console.log('📊 Quality:', {
            score: validationResult.score || 0,
            passed: validationResult.passed || false,
            errors: validationResult.errors.length,
            warnings: validationResult.warnings.length,
          })

          // Log each validation error
          if (validationResult.errors.length > 0) {
            console.log('⚠️  Validation errors:')
            validationResult.errors.forEach((err, i) => {
              console.log(`  ${i + 1}. [${err.severity}] ${err.message}`)
            })
          }

          let savedProjectId = projectId

          if (!savedProjectId) {
            console.log('💾 Auto-saving project...')
            
            const user = await prisma.user.findUnique({
              where: { email: session.user.email },
              select: { id: true },
            })

            if (!user) throw new Error('User not found')

            console.log('📦 Complete HTML length:', html.length)

            const project = await prisma.project.create({
              data: {
                userId: user.id,
                name: prompt.slice(0, 50) || 'New Project',
                description: prompt.slice(0, 200),
                code: html,
                html,
                htmlCode: html,
                type: 'landing-page',
                hasHtml,
                hasCss,
                hasJavaScript,
                isComplete: true,
                jsValid: true,
                jsError: null,
                validationScore: validationResult.score || 0,
                validationPassed: validationResult.passed || false,
                validationErrors: JSON.stringify(validationResult.errors || []),
                validationWarnings: JSON.stringify(validationResult.warnings || []),
                cspViolations: [],
                status: 'COMPLETED',
                tokensUsed: tokenCount,
                generationTime: Date.now(),
                retryCount: 0,
              },
            })

            savedProjectId = project.id
            
            console.log('✅ Project auto-saved successfully')
            console.log('📝 Code field length:', html.length)
            console.log('🆔 Project ID:', savedProjectId)
            
            send({ type: 'projectCreated', projectId: savedProjectId })
          } else {
            console.log('🔄 Updating project:', savedProjectId)
            
            await prisma.project.update({
              where: { id: savedProjectId },
              data: {
                code: html,
                html,
                htmlCode: html,
                hasHtml,
                hasCss,
                hasJavaScript,
                isComplete: true,
                jsValid: true,
                validationScore: validationResult.score || 0,
                validationPassed: validationResult.passed || false,
                validationErrors: JSON.stringify(validationResult.errors || []),
                validationWarnings: JSON.stringify(validationResult.warnings || []),
                status: 'COMPLETED',
                tokensUsed: tokenCount,
                updatedAt: new Date(),
              },
            })
            
            console.log('✅ Project updated successfully')
          }

          send({ type: 'html', content: html })
          send({
            type: 'complete',
            projectId: savedProjectId,
            validation: {
              validationScore: validationResult.score || 0,
              validationPassed: validationResult.passed || false,
              errors: validationResult.errors || [],
              warnings: validationResult.warnings || [],
              passed: validationResult.passed || false,
            },
          })

          console.log('⏱️  Generation completed')
          controller.close()
          
        } catch (error) {
          console.error('❌ Generation error:', error)
          send({
            type: 'error',
            message: error instanceof Error ? error.message : 'Generation failed',
          })
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
    return new Response('Internal Server Error', { status: 500 })
  }
}