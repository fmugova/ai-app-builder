import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
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
        userId: true  // ✅ Get the project owner's userId
      }
    })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }
    
    // Store submission with userId
    const submission = await prisma.formSubmission.create({
      data: {
        projectId: siteId,
        userId: project.userId,  // ✅ Add userId from project owner
        type: formType || 'contact',
        data: formData,
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