import { compose, withAuth, withRateLimit, withUsageCheck } from '@/lib/api-middleware'
import { incrementUsage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  code: z.string().optional(),
})

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET - Fetch all projects for user
export const GET = async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 🟢 OPTIONAL: Light rate limiting for reads
  const rateLimit = await (await import('@/lib/rate-limit')).checkRateLimit(request, 'general', session.user.id)
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ projects })
}

// POST - Create new project
export const POST = async (_req: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 🟡 CHECK RATE LIMIT (user-based)
  const rateLimit = await (await import('@/lib/rate-limit')).checkRateLimit(_req, 'write', session.user.id)
  if (!rateLimit.success) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        message: 'Please slow down',
        remaining: rateLimit.remaining,
      },
      { status: 429 }
    )
  }

  // ...existing code...
  const body = await _req.json()

  // Validate input
  const result = createProjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error },
      { status: 400 }
    )
  }

  // ✅ FIX: Include code and type from body if provided
  const project = await prisma.project.create({
    data: {
      name: result.data.name,
      description: result.data.description,
      code: body.code || '',             // ✅ Use provided code
      userId: session.user.id,
      type: body.type || 'landing',      // ✅ Use provided type
    },
  })

  // Increment usage counter
  await incrementUsage(session.user.id, 'project')

  // Check and send usage alerts (non-blocking)
  import('@/lib/usage-alerts').then(({ checkUsageAlerts }) => {
    checkUsageAlerts(session.user.id).catch(err => 
      console.error('Usage alert check failed:', err)
    )
  })

  return NextResponse.json({ project }, { status: 201 })
}
