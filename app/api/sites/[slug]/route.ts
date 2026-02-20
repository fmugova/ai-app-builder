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

    type PageRow = { slug: string; title: string; content: string; isHomepage: boolean }
    type ProjectWithPages = {
      id: string; name: string; code: string; type: string; createdAt: Date;
      User: { name: string | null } | null;
      Page: PageRow[];
    }

    const project = await (prisma.project.findFirst as (args: unknown) => Promise<ProjectWithPages | null>)({
      where: {
        publicSlug: slug,
        isPublished: true,
        publishedAt: { not: null }
      },
      include: {
        User: { select: { name: true } },
        Page: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          select: { slug: true, title: true, content: true, isHomepage: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    const pages = project.Page ?? []
    const isMultiPage = pages.length > 1

    // For multi-page: serve the homepage page's content as the root code
    let code = project.code
    if (isMultiPage) {
      const homepage = pages.find(p => p.isHomepage) || pages[0]
      if (homepage) code = homepage.content
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      code,
      type: project.type,
      isMultiPage,
      createdAt: project.createdAt,
      User: project.User,
    })

  } catch (error) {
    console.error('Site fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to load site' },
      { status: 500 }
    )
  }
}
