import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 30/min per user (Upstash — survives serverless cold starts)
    const rl = await checkRateLimitByIdentifier(`iterate:${session.user.id || session.user.email}`, 'write')
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      )
    }

    const { currentCode, userRequest, conversationHistory } = await request.json()

    if (!currentCode || !userRequest) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Build conversation messages
    const messages = [
      {
        role: 'user' as const,
        content: `I have this React SPA code:

\`\`\`html
${currentCode}
\`\`\`

User request: ${userRequest}

Please update the code to fulfill this request. Maintain all existing functionality and structure. Return ONLY the complete updated HTML code, no explanations or markdown formatting.`
      }
    ]

    // Add conversation history if exists
    if (conversationHistory && conversationHistory.length > 0) {
      // Add previous context
      const historyContext = conversationHistory.map((msg: any) => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n')
      
      messages[0].content = `Previous conversation:\n${historyContext}\n\n${messages[0].content}`
    }

    console.log('Calling Claude API for iteration...')

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: messages
    })

    console.log('Claude API response received')

    // Extract code
    let updatedCode = ''
    if (response.content && response.content[0]) {
      const content = response.content[0]
      updatedCode = content.type === 'text' ? content.text : ''
    }

    // Clean up markdown code blocks
    updatedCode = updatedCode
      .replace(/```html\n?/g, '')
      .replace(/```jsx\n?/g, '')
      .replace(/```typescript\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    // Ensure DOCTYPE
    if (!updatedCode.startsWith('<!DOCTYPE')) {
      updatedCode = `<!DOCTYPE html>\n${updatedCode}`
    }

    return NextResponse.json({ 
      code: updatedCode,
      explanation: 'Code updated successfully based on your request!'
    })

  } catch (error: any) {
    console.error('Iteration error:', error)

    if (error?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        { error: 'Claude is experiencing high demand. Please try again in a moment.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update code', details: error.message },
      { status: 500 }
    )
  }
}
