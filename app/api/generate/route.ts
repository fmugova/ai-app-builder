export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user limits
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        aiRequestsUsed: true,
        aiRequestsLimit: true,
        subscriptionPlan: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const limit = user.aiRequestsLimit || 10
    if ((user.aiRequestsUsed || 0) >= limit) {
      return NextResponse.json(
        { error: 'AI request limit reached. Please upgrade your plan.' },
        { status: 429 }
      )
    }

    const { prompt, type } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Generate with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are an expert web developer. Create a complete, modern, responsive HTML page with Tailwind CSS for: ${prompt}

Type: ${type || 'landing-page'}

Requirements:
- Use Tailwind CSS via CDN
- Make it fully responsive
- Use modern design principles
- Include all necessary sections
- Use appropriate colors and typography
- Return ONLY the complete HTML code, no explanations`,
        },
      ],
    })

    // Increment usage
    await prisma.user.update({
      where: { id: user.id },
      data: { aiRequestsUsed: { increment: 1 } },
    })

    const content = message.content[0]
    const code = content.type === 'text' ? content.text : ''

    return NextResponse.json({ code })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    )
  }
}