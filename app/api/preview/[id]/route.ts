// app/api/preview/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        html: true,
        css: true,
        userId: true,
        code: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Construct complete HTML
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name || 'Preview'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${project.css || ''}
  </style>
</head>
<body>
  ${project.html || '<p style="padding: 20px; color: #666;">No content yet</p>'}
  <script>
    ${project.code || ''}
  </script>
</body>
</html>`

    return new NextResponse(fullHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, max-age=0'
      }
    })

  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Failed to load preview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
