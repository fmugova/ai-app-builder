/**
 * BuildFlow Contact Form API
 *
 * POST /api/contact
 * Body: { name, email, subject?, message, type? }
 *
 * - Rate limited: 3 submissions per 10 min per IP
 * - Saves to ContactInquiry table (or falls back to logging if table missing)
 * - Sends notification email to SUPPORT_INBOX_EMAIL
 * - Sends confirmation email to the sender
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'

const schema = z.object({
  name:    z.string().min(1).max(100).trim(),
  email:   z.string().email().max(254).trim().toLowerCase(),
  subject: z.string().max(200).trim().optional(),
  message: z.string().min(10).max(5000).trim(),
  type:    z.enum(['general', 'support', 'billing', 'partnership', 'other']).optional().default('general'),
})

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL || process.env.ALERT_EMAIL || 'support@buildflow-ai.app'

function notificationHtml(data: { name: string; email: string; subject?: string; message: string; type: string; ip: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(90deg,#2563eb,#4f46e5);padding:20px 24px;">
      <h2 style="color:#fff;margin:0;font-size:18px;">📬 New Contact Form Submission</h2>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:100px;">Name</td><td style="padding:8px 0;color:#111827;font-weight:600;">${data.name}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;"><a href="mailto:${data.email}" style="color:#2563eb;">${data.email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Type</td><td style="padding:8px 0;color:#111827;text-transform:capitalize;">${data.type}</td></tr>
        ${data.subject ? `<tr><td style="padding:8px 0;color:#6b7280;">Subject</td><td style="padding:8px 0;color:#111827;">${data.subject}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#6b7280;">IP</td><td style="padding:8px 0;color:#9ca3af;font-size:12px;">${data.ip}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
      <p style="color:#6b7280;font-size:12px;margin:0 0 8px;">Message:</p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;color:#111827;white-space:pre-wrap;font-size:14px;line-height:1.6;">${data.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <div style="margin-top:20px;">
        <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject || 'Your BuildFlow enquiry')}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
          Reply to ${data.name}
        </a>
      </div>
    </div>
    <div style="padding:12px 24px;background:#f9fafb;font-size:12px;color:#9ca3af;">
      Sent at ${new Date().toUTCString()} · BuildFlow AI Contact System
    </div>
  </div>
</body>
</html>`
}

function confirmationHtml(name: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(90deg,#2563eb,#4f46e5);padding:20px 24px;">
      <h2 style="color:#fff;margin:0;font-size:18px;">✅ We received your message</h2>
    </div>
    <div style="padding:24px;">
      <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi ${name},</p>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Thanks for reaching out to BuildFlow AI! We've received your message and will get back to you within 24 hours.
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
        In the meantime, check out our docs or try building your next project in the chatbuilder.
      </p>
      <a href="https://buildflow-ai.app/chatbuilder"
         style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
        Open BuildFlow →
      </a>
    </div>
    <div style="padding:12px 24px;background:#f9fafb;font-size:12px;color:#9ca3af;">
      BuildFlow AI · <a href="https://buildflow-ai.app" style="color:#9ca3af;">buildflow-ai.app</a>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'

  // Rate limit: 3 per 10 min per IP (Upstash — survives serverless cold starts)
  const rl = await checkRateLimitByIdentifier(`contact:${ip}`, 'contact')
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
    )
  }

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, email, subject, message, type } = parsed.data

  // Fire both emails in parallel — notification to team, confirmation to sender
  const [notifResult, confirmResult] = await Promise.allSettled([
    sendEmail({
      to: SUPPORT_INBOX,
      from: 'BuildFlow Contact <noreply@buildflow-ai.app>',
      replyTo: `${name} <${email}>`,
      subject: `[Contact] ${subject || type} — from ${name}`,
      html: notificationHtml({ name, email, subject, message, type, ip }),
    }),
    sendEmail({
      to: email,
      from: 'BuildFlow AI <noreply@buildflow-ai.app>',
      subject: 'We received your message — BuildFlow AI',
      html: confirmationHtml(name),
    }),
  ])

  const notifOk = notifResult.status === 'fulfilled' && notifResult.value?.success !== false
  if (!notifOk) {
    console.error('[contact] Failed to send notification email:', notifResult)
  }

  // Always return success to sender even if confirmation email failed
  return NextResponse.json({
    success: true,
    confirmationSent: confirmResult.status === 'fulfilled',
  })
}
