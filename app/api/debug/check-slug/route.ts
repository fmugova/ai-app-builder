import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
