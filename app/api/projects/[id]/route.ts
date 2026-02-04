// app/api/projects/[id]/route.ts
// ✅ FIXED: Handles async params + BigInt serialization

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to convert BigInt to Number
type ProjectType = {
  id: string
  name: string
  description?: string | null
  html?: string | null
  css?: string | null
  javascript?: string | null
  status?: string | null
  userId: string
  validationScore?: bigint | number | null
  generationTime?: bigint | number | null
  retryCount?: bigint | number | null
  tokensUsed?: bigint | number | null
  createdAt?: Date
  updatedAt?: Date
  // Add any other fields your Project model has
}

function serializeProject(project: ProjectType) {
  return {
    ...project,
    validationScore: project.validationScore ? Number(project.validationScore) : null,
    generationTime: project.generationTime ? Number(project.generationTime) : null,
    retryCount: project.retryCount ? Number(project.retryCount) : null,
    tokensUsed: project.tokensUsed ? Number(project.tokensUsed) : null,
  }
}

// GET - Fetch single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params  // ✅ Await params for Next.js 15
    
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
      where: { id }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // ✅ Convert BigInt to Number before returning
    const serializedProject = serializeProject(project)

    return NextResponse.json({ project: serializedProject })

  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH - Update project (partial)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params  // ✅ Await params
    
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
      where: { id }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, html, css, js, javascript, status } = body

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(html !== undefined && { html }),
        ...(css !== undefined && { css }),
        ...(js !== undefined && { javascript: js }),
        ...(javascript !== undefined && { javascript }),
        ...(status !== undefined && { status }),
        updatedAt: new Date()
      }
    })

    // Log activity
    try {
      await prisma.activity.create({
        data: {
          userId: user.id,
          type: 'project',
          action: 'Project updated',
          metadata: {
            projectId: updatedProject.id,
            projectName: updatedProject.name
          }
        }
      })
    } catch (activityError) {
      // Activity logging is optional, don't fail the request
      console.warn('Failed to log activity:', activityError)
    }

    // ✅ Convert BigInt before returning
    const serializedProject = serializeProject(updatedProject)

    return NextResponse.json({ 
      project: serializedProject,
      message: 'Project updated successfully' 
    })

  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// PUT - Full update (alias for PATCH)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params })
}

// DELETE - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params  // ✅ Await params
    
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
      where: { id }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.project.delete({
      where: { id }
    })

    // Log activity
    try {
      await prisma.activity.create({
        data: {
          userId: user.id,
          type: 'project',
          action: 'Project deleted',
          metadata: {
            projectId: project.id,
            projectName: project.name
          }
        }
      })
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError)
    }

    return NextResponse.json({ 
      message: 'Project deleted successfully' 
    })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}