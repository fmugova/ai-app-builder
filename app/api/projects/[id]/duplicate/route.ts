// API Route: app/api/projects/[id]/duplicate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = id

    // Get the original project
    const originalProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        User: true,
      },
    })

    if (!originalProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (originalProject.User.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create duplicate with "(Copy)" suffix
    const duplicatedProject = await prisma.project.create({
      data: {
        name: `${originalProject.name} (Copy)`,
        description: originalProject.description,
        type: originalProject.type,
        code: originalProject.code,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      project: duplicatedProject,
    })

  } catch (error) {
    console.error('Duplication error:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate project' },
      { status: 500 }
    )
  }
}