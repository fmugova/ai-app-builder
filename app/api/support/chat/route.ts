import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimits } from '@/lib/rateLimit';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Apply rate limiting (even for non-authenticated users to prevent abuse)
    const identifier = session?.user?.email || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = checkRateLimit(`support:${identifier}`, rateLimits.aiGeneration)
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          resetIn 
        },
        { status: 429 }
      )
    }

    const { message } = await request.json();

    // Get user context
    const user = session?.user?.email 
      ? await prisma.user.findUnique({
          where: { email: session.user.email },
          include: { Project: { take: 5, orderBy: { createdAt: 'desc' } } }
        })
      : null;

    const systemPrompt = `You are a helpful BuildFlow AI support assistant. 

BuildFlow AI is a no-code platform that uses AI to generate complete web applications.

Key features:
- AI-powered code generation using Claude
- One-click publish to live URLs
- GitHub export and Vercel deployment
- Project templates
- Free tier: 10 generations/month, 3 projects
- Pro tier: Unlimited generations and projects

User context:
${user ? `
- Name: ${user.name}
- Email: ${user.email}
- Tier: ${user.subscriptionTier}
- Projects created: ${user.Project.length}
- Generations used: ${user.generationsUsed}/${user.generationsLimit}
` : 'Not logged in'}

Guidelines:
- Be friendly, concise, and helpful
- If user hits limits, gently suggest upgrading
- For technical issues, provide step-by-step solutions
- Always include relevant links
- End with "Anything else I can help with?"`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: message
      }],
      system: systemPrompt
    });

    const reply = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I encountered an error. Please try again.';

    // Log the interaction
    if (user) {
      await prisma.activity.create({
        data: {
          userId: user.id,
          type: 'support',
          action: 'ai_chat',
          metadata: {
            question: message,
            response: reply
          }
        }
      });
    }

    return NextResponse.json({ reply });

  } catch (error: unknown) {
    console.error('Support chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
