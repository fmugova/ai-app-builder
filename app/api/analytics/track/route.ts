import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { projectId, event, properties } = await request.json()
    
    if (!projectId || !event) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get project to find userId
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Store analytics event
    await prisma.analyticsEvent.create({
      data: {
        userId: project.userId,
        event: event,
        properties: {
          projectId,
          ...properties
        }
      }
    })
    
    // If it's a page view, increment project views counter
    if (event === 'page_view') {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          views: {
            increment: 1
          }
        }
      })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

// CORS for cross-origin requests from published sites
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}