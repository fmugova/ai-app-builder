export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Chat API called')

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('❌ No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📦 Request body:', { 
      hasMessage: !!body.message, 
      hasCode: !!body.currentCode,
      historyLength: body.conversationHistory?.length || 0
    })

    const { message, currentCode } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('🤖 Calling Anthropic API...')

    // Build the prompt
    const systemPrompt = `You are an expert web developer. The user has existing HTML code and wants to improve it.

CRITICAL RULES:
1. Return ONLY complete, valid HTML code
2. Maintain all existing functionality unless asked to change it
3. Make the specific changes requested
4. Keep the code clean and well-structured
5. Include proper HTML structure with <!DOCTYPE>, <html>, <head>, <body>

Current code:
\`\`\`html
${currentCode || 'No code yet'}
\`\`\`

User request: ${message}

Respond with ONLY the updated HTML code. No explanations outside the code.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ],
    })

    console.log('✅ Anthropic response received')

    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''

    // Extract code
    let code = aiResponse
    const codeMatch = aiResponse.match(/```(?:html)?\n([\s\S]*?)```/)
    if (codeMatch) {
      code = codeMatch[1].trim()
    }

    console.log('✅ Code extracted, length:', code.length)

    return NextResponse.json({
      success: true,
      message: 'Code updated successfully',
      code: code,
    })

  } catch (error: any) {
    console.error('❌ Chat API error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process chat message',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
