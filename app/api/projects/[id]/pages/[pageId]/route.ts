import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get single page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: projectId, pageId } = await params

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const page = await prisma.page.findUnique({
      where: { id: pageId },
    })

    if (!page || page.projectId !== projectId) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (error: any) {
    console.error('Page fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

// PUT - Update page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: projectId, pageId } = await params
    const updateData = await request.json()

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const existingPage = await prisma.page.findUnique({
      where: { id: pageId },
    })

    if (!existingPage || existingPage.projectId !== projectId) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // If setting as homepage, unset other homepage
    if (updateData.isHomepage && !existingPage.isHomepage) {
      await prisma.page.updateMany({
        where: { projectId, isHomepage: true },
        data: { isHomepage: false },
      })
    }

    // Update the page
    const page = await prisma.page.update({
      where: { id: pageId },
      data: {
        title: updateData.title,
        slug: updateData.slug,
        content: updateData.content,
        description: updateData.description,
        isHomepage: updateData.isHomepage,
        isPublished: updateData.isPublished,
        metaTitle: updateData.metaTitle,
        metaDescription: updateData.metaDescription,
        ogImage: updateData.ogImage,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'page',
        action: 'updated',
        metadata: {
          projectId,
          pageId: page.id,
          pageTitle: page.title,
        },
      },
    })

    return NextResponse.json(page)
  } catch (error: any) {
    console.error('Page update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update page' },
      { status: 500 }
    )
  }
}

// DELETE - Delete page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: projectId, pageId } = await params

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const page = await prisma.page.findUnique({
      where: { id: pageId },
    })

    if (!page || page.projectId !== projectId) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Don't allow deleting the homepage if it's the only page
    if (page.isHomepage) {
      const pageCount = await prisma.page.count({
        where: { projectId },
      })

      if (pageCount === 1) {
        return NextResponse.json(
          { error: 'Cannot delete the only page' },
          { status: 400 }
        )
      }
    }

    await prisma.page.delete({
      where: { id: pageId },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'page',
        action: 'deleted',
        metadata: {
          projectId,
          pageId: page.id,
          pageTitle: page.title,
        },
      },
    })

    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (error: any) {
    console.error('Page deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete page' },
      { status: 500 }
    )
  }
}