import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware' // ✅ Correct import
import { nanoid } from 'nanoid'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET single project
export const GET = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  session: { user: { id: string } }
) => {
  try {
    const { id } = await context.params;
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
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
    console.error('GET project error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
})

// PUBLISH project (PUT method)
export const PUT = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  session: { user: { id: string; email: string } }
) => {
  try {
    const { id } = await context.params;
    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Generate publicSlug if not exists
    let publicSlug = project.publicSlug
    if (!publicSlug) {
      const baseSlug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50)
      publicSlug = `${baseSlug}-${nanoid(8)}`
      // Check for collisions (unlikely)
      const existing = await prisma.project.findFirst({ where: { publicSlug } })
      if (existing) {
        publicSlug = `${baseSlug}-${nanoid(12)}`
      }
    }

    // Generate publicUrl with the slug
    const publicUrl = `https://buildflow-ai.app/p/${publicSlug}`

    const updatedProject = await prisma.project.update({
      where: { id: id as string },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publicSlug: publicSlug,
        publicUrl: publicUrl,
        updatedAt: new Date()
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: 'project',
        action: 'published',
        metadata: {
          projectId: project.id,
          projectName: project.name,
          publicUrl: publicUrl,
          publicSlug: publicSlug
        },
      },
    })

    return NextResponse.json({
      success: true,
      project: updatedProject,
      publicUrl: publicUrl,
      publicSlug: publicSlug
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: 'Failed to publish project' },
      { status: 500 }
    )
  }
})

// UPDATE project (PATCH method - partial updates)
export const PATCH = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  session: { user: { id: string } }
) => {
  try {
    const body = await req.json()

    // Check ownership
    const { id } = await context.params;
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // ✅ SANITIZE: Only allow valid fields
    const allowedFields = {
      name: body.name,
      code: body.code,
      description: body.description,
      type: body.type,
      framework: body.framework,
      language: body.language,
      prompt: body.prompt,
      tags: body.tags,
      isPublished: body.published !== undefined ? body.published : body.isPublished,
      publishedAt: body.published ? new Date() : body.publishedAt,
      updatedAt: new Date()
    }

    // ✅ Remove undefined/null values
    const dataToUpdate = Object.fromEntries(
      Object.entries(allowedFields).filter(([, value]) => value !== undefined && value !== null)
    )

    // Update project with sanitized data
    const updated = await prisma.project.update({
      where: { id: id as string },
      data: dataToUpdate
    })

    console.log('✅ Project updated via PATCH:', id)
    
    return NextResponse.json({ success: true, project: updated })
  } catch (error) {
    console.error('PATCH project error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
})

// DELETE project
export const DELETE = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  session: { user: { id: string } }
) => {
  try {
    // Check ownership
    const { id } = await context.params;
    const project = await prisma.project.findFirst({
      where: {
        id,
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
      where: { id: id as string }
    })

    console.log('✅ Project deleted:', id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE project error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
})