import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      )
    }

    if (subscription.generationsLimit !== -1 && 
        subscription.generationsUsed >= subscription.generationsLimit) {
      return NextResponse.json(
        { 
          error: "Generation limit reached",
          limit: subscription.generationsLimit,
          used: subscription.generationsUsed,
          plan: subscription.plan
        },
        { status: 403 }
      )
    }

    const { projectType, description, existingCode, refinement } = await req.json()

    if (!projectType || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    let prompt = ""
    if (existingCode && refinement) {
      prompt = `You are helping refine a React component. Here's the current code:

\`\`\`jsx
${existingCode}
\`\`\`

User request: ${refinement}

Please provide the complete updated React component code. Return ONLY the code, no explanations. Start directly with imports.`
    } else {
      prompt = `Create a complete, production-ready ${projectType} based on this description: ${description}

Requirements:
- Use React with hooks for interactivity
- Use Tailwind CSS for styling with modern, beautiful design
- Make it fully functional, not a placeholder
- Include smooth animations and transitions
- Ensure responsive design for all screen sizes
- Use modern UI patterns and best practices
- Make it visually impressive with attention to detail
- Add meaningful interactivity and user feedback
- CRITICAL: Never use localStorage or sessionStorage - use React state only

Return ONLY the complete React component code, nothing else. Start directly with imports.`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('No code generated')
    }

    let code = data.content[0].text
    code = code.replace(/```(?:jsx|javascript|react)?\n?/g, '').replace(/```$/g, '').trim()

    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        generationsUsed: subscription.generationsUsed + 1
      }
    })

    await prisma.generation.create({
      data: {
        userId: session.user.id,
        projectType,
        description,
        tokensUsed: data.usage?.output_tokens || 0
      }
    })

    return NextResponse.json({ 
      code,
      usage: {
        used: subscription.generationsUsed + 1,
        limit: subscription.generationsLimit,
        remaining: subscription.generationsLimit === -1 
          ? -1 
          : subscription.generationsLimit - (subscription.generationsUsed + 1)
      }
    })

  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate code" },
      { status: 500 }
    )
  }
}