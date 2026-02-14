// app/api/projects/[id]/endpoints/[endpointId]/test/route.ts
// Test an API endpoint by making a real HTTP request to it

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Resolve the base URL for internal requests
function getBaseUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL?.split(',')[0].trim() ||
    'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; endpointId: string }> }) {
  try {
    const { id, endpointId } = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const endpoint = await prisma.apiEndpoint.findFirst({
      where: {
        id: endpointId,
        Project: {
          id,
          User: { email: session.user.email },
        },
      },
    })
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }

    // Read optional test data supplied by the client UI
    let testHeaders: Record<string, string> = {}
    let testBody: unknown = undefined
    try {
      const body = await req.json()
      testHeaders = body.headers ?? {}
      testBody = body.body ?? undefined
    } catch {
      // No body — fine for GET requests
    }

    // Build real HTTP request to the endpoint
    const url = `${getBaseUrl()}${endpoint.path}`
    const fetchInit: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...testHeaders,
      },
    }
    if (testBody !== undefined && endpoint.method !== 'GET' && endpoint.method !== 'HEAD') {
      fetchInit.body = JSON.stringify(testBody)
    }

    const startTime = Date.now()
    let testResult: {
      success: boolean
      status: number
      response: unknown
      duration: number
      error?: string
    }

    try {
      const response = await fetch(url, fetchInit)
      const duration = Date.now() - startTime

      // Parse response body
      let responseBody: unknown
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        try { responseBody = await response.json() }
        catch { responseBody = await response.text() }
      } else {
        responseBody = await response.text()
      }

      testResult = {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        response: responseBody,
        duration,
      }
    } catch (fetchError) {
      // Network-level failure (endpoint not yet deployed, etc.)
      testResult = {
        success: false,
        status: 0,
        response: null,
        duration: Date.now() - startTime,
        error:
          fetchError instanceof Error
            ? fetchError.message
            : 'Network error — endpoint may not be deployed yet',
      }
    }

    // Persist real test result
    await prisma.apiEndpoint.update({
      where: { id: endpointId },
      data: {
        testsPassed: testResult.success,
        lastTested: new Date(),
      },
    })

    return NextResponse.json({ testResult })
  } catch (error: unknown) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ error: 'Failed to test endpoint' }, { status: 500 })
  }
}
