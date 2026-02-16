import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const

function corsJson(data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, { ...init, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and beacon requests
    let body;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Handle sendBeacon which sends as text/plain
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return corsJson({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
    }

    const { projectId, event, properties } = body;

    if (!projectId || !event) {
      return corsJson({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get project to find userId
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    })

    if (!project) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
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
          views: { increment: 1 }
        }
      })
    }

    return corsJson({ success: true })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    return corsJson({ error: 'Failed to track event' }, { status: 500 })
  }
}

// CORS preflight for cross-origin requests from preview iframes / published sites
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
