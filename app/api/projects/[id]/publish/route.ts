
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Generate unique public slug if not exists
    let publicSlug = project.publicSlug
    
    if (!publicSlug) {
      // Create slug from project name + random ID
      const baseSlug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) // Max 50 chars
      
      // Add random suffix for uniqueness
      publicSlug = `${baseSlug}-${nanoid(8)}`
      
      // Check for collisions (unlikely but possible)
      const existing = await prisma.project.findFirst({
        where: { publicSlug }
      })
      
      if (existing) {
        // Regenerate with different suffix
        publicSlug = `${baseSlug}-${nanoid(12)}`
      }
    }

    // Generate public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${publicSlug}`

    // Update project with publish info
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publicSlug: publicSlug,
        publicUrl: publicUrl,
        updatedAt: new Date()
      }
    })

    console.log('✅ Project published:', {
      id: projectId,
      slug: publicSlug,
      url: publicUrl
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: 'deployment',
        action: 'published',
        metadata: {
          projectId: projectId,
          projectName: project.name,
          publicUrl: publicUrl,
          publicSlug: publicSlug
        }
      }
    }).catch(err => console.error('Activity log failed:', err))

    return NextResponse.json({
      success: true,
      project: updated,
      publicUrl: publicUrl,
      publicSlug: publicSlug,
      message: 'Project published successfully!'
    })

  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: 'Failed to publish project' },
      { status: 500 }
    )
  }
}

// UNPUBLISH endpoint
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    // Check ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Unpublish project
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isPublished: false,
        updatedAt: new Date()
      }
    })

    console.log('✅ Project unpublished:', projectId)

    return NextResponse.json({
      success: true,
      project: updated,
      message: 'Project unpublished successfully!'
    })

  } catch (error) {
    console.error('Unpublish error:', error)
    return NextResponse.json(
      { error: 'Failed to unpublish project' },
      { status: 500 }
    )
  }
}
