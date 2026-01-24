import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { promises as dns } from 'dns'

// POST /api/projects/[id]/domains/[domainId]/verify - Verify DNS configuration
export async function POST(req: Request, context: { params: { id: string; domainId: string } }) {
  const { id, domainId } = context.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get domain
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        Project: {
          id: id,
          userId: user.id
        }
      }
    })

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Verify DNS configuration
    const dnsCheck = await verifyDNSConfiguration(
      domain.domain,
      domain.verificationKey
    )

    if (!dnsCheck.verified) {
      return NextResponse.json({
        verified: false,
        message: dnsCheck.message,
        checks: dnsCheck.checks
      })
    }

    // Check Vercel domain status
    const vercelCheck = await checkVercelDomainStatus(domain.domain)

    // Update domain status
    const updatedDomain = await prisma.customDomain.update({
      where: { id: domainId },
      data: {
        status: dnsCheck.verified ? 'active' : 'pending',
        verifiedAt: dnsCheck.verified ? new Date() : null,
        sslStatus: vercelCheck.sslConfigured ? 'active' : 'pending',
        sslIssuedAt: vercelCheck.sslConfigured ? new Date() : null
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'domain',
        action: 'verified',
        metadata: {
          projectId: id,
          domain: domain.domain,
          sslConfigured: vercelCheck.sslConfigured
        },
        userId: user.id
      }
    })

    return NextResponse.json({
      verified: true,
      domain: updatedDomain,
      message: 'Domain verified successfully!',
      sslStatus: vercelCheck.sslConfigured ? 'active' : 'pending',
      checks: dnsCheck.checks
    })

  } catch (error) {
    console.error('Verify domain error:', error)
    return NextResponse.json(
      { error: 'Failed to verify domain', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper: Verify DNS configuration
async function verifyDNSConfiguration(
  domain: string,
  verificationKey: string | null
): Promise<{
  verified: boolean
  message: string
  checks: {
    cname: boolean
    txt?: boolean
    aRecord?: boolean
  }
}> {
  const checks = {
    cname: false,
    txt: false,
    aRecord: false
  }

  try {
    // Check CNAME record
    try {
      const cnameRecords = await dns.resolveCname(domain)
      const hasVercelCname = cnameRecords.some(record => 
        record.includes('vercel-dns.com') || 
        record.includes('vercel.app') ||
        record.includes('cname.vercel-dns.com')
      )
      checks.cname = hasVercelCname
    } catch {
      // CNAME might not exist, try A record
      try {
        const aRecords = await dns.resolve4(domain)
        // Vercel's IP ranges (example - these can change)
        const vercelIPs = ['76.76.21', '76.223.']
        checks.aRecord = aRecords.some(ip => 
          vercelIPs.some(prefix => ip.startsWith(prefix))
        )
      } catch {
        checks.aRecord = false
      }
    }

    // Check TXT record for verification (optional but recommended)
    if (verificationKey) {
      try {
        const txtRecords = await dns.resolveTxt(`_buildflow-verify.${domain}`)
        const flatRecords = txtRecords.flat()
        checks.txt = flatRecords.some(record => record === verificationKey)
      } catch {
        checks.txt = false
      }
    }

    // Domain is verified if either CNAME or A record points to Vercel
    const verified = checks.cname || checks.aRecord

    if (verified) {
      return {
        verified: true,
        message: 'DNS configuration verified successfully!',
        checks
      }
    }

    return {
      verified: false,
      message: 'DNS not configured correctly. Please check your DNS settings.',
      checks
    }

  } catch (error) {
    return {
      verified: false,
      message: `DNS verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      checks
    }
  }
}

// Helper: Check Vercel domain status
async function checkVercelDomainStatus(domain: string): Promise<{
  configured: boolean
  sslConfigured: boolean
  error?: string
}> {
  const vercelToken = process.env.VERCEL_API_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID

  if (!vercelToken || !vercelProjectId) {
    return {
      configured: false,
      sslConfigured: false,
      error: 'Vercel API not configured'
    }
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`
        }
      }
    )

    if (!response.ok) {
      return {
        configured: false,
        sslConfigured: false,
        error: 'Domain not found in Vercel'
      }
    }

    const data = await response.json()

    return {
      configured: data.verified || false,
      sslConfigured: data.verified && !data.misconfigured,
      error: data.misconfigured ? 'Domain misconfigured' : undefined
    }

  } catch (error) {
    return {
      configured: false,
      sslConfigured: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
