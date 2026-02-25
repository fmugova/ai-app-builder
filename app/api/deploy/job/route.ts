// app/api/deploy/job/route.ts
// Polls the state of a deploy job stored in Upstash Redis.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redis } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const REDIS_AVAILABLE = !!process.env.UPSTASH_REDIS_REST_URL?.startsWith('https://')

export async function GET(req: NextRequest) {
  if (!REDIS_AVAILABLE) {
    return NextResponse.json({ error: 'Deployment requires Upstash Redis.' }, { status: 503 })
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = req.nextUrl.searchParams.get('jobId')
    if (!jobId || !/^[a-f0-9]{24}$/.test(jobId)) {
      return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 })
    }

    const raw = await redis.get<string>(`deploy:job:${jobId}`)
    if (!raw) {
      return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 })
    }

    const job = typeof raw === 'string' ? JSON.parse(raw) : raw

    // Ownership check — only the submitting user can poll
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Strip internal fields before returning
    const { userId: _uid, projectId: _pid, ...publicJob } = job
    return NextResponse.json(publicJob)
  } catch (error) {
    console.error('Deploy job poll error:', error)
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 })
  }
}
