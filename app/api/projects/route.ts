import { compose, withAuth, withRateLimit, withUsageCheck } from '@/lib/api-middleware'
import { incrementUsage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
)(async (req: NextRequest, context: { params: any }, session: any) => {
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
)(async (req: NextRequest, context: { params: any }, session: any) => {
  const body = await req.json()

  // Validate input
  const result = createProjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error },
      { status: 400 }
    )
  }

  const project = await prisma.project.create({
    data: {
      name: result.data.name,
      description: result.data.description,
      userId: session.user.id,
      type: '',
      code: '',
    },
  })

  // Increment usage counter
  await incrementUsage(session.user.id, 'project')

  return NextResponse.json({ project }, { status: 201 })
})
