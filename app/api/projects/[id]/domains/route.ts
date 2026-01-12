import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Add custom domain
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params
    const { domain } = await request.json()

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format. Use format: example.com or subdomain.example.com' },
        { status: 400 }
      )
    }

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role !== 'admin' && { userId: user.id })
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if domain already exists
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain }
    })

    if (existingDomain) {
      return NextResponse.json(
        { error: 'This domain is already in use' },
        { status: 409 }
      )
    }

    // Add domain to Vercel
    const vercelToken = process.env.VERCEL_TOKEN
    if (!vercelToken) {
      return NextResponse.json(
        { error: 'Vercel token not configured' },
        { status: 500 }
      )
    }

    // Get Vercel project name from env or use a default
    const vercelProjectName = process.env.VERCEL_PROJECT_NAME || 'buildflow-production'

    // Add domain to Vercel project
    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectName}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      }
    )

    const vercelData = await vercelResponse.json()

    if (!vercelResponse.ok) {
      console.error('Vercel API error:', vercelData)
      return NextResponse.json(
        { error: vercelData.error?.message || 'Failed to add domain to Vercel' },
        { status: vercelResponse.status }
      )
    }

    // Create domain in database
    const customDomain = await prisma.customDomain.create({
      data: {
        projectId,
        userId: user.id,
        domain,
        status: 'pending',
        verificationKey: vercelData.verification?.[0]?.value || null,
        sslStatus: 'pending',
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'domain',
        action: 'added',
        metadata: {
          projectId,
          domain,
          domainId: customDomain.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      domain: customDomain,
      vercelConfig: {
        verification: vercelData.verification || [],
        configuredBy: vercelData.configuredBy,
      }
    })

  } catch (error) {
    console.error('Add domain error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add domain' },
      { status: 500 }
    )
  }
}

// GET - List domains for project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role !== 'admin' && { userId: user.id })
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all domains for this project
    const domains = await prisma.customDomain.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ domains })

  } catch (error) {
    console.error('Get domains error:', error)
    return NextResponse.json(
      { error: 'Failed to get domains' },
      { status: 500 }
    )
  }
}