// app/api/public/email/[projectId]/route.ts
// Public email proxy for generated sites.
// Sends an email via the configured provider (Resend) to the project owner,
// and stores the submission in FormSubmission for the dashboard inbox.
// Rate-limited to 10 requests per hour per IP.
//
// POST /api/public/email/[projectId]
//   Body: { subject, message, from?, name?, formType? }

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email-service'

export const runtime = 'nodejs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function corsJson(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) },
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const rl = await checkRateLimit(request, 'external')
    if (!rl.success) {
      return corsJson({ error: 'Too many requests. Please try again later.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) },
      })
    }

    const { projectId } = await context.params

    // Look up project and owner email
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        User: { select: { id: true, email: true } },
      },
    })
    if (!project) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
    }

    const ownerEmail = project.User?.email
    if (!ownerEmail) {
      return corsJson({ error: 'Project owner not found' }, { status: 404 })
    }

    let body: {
      subject?: string
      message?: string
      from?: string
      name?: string
      formType?: string
    }
    try {
      body = await request.json()
    } catch {
      return corsJson({ error: 'Invalid JSON' }, { status: 400 })
    }

    const subject = (body.subject || 'New form submission').slice(0, 200)
    const message = (body.message || '').slice(0, 10_000)
    const fromName = (body.name || 'Anonymous').slice(0, 100)
    const fromEmail = (body.from || '').slice(0, 200)
    const formType = (body.formType || 'contact').slice(0, 64)

    if (!message.trim()) {
      return corsJson({ error: 'message is required' }, { status: 400 })
    }

    const replyTo = fromEmail || undefined

    // Send email to project owner
    await sendEmail({
      to: ownerEmail,
      subject: `[${project.name}] ${subject}`,
      replyTo,
      html: `
        <p><strong>From:</strong> ${fromName}${fromEmail ? ` &lt;${fromEmail}&gt;` : ''}</p>
        <p><strong>Project:</strong> ${project.name}</p>
        <hr/>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
      text: `From: ${fromName}${fromEmail ? ` <${fromEmail}>` : ''}\nProject: ${project.name}\n\n${message}`,
    })

    // Store submission in FormSubmission for dashboard inbox
    await prisma.formSubmission.create({
      data: {
        projectId,
        userId: project.User!.id,
        type: formType,
        data: { subject, message, from: fromEmail, name: fromName },
      },
    })

    return corsJson({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[public/email] POST error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}
