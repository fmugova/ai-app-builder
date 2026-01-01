import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: List pages for a project
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      )
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        User: {
          email: session.user.email
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const pages = await prisma.page.findMany({
      where: { projectId },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ pages })

  } catch (error: any) {
    console.error('Pages GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}

// POST: Create new page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, name, slug, content, title, description, isHome } = body

    if (!projectId || !name || !slug || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        User: {
          email: session.user.email
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // If setting as home, unset other home pages
    if (isHome) {
      await prisma.page.updateMany({
        where: { projectId, isHome: true },
        data: { isHome: false }
      })
    }

    // Get max order
    const maxOrder = await prisma.page.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const page = await prisma.page.create({
      data: {
        projectId,
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        content,
        title: title || name,
        description: description || '',
        isHome: isHome || false,
        order: (maxOrder?.order || 0) + 1
      }
    })

    // Mark project as multi-page
    await prisma.project.update({
      where: { id: projectId },
      data: { multiPage: true }
    })

    return NextResponse.json({ page })

  } catch (error: any) {
    console.error('Page POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create page', message: error.message },
      { status: 500 }
    )
  }
}