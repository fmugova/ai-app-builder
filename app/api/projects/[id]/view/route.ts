export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const userIsAdmin = isAdmin(session.user.email)

    // Fetch project — include User.email only to verify ownership, never expose it
    const project = await prisma.project.findUnique({
      where: { id: id as string },
      include: {
        User: {
          select: {
            name: true,
            email: true   // used only for ownership check below, stripped from response
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check access before returning any data
    const userHasAccess =
      project.User.email === session.user.email ||
      userIsAdmin

    if (!userHasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Strip internal User.email from the response
    const { User, ...projectData } = project
    return NextResponse.json({ ...projectData, User: { name: User.name } })
  } catch (error) {
    console.error('Project view error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}