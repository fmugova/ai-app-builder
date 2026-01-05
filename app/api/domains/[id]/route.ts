import { compose, withAuth, withSubscription, withResourceOwnership, withRateLimit } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const GET = compose(
  withResourceOwnership('domain', (params) => params.id),
  withSubscription('pro'),
  withAuth
)(async (req, context, session) => {
  const domain = await prisma.customDomain.findUnique({
    where: { id: context.params.id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
  
  return NextResponse.json({ success: true, domain })
})

export const DELETE = compose(
  withResourceOwnership('domain', (params) => params.id),
  withSubscription('pro'),
  withAuth
)(async (req, context, session) => {
  try {
    const domain = await prisma.customDomain.findUnique({
      where: { id: context.params.id },
    })
    
    await prisma.customDomain.delete({
      where: { id: context.params.id },
    })
    
    // Log security event
    await logSecurityEvent(session.user.id, 'custom_domain_deleted', {
      domainId: context.params.id,
      domain: domain?.domain,
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Failed to delete custom domain:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom domain' },
      { status: 500 }
    )
  }
})
