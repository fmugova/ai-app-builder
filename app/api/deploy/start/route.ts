// app/api/deploy/start/route.ts
// Kicks off an async GitHub→Vercel deploy job and returns a jobId.
// Job progress is stored in Upstash Redis and polled via /api/deploy/job.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Redis } from '@upstash/redis'
import { randomBytes } from 'crypto'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const JOB_TTL = 60 * 30 // 30 minutes

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, repoName, privateRepo = true } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    // Ownership check
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true, name: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const jobId = randomBytes(12).toString('hex')

    // Store initial job state
    await redis.setex(`deploy:job:${jobId}`, JOB_TTL, JSON.stringify({
      status: 'running',
      step: 'createRepo',
      message: 'Starting deployment…',
      projectId,
      userId: session.user.id,
      repoName: repoName || project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      privateRepo,
    }))

    // Kick off background work (fire and forget via Edge-compatible fetch to self)
    // We use a separate lightweight route to avoid blocking the response.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`
    fetch(`${baseUrl}/api/deploy/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-deploy-secret': process.env.DEPLOY_JOB_SECRET || '',
      },
      body: JSON.stringify({ jobId, projectId, userId: session.user.id, repoName, privateRepo }),
    }).catch(() => {
      // Fire-and-forget — errors surface via job polling
    })

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Deploy start error:', error)
    return NextResponse.json({ error: 'Failed to start deployment' }, { status: 500 })
  }
}
