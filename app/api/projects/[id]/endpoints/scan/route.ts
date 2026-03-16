// app/api/projects/[id]/endpoints/scan/route.ts
// On-demand re-scan of a project's generated files to detect API routes and Server Actions.
// Called from the ApiEndpointsPage when the user clicks "Scan project files".

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { autoDetectAndSaveApiEndpoints } from '@/lib/autoDetectEndpoints'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id, User: { email: session.user.email } },
    select: { id: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  try {
    const count = await autoDetectAndSaveApiEndpoints(project.id)

    // Fetch the freshly-created endpoint records to return to the client
    const endpoints = await prisma.apiEndpoint.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ scanned: count, endpoints })
  } catch (err) {
    console.error('[endpoints/scan] failed:', err)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
