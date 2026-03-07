// app/api/user/export/route.ts
// GDPR Article 15 — Right of Access / Data Portability
// Returns all personal data held for the authenticated user as a JSON download.
// Excludes: hashed passwords, internal tokens, 2FA secrets, reset tokens.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withLogging } from '@/lib/with-logging'

export const dynamic = 'force-dynamic'

async function GETHandler(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      Project: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      FormSubmission: {
        select: { id: true, type: true, data: true, submittedAt: true },
        orderBy: { submittedAt: 'desc' },
      },
      Deployment: {
        select: { id: true, status: true, platform: true, deploymentUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      Generation: {
        select: { id: true, prompt: true, type: true, tokensUsed: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    dataController: 'BuildFlow AI (buildflow-ai.app)',
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      bio: user.bio,
      githubUsername: user.githubUsername,
      theme: user.theme,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      emailVerified: user.emailVerified,
    },
    subscription: {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      currentPeriodEnd: user.currentPeriodEnd,
    },
    usage: {
      generationsUsed: user.generationsUsed.toString(),
      generationsLimit: user.generationsLimit.toString(),
      projectsThisMonth: user.projectsThisMonth.toString(),
      projectsLimit: user.projectsLimit.toString(),
    },
    projects: user.Project,
    formSubmissions: user.FormSubmission,
    deployments: user.Deployment,
    generationHistory: user.Generation,
  }

  const body = JSON.stringify(exportData, null, 2)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="buildflow-data-export.json"',
      'Content-Length': String(Buffer.byteLength(body, 'utf8')),
    },
  })
}

export const GET = withLogging(GETHandler)
