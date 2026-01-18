import { withAuth } from '@/lib/api-middleware'
import { logSecurityEvent } from '@/lib/security'
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
    const { id } = await context.params;
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: id as string,
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
      where: { id: id as string },
      data: {
        status: verificationResult.verified ? 'active' : 'pending',
        verifiedAt: verificationResult.verified ? new Date() : null,
      },
    })
    
    // Log security event
    await logSecurityEvent({
      userId: session.user.id,
      type: 'domain_verification_attempted',
      action: verificationResult.verified ? 'success' : 'failure',
      metadata: {
        domainId: id,
        domain: domain.domain,
        success: verificationResult.verified,
      },
      severity: 'info',
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
  try {
    // Import dns module for DNS lookups
    const dns = require('dns').promises
    
    const checks = {
      cname: false,
      a: false,
      txt: false,
    }
    
    const records: Array<{ type: string; name: string; value: string; status: string }> = []
    
    // Check CNAME record (subdomain.example.com -> cname.vercel-dns.com)
    try {
      const cnameRecords = await dns.resolve(domain, 'CNAME')
      if (cnameRecords && cnameRecords.length > 0) {
        const hasVercelCNAME = cnameRecords.some((record: string) => 
          record.includes('vercel') || record.includes('cname.vercel-dns.com')
        )
        checks.cname = hasVercelCNAME
        records.push({
          type: 'CNAME',
          name: domain,
          value: cnameRecords[0],
          status: hasVercelCNAME ? 'verified' : 'invalid',
        })
      }
    } catch (error) {
      // CNAME not found, check A record as fallback
    }
    
    // Check A record (example.com -> Vercel IP)
    if (!checks.cname) {
      try {
        const aRecords = await dns.resolve4(domain)
        if (aRecords && aRecords.length > 0) {
          // Vercel's common IP address
          const hasVercelIP = aRecords.includes('76.76.21.21')
          checks.a = hasVercelIP
          records.push({
            type: 'A',
            name: domain,
            value: aRecords[0],
            status: hasVercelIP ? 'verified' : 'pending',
          })
        }
      } catch (error) {
        // A record not found
      }
    }
    
    // Check TXT record for verification
    try {
      const txtRecords = await dns.resolveTxt(`_buildflow-verify.${domain}`)
      if (txtRecords && txtRecords.length > 0) {
        checks.txt = true
        records.push({
          type: 'TXT',
          name: `_buildflow-verify.${domain}`,
          value: txtRecords[0].join(''),
          status: 'verified',
        })
      }
    } catch (error) {
      // TXT record not found (optional)
    }
    
    const isVerified = checks.cname || checks.a
    
    return {
      verified: isVerified,
      message: isVerified 
        ? 'Domain DNS configured correctly!' 
        : 'DNS records not found. Please configure your DNS settings.',
      records,
      checks,
    }
  } catch (error) {
    console.error('DNS verification error:', error)
    return {
      verified: false,
      message: 'Could not verify DNS records. This may be temporary.',
      records: [],
      checks: { cname: false, a: false, txt: false },
    }
  }
}
