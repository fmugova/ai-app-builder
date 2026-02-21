// app/api/projects/[id]/files/route.ts
// Returns the flat file tree for a project (used by WebContainer Fast Preview)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Ownership check
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const rows = await (prisma.projectFile as any).findMany({
      where: { projectId: id },
      select: { path: true, content: true },
      orderBy: { path: 'asc' },
    })

    const files: Record<string, string> = {}
    for (const row of rows ?? []) {
      if (row.path && row.content != null) files[row.path] = row.content
    }

    return NextResponse.json({ id, files, count: Object.keys(files).length })
  } catch (error) {
    console.error('Project files fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch project files' }, { status: 500 })
  }
}
