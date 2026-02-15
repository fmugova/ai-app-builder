/**
 * Serves individual pages of a published multi-page site.
 *
 * /p/my-site/about      → serves the "about" page HTML
 * /p/my-site/contact    → serves the "contact" page HTML
 *
 * Navigation links between pages are rewritten to use real URLs so the user
 * can bookmark, share, and navigate naturally.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://buildflow-ai.app'

function buildBanner(siteSlug: string, creatorName: string | null, siteName: string): string {
  return `<style>
  .__bf-banner{position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#2563eb,#4f46e5);color:#fff;padding:6px 16px;font-family:system-ui,sans-serif;font-size:13px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,.25);}
  .__bf-banner a{color:#bfdbfe;text-decoration:none;}
  .__bf-banner a:hover{text-decoration:underline;}
  .__bf-banner-cta{background:rgba(255,255,255,.2);border-radius:6px;padding:3px 10px;font-size:11px;white-space:nowrap;}
  .__bf-banner-cta:hover{background:rgba(255,255,255,.3)!important;}
  body{padding-top:38px!important;}
</style>
<div class="__bf-banner">
  <span>⚡ Built with <a href="${BASE_URL}" target="_blank" rel="noopener noreferrer">BuildFlow AI</a>${creatorName ? ` &nbsp;·&nbsp; ${creatorName}` : ''}</span>
  <a class="__bf-banner-cta" href="${BASE_URL}" target="_blank" rel="noopener noreferrer">Create Your Own →</a>
</div>`
}

function rewritePageLinks(html: string, siteSlug: string, pages: { slug: string; isHomepage: boolean }[]): string {
  // Map "about.html" or "about" href patterns → /p/siteSlug/about
  for (const page of pages) {
    const publicUrl = page.isHomepage
      ? `/p/${siteSlug}`
      : `/p/${siteSlug}/${page.slug}`

    // Match href="about.html", href="./about.html", href="about"
    const patterns = [
      new RegExp(`href="${page.slug}\\.html"`, 'gi'),
      new RegExp(`href="\\./${page.slug}\\.html"`, 'gi'),
      new RegExp(`href="${page.slug}"`, 'gi'),
    ]
    for (const pat of patterns) {
      html = html.replace(pat, `href="${publicUrl}"`)
    }
    // Same for index.html → homepage
    if (!page.isHomepage) continue
    html = html
      .replace(/href="index\.html"/gi, `href="/p/${siteSlug}"`)
      .replace(/href="\.\/index\.html"/gi, `href="/p/${siteSlug}"`)
  }
  return html
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; page: string[] }> }
) {
  const { slug, page: pageParts } = await params
  const pageSlug = pageParts.join('/') // support nested paths if ever needed

  type PageRow = {
    id: string; slug: string; title: string; content: string;
    isHomepage: boolean; metaTitle: string | null; metaDescription: string | null;
  }
  type ProjectWithPages = {
    id: string; name: string; code: string; publicSlug: string | null;
    User: { name: string | null } | null;
    pages: PageRow[];
  }

  const project = await (prisma.project.findFirst as (args: unknown) => Promise<ProjectWithPages | null>)({
    where: { publicSlug: slug, isPublished: true, publishedAt: { not: null } },
    include: {
      User: { select: { name: true } },
      pages: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        select: {
          id: true, slug: true, title: true, content: true,
          isHomepage: true, metaTitle: true, metaDescription: true,
        },
      },
    },
  })

  if (!project) {
    return new NextResponse('Site not found', { status: 404 })
  }

  const pages = project.pages ?? []

  if (!pages || pages.length === 0) {
    // Fall back: single-page site accessed via this route → redirect to /p/[slug]
    return NextResponse.redirect(`${BASE_URL}/p/${slug}`)
  }

  const pageData = pages.find(p => p.slug === pageSlug)
  if (!pageData) {
    return new NextResponse('Page not found', { status: 404 })
  }

  const banner = buildBanner(slug, project.User?.name ?? null, project.name)
  let html = rewritePageLinks(pageData.content, slug, pages)

  const hasFullHTML = /<!doctype|<html/i.test(html)

  if (hasFullHTML) {
    html = html
      .replace(/<head>/i, `<head>\n${banner}`)
      .replace(/(<body[^>]*>)/i, `$1\n`)
  } else {
    const title = pageData.metaTitle || pageData.title || project.name
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${project.name}</title>
  ${pageData.metaDescription ? `<meta name="description" content="${pageData.metaDescription}">` : ''}
  ${banner}
</head>
<body>
  ${html}
</body>
</html>`
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
