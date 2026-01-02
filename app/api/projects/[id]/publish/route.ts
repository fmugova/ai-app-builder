import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Publish project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    const project = await prisma.project.findFirst({
      where: {
        id,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate public URL if not exists
    const publicUrl = project.publicUrl || `https://buildflow-ai.app/p/${id}`

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        isPublished: true,
        publicUrl,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'project',
        action: 'published',
        metadata: {
          projectId: project.id,
          projectName: project.name,
        },
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error: any) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to publish project' },
      { status: 500 }
    )
  }
}

// DELETE - Unpublish project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    const project = await prisma.project.findFirst({
      where: {
        id,
        ...(user.role !== 'admin' && { userId: user.id }),
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        isPublished: false,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'project',
        action: 'unpublished',
        metadata: {
          projectId: project.id,
          projectName: project.name,
        },
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error: any) {
    console.error('Unpublish error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to unpublish project' },
      { status: 500 }
    )
  }
}
