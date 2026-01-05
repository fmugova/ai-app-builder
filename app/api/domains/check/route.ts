import { compose, withAuth, withSubscription, withRateLimit } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const checkDomainSchema = z.object({
  domain: z.string()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, 'Invalid domain format'),
})

export const POST = compose(
  withRateLimit(30, 60000), // 30 checks per minute
  withSubscription('pro'),
  withAuth
)(async (req: NextRequest, context: any, session: any) => {
  try {
    const body = await req.json()
    
    // Validate input
    const result = checkDomainSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid domain format', details: result.error },
        { status: 400 }
      )
    }
    
    const { domain } = result.data
    
    // Check if domain is already taken
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain },
    })
    
    return NextResponse.json({
      available: !existingDomain,
      domain,
      message: existingDomain 
        ? 'Domain is already in use' 
        : 'Domain is available',
    })
    
  } catch (error) {
    console.error('Failed to check domain:', error)
    return NextResponse.json(
      { error: 'Failed to check domain availability' },
      { status: 500 }
    )
  }
})
