// app/api/projects/[id]/route.ts
// ✅ FIXED: Handles async params in Next.js 15+

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ params is a Promise in Next.js 15+
) {
  try {
    const { id } = await params  // ✅ Await params first
    
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
      where: { id }  // ✅ Use id, not params.id
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ project })

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
  { params }: { params: Promise<{ id: string }> }  // ✅ params is a Promise
) {
  try {
    const { id } = await params  // ✅ Await params first
    
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
      where: { id }  // ✅ Use id, not params.id
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, html, css, js, status } = body

    const updatedProject = await prisma.project.update({
      where: { id },  // ✅ Use id, not params.id
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(html !== undefined && { html }),
        ...(css !== undefined && { css }),
        ...(js !== undefined && { js }),
        ...(status !== undefined && { status }),
        updatedAt: new Date()
      }
    })

    // Log activity
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

    return NextResponse.json({ 
      project: convertBigInt(updatedProject),
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
  { params }: { params: Promise<{ id: string }> }  // ✅ params is a Promise
) {
  return PATCH(request, { params })
}

// DELETE - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ params is a Promise
) {
  try {
    const { id } = await params  // ✅ Await params first
    
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
      where: { id }  // ✅ Use id, not params.id
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.project.delete({
      where: { id }  // ✅ Use id, not params.id
    })

    // Log activity
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

function convertBigInt(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(convertBigInt)
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : convertBigInt(v)])
    )
  }
  return obj
}