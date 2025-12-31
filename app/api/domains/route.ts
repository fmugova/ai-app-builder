import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDomainToVercel, generateVerificationRecord } from '@/lib/vercel-domains'

export const dynamic = 'force-dynamic'

// GET: List all domains for user's projects
export async function GET(request: NextRequest) {
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

    const domains = await prisma.customDomain.findMany({
      where: {
        project: {
          userId: user.id
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ domains })

  } catch (error: any) {
    console.error('Domains GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    )
  }
}

// POST: Add new custom domain
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, domain } = await request.json()

    if (!projectId || !domain) {
      return NextResponse.json(
        { error: 'Missing projectId or domain' },
        { status: 400 }
      )
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    // Check if user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        User: {
          email: session.user.email
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if domain already exists
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain }
    })

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already in use' },
        { status: 409 }
      )
    }

    // Generate verification record
    const verificationRecord = generateVerificationRecord(domain, projectId)

    // Add domain to Vercel
    try {
      await addDomainToVercel(domain)
    } catch (vercelError: any) {
      console.error('Vercel API error:', vercelError)
      // Continue anyway - we'll store it and user can verify later
    }

    // Create domain record in database
    const customDomain = await prisma.customDomain.create({
      data: {
        projectId,
        domain,
        status: 'pending',
        verificationKey: verificationRecord.value
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      domain: customDomain,
      verificationRecord
    })

  } catch (error: any) {
    console.error('Domain POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add domain', message: error.message },
      { status: 500 }
    )
  }
}