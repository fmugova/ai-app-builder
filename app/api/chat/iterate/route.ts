export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`ai:${session.user.email}`, rateLimits.aiGeneration)
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${resetIn}s.` },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const message = formData.get('message') as string
    const files = formData.getAll('files') as File[]
    const urls = JSON.parse(formData.get('urls') as string || '[]') as string[]
    const currentCode = formData.get('currentCode') as string
    const projectId = formData.get('projectId') as string
    const conversationHistory = JSON.parse(formData.get('conversationHistory') as string || '[]')

    if (!message || !currentCode) {
      return NextResponse.json({ error: 'Message and code required' }, { status: 400 })
    }

    // Process uploaded files
    let fileContents = ''
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer()
        const content = Buffer.from(buffer).toString('utf-8')
        fileContents += `\n\n--- File: ${file.name} ---\n${content.substring(0, 10000)}\n`
      } catch (error) {
        console.error(`Failed to read ${file.name}:`, error)
        fileContents += `\n\n--- File: ${file.name} ---\n[Failed to read file]\n`
      }
    }

    // Fetch content from URLs
    let urlContents = ''
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BuildFlowAI/1.0)'
          },
          signal: AbortSignal.timeout(10000) // 10s timeout
        })
        
        if (response.ok) {
          const html = await response.text()
          // Extract text content (remove HTML tags)
          const textContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
            .replace(/<[^>]+>/g, ' ') // Remove all tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
          
          urlContents += `\n\n--- URL: ${url} ---\n${textContent.substring(0, 5000)}\n`
        }
      } catch (error) {
        console.error(`Failed to fetch ${url}:`, error)
        urlContents += `\n\n--- URL: ${url} ---\n[Failed to fetch content]\n`
      }
    }

    // Build conversation context
    const contextMessages = conversationHistory
      .slice(-3) // Last 3 messages for context
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    // Build comprehensive prompt
    const systemPrompt = `You are an expert web developer helping the user iterate on their website.

${fileContents ? `UPLOADED FILES:\n${fileContents}` : ''}
${urlContents ? `REFERENCED URLS:\n${urlContents}` : ''}

CONVERSATION HISTORY:
${contextMessages}

CURRENT WEBSITE CODE:
\`\`\`html
${currentCode}
\`\`\`

USER'S NEW REQUEST: "${message}"

INSTRUCTIONS:
1. Analyze the user's request in context of:
   - Their current code
   - Any uploaded files (broken code, designs, references)
   - Any URLs they provided (websites to learn from)
   - Previous conversation

2. Make the requested changes while:
   - Preserving all existing functionality
   - Maintaining React Router navigation
   - Keeping BuildFlow AI footer
   - Ensuring mobile responsiveness
   - Following the existing code style

3. If they uploaded broken code:
   - Identify all issues (syntax errors, missing dependencies, logic errors)
   - Fix ALL issues
   - Explain what was wrong

4. If they referenced other websites:
   - Extract relevant design/functionality
   - Adapt it to their project
   - Don't copy code directly

5. Return COMPLETE HTML (not snippets)

CRITICAL RULES:
- Return ONLY the complete HTML code
- No markdown backticks
- No explanations outside the code
- Maintain <!DOCTYPE html> declaration
- Keep all CDN scripts (React, React Router, Babel, Tailwind)
- Preserve HashRouter structure
- Footer must ONLY have: copyright + BuildFlow AI link

Generate the updated code now.`

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [{ role: 'user', content: systemPrompt }]
    })

    let updatedCode = ''
    if (response.content && response.content[0]) {
      const content = response.content[0]
      updatedCode = content.type === 'text' ? content.text : ''
    }

    // Clean up code
    updatedCode = updatedCode
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    if (!updatedCode.startsWith('<!DOCTYPE')) {
      updatedCode = `<!DOCTYPE html>\n${updatedCode}`
    }

    // Update project in database
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          code: updatedCode,
          updatedAt: new Date()
        }
      })
    }

    // Log activity
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (user) {
      await prisma.activity.create({
        data: {
          userId: user.id,
          type: 'generation',
          action: 'iterated',
          metadata: {
            message: message.substring(0, 100),
            hasFiles: files.length > 0,
            hasUrls: urls.length > 0
          }
        }
      })
    }

    return NextResponse.json({
      code: updatedCode,
      message: 'Code updated successfully'
    })

  } catch (error: any) {
    console.error('Chat iteration error:', error)
    
    if (error?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        { error: 'Claude is busy. Please try again in a moment.', retryable: true },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update code', details: error.message },
      { status: 500 }
    )
  }
}