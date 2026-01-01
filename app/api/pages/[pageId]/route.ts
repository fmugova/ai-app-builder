import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: Get single page
export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const page = await prisma.page.findFirst({
      where: {
        id: params.pageId,
        Project: {
          User: {
            email: session.user.email
          }
        }
      }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ page })

  } catch (error: any) {
    console.error('Page GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

// PATCH: Update page
export async function PATCH(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, content, title, description, isHome, published } = body

    // Verify ownership
    const existingPage = await prisma.page.findFirst({
      where: {
        id: params.pageId,
        Project: {
          User: {
            email: session.user.email
          }
        }
      }
    })

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // If setting as home, unset other home pages
    if (isHome && !existingPage.isHome) {
      await prisma.page.updateMany({
        where: { 
          projectId: existingPage.projectId,
          isHome: true 
        },
        data: { isHome: false }
      })
    }

    const page = await prisma.page.update({
      where: { id: params.pageId },
      data: {
        ...(name && { name }),
        ...(slug && { slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') }),
        ...(content && { content }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isHome !== undefined && { isHome }),
        ...(published !== undefined && { published })
      }
    })

    return NextResponse.json({ page })

  } catch (error: any) {
    console.error('Page PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    )
  }
}

// DELETE: Delete page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const page = await prisma.page.findFirst({
      where: {
        id: params.pageId,
        Project: {
          User: {
            email: session.user.email
          }
        }
      }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    await prisma.page.delete({
      where: { id: params.pageId }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Page DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    )
  }
}