// app/api/sites/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface SlugParamContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _request: NextRequest,
  context: SlugParamContext
) {
  try {
    const { slug } = await context.params

    type PageRow = { slug: string; title: string; content: string; isHomepage: boolean }
    type FileRow = { path: string; content: string }
    type ProjectWithPages = {
      id: string; name: string; code: string; type: string; createdAt: Date;
      User: { name: string | null } | null;
      Page: PageRow[];
      ProjectFile: FileRow[];
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
        ProjectFile: {
          select: { path: true, content: true },
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

    // Fallback for multi-file (fullstack) projects where code field is empty:
    // try index.html from ProjectFile, then show a "live server required" message
    if (!code) {
      const files = project.ProjectFile ?? []
      const indexHtml = files.find(f => f.path === 'index.html' || f.path === 'public/index.html')
      if (indexHtml) {
        code = indexHtml.content
      } else if (files.length > 0) {
        code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${project.name}</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{background:#fff;border-radius:12px;padding:40px;max-width:480px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:700;color:#1e293b;margin:0 0 8px}p{color:#64748b;margin:0 0 24px;line-height:1.6}.badge{display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;border-radius:8px;padding:8px 16px;font-size:13px;color:#475569}</style></head><body><div class="card"><div class="icon">⚡</div><h1>${project.name}</h1><p>This is a full-stack Next.js application that requires a live server to run.</p><div class="badge">📦 ${files.length} files generated — deploy to Vercel to view live</div></div></body></html>`
      }
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
