import { compose, withAuth, withSubscription, withUsageCheck, withRateLimit } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createDomainSchema = z.object({
  domain: z.string()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, 'Invalid domain format'),
  projectId: z.string().min(1),
})

export const dynamic = 'force-dynamic'

// GET: List all domains for user's projects
export const GET = compose(
  withRateLimit(100),
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: { params: any }, session: any) => {
  const domains = await prisma.customDomain.findMany({
    where: {
      project: {
        userId: session.user.id,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  
  return NextResponse.json({ success: true, domains })
})

// POST: Add new custom domain
export const POST = compose(
  withRateLimit(20),
  withUsageCheck('add_domain'),
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: { params: any }, session: any) => {
  try {
    const body = await req.json()
    
    // Validate input
    const result = createDomainSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error },
        { status: 400 }
      )
    }
    
    const { domain, projectId } = result.data
    
    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Check if domain already exists
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain },
    })
    
    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already in use' },
        { status: 409 }
      )
    }
    
    // Create custom domain
    const customDomain = await prisma.customDomain.create({
      data: {
        domain,
        projectId,
        status: 'pending',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    // Log security event
    await logSecurityEvent(session.user.id, 'custom_domain_added', {
      domainId: customDomain.id,
      domain: customDomain.domain,
      projectId,
    })
    
    return NextResponse.json({ 
      success: true, 
      domain: customDomain 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to add custom domain:', error)
    return NextResponse.json(
      { error: 'Failed to add custom domain' },
      { status: 500 }
    )
  }
})