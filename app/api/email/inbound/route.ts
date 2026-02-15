/**
 * Resend Inbound Email Webhook
 *
 * When someone emails support@buildflow-ai.app (or any @buildflow-ai.app address),
 * Resend forwards the email as a POST to this endpoint.
 *
 * Setup in Resend dashboard:
 *  1. Domains → buildflow-ai.app → Inbound → Enable
 *  2. Add MX record: MX 10 inbound.resend.com (see EMAIL_DNS_SETUP.md)
 *  3. Inbound Routes → Add route:
 *     Pattern: support@buildflow-ai.app (or *@buildflow-ai.app for all)
 *     Webhook URL: https://buildflow-ai.app/api/email/inbound
 *
 * Resend signs the request with RESEND_WEBHOOK_SECRET (same as stripe pattern).
 * This handler:
 *  - Verifies the signature
 *  - Logs to console / Sentry
 *  - Forwards to SUPPORT_INBOX_EMAIL via Resend (acts as forwarder)
 *  - Can be extended to create a support ticket, notify Slack, etc.
 *
 * Docs: https://resend.com/docs/dashboard/emails/inbound-emails
 */
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL
  || process.env.ALERT_EMAIL
  || 'support@buildflow-ai.app'

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}

interface ResendInboundPayload {
  type: string
  data: {
    from: string
    to: string[]
    subject: string
    html?: string
    text?: string
    attachments?: { filename: string; contentType: string; size: number }[]
    headers?: Record<string, string>
    messageId?: string
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verify webhook signature if secret is configured
  if (WEBHOOK_SECRET) {
    const sig = req.headers.get('resend-signature')
      || req.headers.get('svix-signature')
      || req.headers.get('x-resend-signature')

    if (!verifySignature(rawBody, sig, WEBHOOK_SECRET)) {
      console.warn('[inbound-email] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: ResendInboundPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.type !== 'email.received') {
    // Ack unknown event types without error
    return NextResponse.json({ received: true })
  }

  const { from, to, subject, html, text, attachments = [], messageId } = payload.data
  const toAddresses = to.join(', ')

  console.log(`[inbound-email] Received: "${subject}" from ${from} → ${toAddresses}`)

  const attachmentNote = attachments.length > 0
    ? `<p style="color:#6b7280;font-size:13px;margin-top:16px;">
        📎 ${attachments.length} attachment(s): ${attachments.map(a => `${a.filename} (${Math.round(a.size / 1024)}KB)`).join(', ')}
       </p>`
    : ''

  // Forward to your actual inbox
  await sendEmail({
    to: SUPPORT_INBOX,
    from: 'BuildFlow Inbound <noreply@buildflow-ai.app>',
    replyTo: from,
    subject: `[Inbound] ${subject || '(no subject)'}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:#1e293b;padding:16px 24px;display:flex;align-items:center;gap:12px;">
      <span style="background:#3b82f6;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;">INBOUND</span>
      <span style="color:#94a3b8;font-size:13px;">Forwarded from ${toAddresses}</span>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:4px 0;width:60px;color:#9ca3af;">From</td><td style="padding:4px 0;font-weight:500;">${from}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;">To</td><td style="padding:4px 0;">${toAddresses}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;">Subject</td><td style="padding:4px 0;font-weight:500;">${subject || '(no subject)'}</td></tr>
        ${messageId ? `<tr><td style="padding:4px 0;color:#9ca3af;">ID</td><td style="padding:4px 0;font-size:11px;color:#9ca3af;">${messageId}</td></tr>` : ''}
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px;">
      <div style="font-size:14px;line-height:1.7;color:#111827;">
        ${html || `<pre style="white-space:pre-wrap;font-family:inherit;">${(text || '').replace(/</g, '&lt;')}</pre>`}
      </div>
      ${attachmentNote}
    </div>
    <div style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <a href="mailto:${from}?subject=Re: ${encodeURIComponent(subject || '')}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:8px 18px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">
        Reply to ${from}
      </a>
    </div>
  </div>
</body>
</html>`,
  })

  return NextResponse.json({ received: true })
}
