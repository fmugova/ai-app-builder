import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Restrict to authenticated admins only – this is a debug/internal endpoint
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    select: { role: true },
  })
  if (user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter required' }, { status: 400 })
    }

    // Check if project exists with this slug
    const project = await prisma.project.findFirst({
      where: {
        publicSlug: slug
      },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!project) {
      return NextResponse.json({
        found: false,
        message: 'No project found with this slug',
        slug
      })
    }

    return NextResponse.json({
      found: true,
      project,
      issues: {
        missingPublishedFlag: !project.isPublished,
        missingPublishedAt: !project.publishedAt,
        canAccess: project.isPublished && project.publishedAt !== null
      }
    })

  } catch (error) {
    console.error('Debug check error:', error)
    return NextResponse.json(
      { error: 'Failed to check slug', details: String(error) },
      { status: 500 }
    )
  }
}
