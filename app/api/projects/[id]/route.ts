import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET single project
export const GET = withAuth(async (req, context, session) => {
  try {
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id
      },
      include: {
        pages: true,
        customDomains: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
})

// UPDATE project
export const PATCH = withAuth(async (req, context, session) => {
  try {
    const body = await req.json()

    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Update project
    const updated = await prisma.project.update({
      where: { id: context.params.id },
      data: body
    })

    return NextResponse.json({ success: true, project: updated })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
})

// DELETE project
export const DELETE = withAuth(async (req, context, session) => {
  try {
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete project
    await prisma.project.delete({
      where: { id: context.params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
})