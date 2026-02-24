// app/api/projects/[id]/publish/netlify/route.ts
// One-click HTML site publishing to Netlify.
// User clicks "Publish Live" → gets a real sharable URL in ~15 seconds.
//
// Requires NETLIFY_TOKEN in .env (get from netlify.com/user/applications).
// On first publish: creates a new Netlify site.
// On subsequent publishes: updates the existing site (same URL).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadProjectFiles } from '@/lib/saveProjectFiles'
import JSZip from 'jszip'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await context.params

  // Verify ownership + load Netlify site ID for re-deploys
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, name: true, publishedSiteId: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const netlifyToken = process.env.NETLIFY_TOKEN
  if (!netlifyToken) {
    return NextResponse.json(
      { error: 'Netlify publishing is not configured on this server.' },
      { status: 501 }
    )
  }

  // Load all saved files from DB
  const files = await loadProjectFiles(projectId)
  const htmlFiles = Object.keys(files).filter((p) => p.endsWith('.html'))

  if (htmlFiles.length === 0) {
    return NextResponse.json(
      { error: 'No HTML files found — generate your site first' },
      { status: 400 }
    )
  }

  // Build ZIP for Netlify
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  // Netlify redirects: allow direct URL access for each page (e.g. /about → about.html)
  zip.file('_redirects', htmlFiles.map((f) => `/${f.replace('.html', '')} /${f} 200`).join('\n'))

  // ArrayBuffer is directly assignable to fetch BodyInit
  const zipBytes = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  try {
    let netlifyRes: Response

    if (project.publishedSiteId) {
      // Re-deploy to existing site — same URL, instant update
      netlifyRes = await fetch(
        `https://api.netlify.com/api/v1/sites/${project.publishedSiteId}/deploys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/zip',
            Authorization: `Bearer ${netlifyToken}`,
          },
          body: zipBytes,
        }
      )
    } else {
      // Create a brand-new Netlify site
      netlifyRes = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/zip',
          Authorization: `Bearer ${netlifyToken}`,
        },
        body: zipBytes,
      })
    }

    if (!netlifyRes.ok) {
      const errText = await netlifyRes.text()
      console.error('[publish/netlify] Netlify API error:', errText)
      return NextResponse.json({ error: 'Publish failed — try again' }, { status: 502 })
    }

    const site = await netlifyRes.json()
    const liveUrl: string = site.ssl_url ?? site.url
    const siteId: string = site.site_id ?? site.id

    // Persist the Netlify site ID + URL so re-publishes update the same site
    await prisma.project.update({
      where: { id: projectId },
      data: {
        publicUrl: liveUrl,
        publishedSiteId: siteId,
        isPublished: true,
        publishedAt: new Date(),
      },
    })

    return NextResponse.json({
      url: liveUrl,
      siteId,
      isUpdate: !!project.publishedSiteId,
    })
  } catch (e) {
    console.error('[publish/netlify] error:', e)
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 })
  }
}
