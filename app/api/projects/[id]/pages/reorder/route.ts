import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Reorder pages
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
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { pages } = body

    // Validate request body
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'Invalid pages array' }, { status: 400 })
    }

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

    // Update order for each page
    await Promise.all(
      pages.map((page: { id: string; order: number }) =>
        prisma.page.update({
          where: { id: page.id },
          data: { order: page.order },
        })
      )
    )

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'page',
        action: 'reordered',
        metadata: {
          projectId,
          pageCount: pages.length,
        },
      },
    })

    return NextResponse.json({ message: 'Navigation order updated successfully' })
  } catch (error: unknown) {
    console.error('Reorder error:', error)
    let errorMessage = 'Failed to reorder pages'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}