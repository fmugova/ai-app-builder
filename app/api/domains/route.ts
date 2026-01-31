import { compose, withAuth, withSubscription, withUsageCheck, withRateLimit } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

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
)(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const domains = await prisma.customDomain.findMany({
    where: {
      Project: {
        userId: session.user.id,
      },
    },
    include: {
      Project: {
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
)(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        user_id: session.user.id,
        status: 'pending',
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    // Log security event
    await logSecurityEvent({
      userId: session.user.id,
      type: 'custom_domain_added',
      action: 'success',
      metadata: {
        domainId: customDomain.id,
        domain: customDomain.domain,
        projectId,
      },
      severity: 'info',
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
