import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Verify domain status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: projectId, domainId } = await params

    // Get domain
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        projectId,
      },
      include: {
        project: true
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Verify user owns the project
    if (domain.project.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check verification status with Vercel
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectName = process.env.VERCEL_PROJECT_NAME || 'buildflow-production'

    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectName}/domains/${domain.domain}/config`,
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    )

    if (!vercelResponse.ok) {
      const error = await vercelResponse.json()
      return NextResponse.json(
        { error: error.error?.message || 'Failed to check domain status' },
        { status: vercelResponse.status }
      )
    }

    const config = await vercelResponse.json()

    // Update domain status based on Vercel response
    const isVerified = config.verified === true
    const hasSsl = config.sslEnabled === true

    const updatedDomain = await prisma.customDomain.update({
      where: { id: domainId },
      data: {
        status: isVerified ? 'active' : 'pending',
        verifiedAt: isVerified && !domain.verifiedAt ? new Date() : domain.verifiedAt,
        sslStatus: hasSsl ? 'active' : 'pending',
        sslIssuedAt: hasSsl && !domain.sslIssuedAt ? new Date() : domain.sslIssuedAt,
      }
    })

    return NextResponse.json({
      success: true,
      domain: updatedDomain,
      vercelConfig: config,
      needsConfiguration: !isVerified
    })

  } catch (error) {
    console.error('Verify domain error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify domain' },
      { status: 500 }
    )
  }
}

// DELETE - Remove custom domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: projectId, domainId } = await params

    // Get domain
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        projectId,
      },
      include: {
        project: true
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Verify user owns the project
    if (domain.project.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove from Vercel
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectName = process.env.VERCEL_PROJECT_NAME || 'buildflow-production'

    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectName}/domains/${domain.domain}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    )

    // Continue even if Vercel deletion fails (domain might already be removed)
    if (!vercelResponse.ok) {
      console.warn('Failed to remove domain from Vercel:', await vercelResponse.text())
    }

    // Remove from database
    await prisma.customDomain.delete({
      where: { id: domainId }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'domain',
        action: 'removed',
        metadata: {
          projectId,
          domain: domain.domain,
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete domain error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete domain' },
      { status: 500 }
    )
  }
}

// GET - Get domain details and DNS configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, domainId } = await params

    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        projectId,
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Get DNS configuration from Vercel
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelProjectName = process.env.VERCEL_PROJECT_NAME || 'buildflow-production'

    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectName}/domains/${domain.domain}/config`,
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    )

    if (!vercelResponse.ok) {
      return NextResponse.json({ domain })
    }

    const config = await vercelResponse.json()

    return NextResponse.json({
      domain,
      dnsConfig: {
        misconfigured: config.misconfigured,
        verified: config.verified,
        configuredBy: config.configuredBy,
        acceptedChallenges: config.acceptedChallenges,
        verification: config.verification
      }
    })

  } catch (error) {
    console.error('Get domain error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get domain' },
      { status: 500 }
    )
  }
}