export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadProjectFiles } from '@/lib/saveProjectFiles'
import { createOctokit, slugifyRepoName, pushProjectToGitHub } from '@/lib/github'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5 pushes per 15-minute window per IP
    const rateLimit = await checkRateLimit(req, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many requests. Try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, name: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check GitHub connection
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { githubAccessToken: true, githubUsername: true },
    })
    if (!user?.githubAccessToken || !user?.githubUsername) {
      return NextResponse.json(
        { error: 'GitHub not connected. Go to Settings → Integrations to connect.' },
        { status: 400 }
      )
    }

    // Load all project files
    const files = await loadProjectFiles(id)
    if (Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'No files to push' }, { status: 400 })
    }

    // Check if this project was previously pushed
    const existingDeployment = await prisma.deployment.findFirst({
      where: { projectId: id, platform: 'github', status: 'success' },
      orderBy: { createdAt: 'desc' },
    })
    const isUpdate = !!existingDeployment

    const repoSlug = isUpdate
      ? existingDeployment!.deploymentId!.split('/')[1]
      : slugifyRepoName(project.name)

    const octokit = createOctokit(user.githubAccessToken)

    const { repoUrl, repoFullName } = await pushProjectToGitHub(
      octokit,
      user.githubUsername,
      repoSlug,
      files,
      isUpdate
    )

    // Record deployment
    await prisma.deployment.create({
      data: {
        projectId: id,
        userId: session.user.id,
        platform: 'github',
        status: 'success',
        deploymentUrl: repoUrl,
        deploymentId: repoFullName,
        deployedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, repoUrl, repoFullName, isNew: !isUpdate })
  } catch (error) {
    console.error('GitHub publish error:', error)
    const message = error instanceof Error ? error.message : 'Failed to push to GitHub'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
