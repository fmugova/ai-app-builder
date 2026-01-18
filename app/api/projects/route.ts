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
})

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET - Fetch all projects for user
export const GET = compose(
  withRateLimit(100),
  withAuth
)(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ projects })
})

// POST - Create new project
export const POST = compose(
  withRateLimit(20),
  withUsageCheck('create_project'),
  withAuth
)(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      userId: session.user.id,
      type: body.type || 'landing',      // ✅ Use provided type
      code: body.code || '',             // ✅ Use provided code
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
})
