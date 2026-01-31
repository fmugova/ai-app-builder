import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting by IP to prevent spam
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = checkRateLimit(`form:${ip}`, { maxRequests: 5, windowMs: 60000 }) // 5 per minute
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { 
          error: 'Too many form submissions. Please try again later.',
          resetIn 
        },
        { status: 429 }
      )
    }

    const { siteId, formType, formData } = await request.json()
    
    // Validate
    if (!siteId || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Find project and get userId
    const project = await prisma.project.findUnique({
      where: { id: siteId },
      select: { 
        id: true,
        userId: true
      }
    })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }
    
    // ✅ Use relation syntax with connect
const submission = await prisma.formSubmission.create({
  data: {
    type: formType || 'contact',  // ✅ Correct field name
    data: formData,
    read: false,  // ✅ Add this required field
    Project: {
      connect: { id: siteId }
    },
    User: {
      connect: { id: project.userId }
    }
  }
})
    
    return NextResponse.json({ 
      success: true, 
      submissionId: submission.id 
    })
    
  } catch (error: any) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit form',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

// CORS for cross-origin requests
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
