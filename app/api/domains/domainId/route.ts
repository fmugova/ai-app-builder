import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyDomain, removeDomainFromVercel, getDomainStatus } from '@/lib/vercel-domains'

export const dynamic = 'force-dynamic'

// GET: Get domain details and status
export async function GET(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  const { domainId } = params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        Project: {
          User: {
            email: session.user.email
          }
        }
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Get live status from Vercel
    try {
      const vercelStatus = await getDomainStatus(domain.domain)
      
      // Update database with latest status
      const updatedDomain = await prisma.customDomain.update({
        where: { id: domainId },
        data: {
          status: vercelStatus.verified ? 'active' : 'pending',
          verifiedAt: vercelStatus.verified ? new Date() : null
        },
        include: {
          Project: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return NextResponse.json({
        domain: updatedDomain,
        vercelStatus
      })

    } catch {
      // Return database status if Vercel API fails
      return NextResponse.json({ domain })
    }

  } catch (error: unknown) {
    console.error('Domain GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch domain' },
      { status: 500 }
    )
  }
}

// POST: Verify domain
export async function POST(request: NextRequest, context: { params: { domainId: string } }) {
  const { domainId } = context.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        Project: {
          User: {
            email: session.user.email
          }
        }
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Verify domain with Vercel
    const vercelStatus = await verifyDomain(domain.domain)

    // Update database
    const updatedDomain = await prisma.customDomain.update({
      where: { id: domainId },
      data: {
        status: vercelStatus.verified ? 'active' : 'verifying',
        verifiedAt: vercelStatus.verified ? new Date() : null,
        sslStatus: vercelStatus.verified ? 'active' : 'pending',
        errorMessage: vercelStatus.verified ? null : 'Verification pending'
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      domain: updatedDomain,
      verified: vercelStatus.verified
    })

  } catch (error: unknown) {
    console.error('Domain verify error:', error)
    // Update with error
    const errorMessage = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : String(error);
    await prisma.customDomain.update({
      where: { id: domainId },
      data: {
        status: 'failed',
        errorMessage
      }
    })
    return NextResponse.json(
      { error: 'Failed to verify domain', message: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE: Remove custom domain
export async function DELETE(request: NextRequest, context: { params: { domainId: string } }) {
  const { domainId } = context.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        Project: {
          User: {
            email: session.user.email
          }
        }
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Remove from Vercel
    try {
      await removeDomainFromVercel(domain.domain)
    } catch (vercelError) {
      console.error('Vercel remove error:', vercelError)
      // Continue anyway
    }

    // Delete from database
    await prisma.customDomain.delete({
      where: { id: domainId }
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Domain DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete domain' },
      { status: 500 }
    )
  }
}