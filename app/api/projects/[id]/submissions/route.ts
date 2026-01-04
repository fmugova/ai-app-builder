import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Submit form from published site
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Create form submission
    const submission = await prisma.formSubmission.create({
      data: {
        projectId: project.id,
        userId: project.userId,
        type: body.formType || 'contact',
        data: body,
        read: false
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: project.userId,
        type: 'form_submission',
        action: 'Form submitted',
        metadata: {
          projectId: project.id,
          formType: body.formType || 'contact',
          submissionId: submission.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully',
      submissionId: submission.id
    })

  } catch (error: any) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit form' },
      { status: 500 }
    )
  }
}

// GET - Retrieve form submissions for a project (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // Get submissions
    const submissions = await prisma.formSubmission.findMany({
      where: { projectId },
      orderBy: { submittedAt: 'desc' },
      take: 100
    })

    return NextResponse.json({
      submissions,
      total: submissions.length
    })

  } catch (error: any) {
    console.error('Get submissions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get submissions' },
      { status: 500 }
    )
  }
}