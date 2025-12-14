export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - use user email for AI requests
    const rateLimitResult = checkRateLimit(`ai:${session.user.email}`, rateLimits.aiGeneration)
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Rate limit exceeded. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

    // Check user limits
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        generationsUsed: true,
        generationsLimit: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const limit = user.generationsLimit || 10
    if ((user.generationsUsed || 0) >= limit) {
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
- Return ONLY the complete HTML code, no explanations

IMPORTANT: Always include a footer at the bottom with:
- © 2024 BuildFlow - Built with AI
- Links: Terms | Privacy | Contact
- Social media icons (if applicable)

Example footer:
<footer class="bg-gray-800 text-white py-8">
  <div class="max-w-7xl mx-auto px-6 text-center">
    <p class="text-sm text-gray-400 mb-4">© 2024 BuildFlow - Built with AI</p>
    <div class="flex justify-center gap-6 mb-4">
      <a href="/terms" class="text-gray-400 hover:text-white">Terms</a>
      <a href="/privacy" class="text-gray-400 hover:text-white">Privacy</a>
      <a href="/contact" class="text-gray-400 hover:text-white">Contact</a>
    </div>
    <div class="flex justify-center gap-4">
      <a href="https://twitter.com/buildflow" target="_blank" class="text-gray-400 hover:text-white">
        𝕏 Twitter
      </a>
      <a href="https://github.com/buildflow" target="_blank" class="text-gray-400 hover:text-white">
        GitHub
      </a>
    </div>
  </div>
</footer>
`,
        },
      ],
    })

    // Increment usage
    await prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    })

    const content = message.content[0]
    const code = content.type === 'text' ? content.text : ''

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'generation',
        action: 'generated',
        metadata: {
          promptPreview: prompt.substring(0, 100),
          generationType: type || 'landing-page'
        }
      }
    })

    return NextResponse.json({ code })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    )
  }
}