// app/api/generate/decompose/route.ts
// Lightweight analysis endpoint — no AI calls, pure heuristic.
// Called before generation to decide whether to show the Phase Wizard.

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { selectScaffold, scaffoldUsesNextjs } from '@/lib/scaffolds/scaffold-selector'
import { analyzePromptComplexity, decomposePrompt } from '@/lib/generation/prompt-decomposition'
import { willUseNextjsPipeline } from '@/lib/generation/detectOutputMode'
import { rateLimiters } from '@/lib/rate-limit'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Enforce per-user rate limit based on subscription tier
  const dbUser = await prisma.user.findFirst({
    where: { id: token.sub },
    select: { id: true, subscriptionTier: true },
  })
  if (!dbUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tier = (dbUser.subscriptionTier ?? 'free').toLowerCase()
  const limiterKey =
    tier === 'enterprise' ? 'aiEnterprise' : tier === 'pro' ? 'aiPro' : 'aiFree'
  const rl = await rateLimiters[limiterKey].limit(`decompose:${dbUser.id}`)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset': String(rl.reset),
        },
      }
    )
  }

  let body: { prompt: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { prompt } = body
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  const scaffoldResult = selectScaffold(prompt)
  const complexity = analyzePromptComplexity(prompt)

  // Only decompose if the prompt is complex AND will use the Next.js pipeline
  // (HTML pipeline handles complexity well via sequential page generation)
  const shouldDecompose = complexity.isComplex && scaffoldUsesNextjs(scaffoldResult.scaffold)
  const decomposition = shouldDecompose ? decomposePrompt(prompt) : null

  return NextResponse.json({
    isComplex: complexity.isComplex,
    usesNextjsPipeline: willUseNextjsPipeline(prompt),
    scaffoldType: scaffoldResult.scaffold,
    scaffoldConfidence: scaffoldResult.confidence,
    scaffoldReasoning: scaffoldResult.reasoning,
    estimatedTokens: complexity.estimatedTokens,
    features: complexity.features,
    decomposition,
  })
}
