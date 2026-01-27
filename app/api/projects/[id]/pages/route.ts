import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List all pages for a project
import type { Session } from 'next-auth'

async function getUserFromSession(session: Session | null) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = await getUserFromSession(session)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const { id: projectId } = await params
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
    // Get all pages for this project
    const pages = await prisma.page.findMany({
      where: { projectId },
      orderBy: [
        { isHomepage: 'desc' }, // Homepage first
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    })
    return NextResponse.json(pages)
  } catch (error: unknown) {
    console.error('Pages fetch error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to fetch pages';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// POST - Create a new page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = await getUserFromSession(session)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const { id: projectId } = await params
    const { title, slug, content, description, isHomepage, metaTitle, metaDescription } = await request.json()
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
    // If setting as homepage, unset other homepage
    if (isHomepage) {
      await prisma.page.updateMany({
        where: { projectId, isHomepage: true },
        data: { isHomepage: false },
      })
    }
    // Create the page
    const page = await prisma.page.create({
      data: {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        content: content || '',
        description,
        isHomepage: isHomepage || false,
        metaTitle,
        metaDescription,
        projectId,
      },
    })
    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'page',
        action: 'created',
        metadata: {
          projectId,
          pageId: page.id,
          pageTitle: page.title,
        },
      },
    })
    return NextResponse.json(page)
  } catch (error: unknown) {
    console.error('Page creation error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create page';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}