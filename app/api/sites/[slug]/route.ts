// app/api/sites/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface SlugParamContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  request: NextRequest,
  context: SlugParamContext
) {
  try {
    const { slug } = await context.params

    const project = await prisma.project.findFirst({
      where: {
        publicSlug: slug,
        isPublished: true,
        publishedAt: { not: null }  // ✅ Correct camelCase!
      },
      include: {
        User: {
          select: {
            name: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.type,
      createdAt: project.createdAt,
      User: project.User
    })

  } catch (error) {
    console.error('Site fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to load site' },
      { status: 500 }
    )
  }
}
