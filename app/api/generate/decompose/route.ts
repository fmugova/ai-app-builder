// app/api/generate/decompose/route.ts
// Lightweight analysis endpoint — no AI calls, pure heuristic.
// Called before generation to decide whether to show the Phase Wizard.

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { selectScaffold, scaffoldUsesNextjs } from '@/lib/scaffolds/scaffold-selector'
import { analyzePromptComplexity, decomposePrompt } from '@/lib/generation/prompt-decomposition'

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    scaffoldType: scaffoldResult.scaffold,
    scaffoldConfidence: scaffoldResult.confidence,
    scaffoldReasoning: scaffoldResult.reasoning,
    estimatedTokens: complexity.estimatedTokens,
    features: complexity.features,
    decomposition,
  })
}
