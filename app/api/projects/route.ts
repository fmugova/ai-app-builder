export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all projects for user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        Project: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json(user?.Project || [])
  } catch (error) {
    console.error('Fetch projects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { _count: { select: { Project: true } } },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check project limit
    const plan = user.subscriptionTier || 'free'
    const limit = plan === 'free' ? 3 : plan === 'pro' ? 50 : 999
    
    if (user._count.Project >= limit) {
      return NextResponse.json(
        { error: 'Project limit reached. Please upgrade your plan.' },
        { status: 429 }
      )
    }

    const { name, description, type, code } = await request.json()

    const project = await prisma.project.create({
      data: {
        name: name || 'Untitled Project',
        description: description || '',
        type: type || 'landing-page',
        code: code || '',
        userId: user.id,
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
