import { withAuth } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const POST = withAuth(async (req, context, session) => {
  try {
    // Check Pro subscription
    if (!['pro', 'business', 'enterprise'].includes(session.user.subscriptionTier)) {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    // Check ownership
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: context.params.id,
        project: {
          userId: session.user.id
        }
      },
    })
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }
    
    // Verify DNS records
    const verificationResult = await verifyDomainDNS(domain.domain)
    
    // Update domain status - removed 'verified' field, only using 'verifiedAt'
    await prisma.customDomain.update({
      where: { id: context.params.id },
      data: {
        status: verificationResult.verified ? 'active' : 'pending',
        verifiedAt: verificationResult.verified ? new Date() : null,
      },
    })
    
    // Log security event
    await logSecurityEvent(session.user.id, 'domain_verification_attempted', {
      domainId: context.params.id,
      domain: domain.domain,
      success: verificationResult.verified,
    })
    
    return NextResponse.json({
      success: true,
      verified: verificationResult.verified,
      message: verificationResult.message,
      records: verificationResult.records,
    })
    
  } catch (error) {
    console.error('Failed to verify domain:', error)
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    )
  }
})

// Helper function to verify domain DNS
async function verifyDomainDNS(domain: string) {
  // This is a placeholder - implement actual DNS verification
  // Check for CNAME or A records pointing to your platform
  
  try {
    // Example: Use dns.promises.resolve() to check DNS records
    // const records = await dns.promises.resolve(domain, 'CNAME')
    
    // For now, return a mock response
    return {
      verified: false,
      message: 'DNS verification not yet implemented. Please add the required DNS records.',
      records: [
        {
          type: 'CNAME',
          name: domain,
          value: 'your-platform.vercel.app',
          status: 'pending',
        },
      ],
    }
  } catch (error) {
    return {
      verified: false,
      message: 'Could not verify DNS records',
      records: [],
    }
  }
}
