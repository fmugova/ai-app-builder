
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET single project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Project fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// UPDATE project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, code, type } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update project
    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name: name || existingProject.name,
        description: description !== undefined ? description : existingProject.description,
        code: code || existingProject.code,
        type: type || existingProject.type,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'project',
        action: 'updated',
        metadata: {
          projectId: project.id,
          projectName: project.name
        }
      }
    })

    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Project update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verify ownership before deletion
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'project',
        action: 'deleted',
        metadata: {
          projectId: project.id,
          projectName: project.name
        }
      }
    })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error: any) {
    console.error('Project deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete project' },
      { status: 500 }
    )
  }
}