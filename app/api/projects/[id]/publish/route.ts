import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function isPrismaP2002(e: unknown): boolean {
  return (e as any)?.code === 'P2002'
}

// Next.js 15 RouteContext interface
interface RouteContext {
  params: Promise<{ id: string }>
}

// PUBLISH endpoint
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<any>> {
  const { id: projectId } = await context.params

  try {
    // Get session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 🟡 User-based write rate limit
    const rateLimit = await (await import('@/lib/rate-limit')).checkRateLimit(req, 'write', session.user.id)
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests', remaining: rateLimit.remaining }, { status: 429 })
    }

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
      const baseSlug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40)

      const makeSlug = () => `${baseSlug}-${randomBytes(5).toString('hex')}`
      publicSlug = makeSlug()
    }

    // Generate public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${publicSlug}`

    // Attempt the update; retry once on unique constraint collision
    let updated
    try {
      updated = await prisma.project.update({
        where: { id: projectId },
        data: { isPublished: true, publishedAt: new Date(), publicSlug, publicUrl, updatedAt: new Date() }
      })
    } catch (e) {
      if (isPrismaP2002(e)) {
        publicSlug = `${publicSlug.substring(0, 30)}-${randomBytes(5).toString('hex')}`
        const retryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${publicSlug}`
        updated = await prisma.project.update({
          where: { id: projectId },
          data: { isPublished: true, publishedAt: new Date(), publicSlug, publicUrl: retryUrl, updatedAt: new Date() }
        })
      } else {
        throw e
      }
    }

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
  context: RouteContext
): Promise<NextResponse<any>> {
  const { id: projectId } = await context.params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 🟡 User-based write rate limit
    const rateLimit = await (await import('@/lib/rate-limit')).checkRateLimit(req, 'write', session.user.id)
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests', remaining: rateLimit.remaining }, { status: 429 })
    }

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

    // Update project with unpublish info
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        isPublished: false,
        publishedAt: null,
        publicSlug: null,
        publicUrl: null,
        updatedAt: new Date()
      }
    })

    console.log('✅ Project unpublished:', {
      id: projectId,
      slug: project.publicSlug,
      url: project.publicUrl
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: 'deployment',
        action: 'unpublished',
        metadata: {
          projectId: projectId,
          projectName: project.name,
          publicUrl: project.publicUrl,
          publicSlug: project.publicSlug
        }
      }
    }).catch(err => console.error('Activity log failed:', err))

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
