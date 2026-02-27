import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Published sites run in sandboxed iframes (null origin). Allow their fetch calls
// through with a wildcard CORS policy — submissions are public by design.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// POST - Submit form from published site
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit: 10 form submissions per 10 minutes per IP
    const rateLimit = await checkRateLimit(request, 'external')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
      )
    }

    const { id: projectId } = await context.params
    const body = await request.json()

    // Validate project exists and fetch owner email for notification
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true, name: true, User: { select: { email: true } } }
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

    // Email the project owner — fire-and-forget, never block the response
    const ownerEmail = project.User?.email
    if (ownerEmail) {
      const fields = Object.entries(body as Record<string, string>)
        .filter(([k]) => k !== 'formType')
        .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap">${k}</td><td style="padding:6px 12px;color:#6b7280">${v}</td></tr>`)
        .join('')

      sendEmail({
        to: ownerEmail,
        subject: `New form submission on ${project.name}`,
        replyTo: (body as Record<string, string>).email || ownerEmail,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#111827;margin-bottom:4px">New form submission</h2>
            <p style="color:#6b7280;margin-top:0">From your site: <strong>${project.name}</strong></p>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0">
              ${fields}
            </table>
            <p style="font-size:12px;color:#9ca3af">
              View all submissions at
              <a href="https://buildflow-ai.app/dashboard/projects/${project.id}/submissions" style="color:#6366f1">
                buildflow-ai.app
              </a>
            </p>
          </div>`,
      }).catch(() => { /* non-fatal */ })
    }

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully',
      submissionId: submission.id
    }, { headers: CORS_HEADERS })

  } catch (error: unknown) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit form' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// GET - Retrieve form submissions for a project (requires ownership)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params

    // Verify user owns this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Get submissions for owned project
    const submissions = await prisma.formSubmission.findMany({
      where: { projectId },
      orderBy: { submittedAt: 'desc' },
      take: 100
    })

    return NextResponse.json({
      submissions,
      total: submissions.length
    })

  } catch (error: unknown) {
    console.error('Get submissions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get submissions' },
      { status: 500 }
    )
  }
}