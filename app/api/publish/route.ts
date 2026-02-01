import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await req.json()

    // Generate unique slug
    const slug = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const publicUrl = `https://buildflow-ai.app/p/${slug}`

    // Update project with publish info
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publicSlug: slug,
        publicUrl: publicUrl,
      }
    })

    // Return success with redirect URL
    return NextResponse.json({ 
      success: true,
      publicUrl,
      redirectTo: '/dashboard'  // ← Tell frontend to redirect
    })

  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
  }
}
