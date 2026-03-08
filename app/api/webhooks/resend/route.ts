/**
 * Resend Unified Webhook Handler
 *
 * Handles ALL events from Resend:
 *   • email.received   — inbound email → forwarded to SUPPORT_INBOX_EMAIL
 *   • email.bounced    — hard/soft bounce → logged; user optionally flagged
 *   • email.complained — spam complaint  → logged; user optionally flagged
 *   • email.delivered  — delivery confirmation
 *   • email.opened     — open tracking
 *   • email.clicked    — click tracking
 *   • email.sent       — sent confirmation
 *
 * Resend uses Svix for signed delivery. Verification algorithm:
 *   secret = base64Decode(RESEND_WEBHOOK_SECRET.replace('whsec_', ''))
 *   message = `${svix-id}.${svix-timestamp}.${rawBody}`
 *   expected = base64Encode(HMAC-SHA256(secret, message))
 *   compare against each comma-split signature (format "v1,<b64>")
 *
 * Configured in Resend dashboard:
 *   Webhooks → https://buildflow-ai.app/api/webhooks/resend
 *   Events: email.received + all email.* events
 *   Copy signing secret → RESEND_WEBHOOK_SECRET env var
 *
 * Docs: https://resend.com/docs/dashboard/webhooks/introduction
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// ── HTML escaping helper (prevents XSS when embedding webhook data in HTML) ──
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Sanitise event.type for use in log messages (only allow word chars + dots/dashes)
function safeType(type: unknown): string {
  return String(type ?? '').replace(/[^\w.-]/g, '').slice(0, 64) || 'unknown'
}

// ── Config ────────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET
const SUPPORT_INBOX  = process.env.SUPPORT_INBOX_EMAIL
  || process.env.ALERT_EMAIL
  || 'support@buildflow-ai.app'

// Resend replays within a 5-minute window; reject anything older
const MAX_AGE_SECONDS = 300

// ── Svix signature verification ───────────────────────────────────────────────
//
// Resend signs webhooks using the Svix format:
//   Headers: svix-id, svix-timestamp, svix-signature
//   svix-signature may be comma-separated list of "v1,<base64>" values
//
function verifyResendSignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string,
): { ok: boolean; reason?: string } {
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: 'Missing svix-* headers' }
  }

  // Replay protection
  const ts = parseInt(svixTimestamp, 10)
  if (isNaN(ts)) return { ok: false, reason: 'Invalid svix-timestamp' }
  const ageSeconds = Math.abs(Date.now() / 1000 - ts)
  if (ageSeconds > MAX_AGE_SECONDS) {
    return { ok: false, reason: `Timestamp too old (${Math.round(ageSeconds)}s)` }
  }

  // Decode the base64 secret (strip whsec_ prefix)
  let secretBytes: Buffer
  try {
    const b64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
    secretBytes = Buffer.from(b64, 'base64')
  } catch {
    return { ok: false, reason: 'Could not decode webhook secret' }
  }

  // Construct the signed payload: "<svix-id>.<svix-timestamp>.<body>"
  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`
  const expectedHmac = crypto
    .createHmac('sha256', secretBytes)
    .update(toSign, 'utf8')
    .digest('base64')

  // svix-signature may contain multiple versions: "v1,<b64> v1,<b64>"
  const signatures = svixSignature.split(/[\s,]+/).filter((s) => s.startsWith('v1,'))
  const matched = signatures.some((sig) => {
    const candidate = sig.slice(3) // strip "v1,"
    try {
      return crypto.timingSafeEqual(
        Buffer.from(candidate, 'base64'),
        Buffer.from(expectedHmac, 'base64'),
      )
    } catch {
      return false
    }
  })

  return matched ? { ok: true } : { ok: false, reason: 'Signature mismatch' }
}

// ── Type definitions ──────────────────────────────────────────────────────────

interface ResendBaseEvent {
  type: string
  created_at: string
  data: Record<string, unknown>
}

interface ResendEmailReceivedData {
  from: string
  to: string[]
  subject: string
  html?: string
  text?: string
  attachments?: { filename: string; contentType: string; size: number }[]
  headers?: Record<string, string>
  messageId?: string
}

interface ResendEmailEventData {
  email_id?: string
  from?: string
  to?: string[]
  subject?: string
  bounce?: { message: string }
  complaint?: { userAgent?: string }
  click?: { link: string; userAgent: string; ipAddress: string }
  open?: { ipAddress: string; userAgent: string }
  tags?: Record<string, string>
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleEmailReceived(data: ResendEmailReceivedData) {
  const { from, to, subject, html, text, attachments = [], messageId } = data
  const toAddresses = to.join(', ')

  console.log(`[resend-webhook] Inbound: "${escapeHtml(subject)}" from ${escapeHtml(from)} → ${escapeHtml(toAddresses)}`)

  const safeFrom       = escapeHtml(from)
  const safeToAddr     = escapeHtml(toAddresses)
  const safeSubject    = escapeHtml(subject || '(no subject)')
  const safeMessageId  = messageId ? escapeHtml(messageId) : null

  const attachmentNote = attachments.length > 0
    ? `<p style="color:#6b7280;font-size:13px;margin-top:16px;">
        📎 ${attachments.length} attachment(s): ${attachments.map((a) => `${escapeHtml(a.filename)} (${Math.round(a.size / 1024)}KB)`).join(', ')}
       </p>`
    : ''

  await sendEmail({
    to: SUPPORT_INBOX,
    from: 'BuildFlow Inbound <noreply@buildflow-ai.app>',
    replyTo: from,
    subject: `[Inbound] ${subject || '(no subject)'}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1e293b;padding:16px 24px;display:flex;align-items:center;gap:12px;">
      <span style="background:#3b82f6;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;">INBOUND</span>
      <span style="color:#94a3b8;font-size:13px;">Forwarded from ${safeToAddr}</span>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:4px 0;width:64px;color:#9ca3af;vertical-align:top;">From</td><td style="padding:4px 0;font-weight:500;">${safeFrom}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;vertical-align:top;">To</td><td style="padding:4px 0;">${safeToAddr}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;vertical-align:top;">Subject</td><td style="padding:4px 0;font-weight:500;">${safeSubject}</td></tr>
        ${safeMessageId ? `<tr><td style="padding:4px 0;color:#9ca3af;">Msg-ID</td><td style="padding:4px 0;font-size:11px;color:#9ca3af;">${safeMessageId}</td></tr>` : ''}
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <div style="font-size:14px;line-height:1.7;color:#111827;">
        ${html || `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(text || '')}</pre>`}
      </div>
      ${attachmentNote}
    </div>
    <div style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <a href="mailto:${safeFrom}?subject=Re: ${encodeURIComponent(subject || '')}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:8px 18px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">
        Reply to ${safeFrom}
      </a>
    </div>
  </div>
</body>
</html>`,
  })
}

async function handleBounce(data: ResendEmailEventData) {
  const { email_id, to, from, subject, bounce } = data
  const recipient = to?.[0]

  console.warn(`[resend-webhook] Bounce: ${recipient} (email_id=${email_id}) — ${bounce?.message ?? 'no detail'}`)

  if (recipient) {
    // Find user by email and record the bounce (best-effort)
    try {
      const user = await prisma.user.findUnique({ where: { email: recipient } })
      if (user) {
        await prisma.activity.create({
          data: {
            userId: user.id,
            type: 'email_bounce',
            action: `Email bounced: "${subject || 'unknown'}" from ${from ?? 'unknown'}`,
            metadata: { email_id, bounceMessage: bounce?.message },
          },
        })
      }
    } catch (err) {
      console.error('[resend-webhook] Failed to record bounce in DB', err)
    }
  }
}

async function handleComplaint(data: ResendEmailEventData) {
  const { email_id, to, subject, complaint } = data
  const recipient = to?.[0]

  console.warn(`[resend-webhook] Spam complaint: ${recipient} (email_id=${email_id})`)

  if (recipient) {
    try {
      const user = await prisma.user.findUnique({ where: { email: recipient } })
      if (user) {
        await prisma.activity.create({
          data: {
            userId: user.id,
            type: 'email_complaint',
            action: `Spam complaint on: "${subject || 'unknown'}"`,
            metadata: { email_id, userAgent: complaint?.userAgent },
          },
        })
      }
    } catch (err) {
      console.error('[resend-webhook] Failed to record complaint in DB', err)
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verify Svix signature if secret is configured
  if (WEBHOOK_SECRET) {
    const result = verifyResendSignature(
      rawBody,
      req.headers.get('svix-id'),
      req.headers.get('svix-timestamp'),
      req.headers.get('svix-signature'),
      WEBHOOK_SECRET,
    )
    if (!result.ok) {
      console.warn(`[resend-webhook] Signature rejected: ${result.reason}`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    // No secret — only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not set in production — rejecting')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }
    console.warn('[resend-webhook] Signature check skipped (RESEND_WEBHOOK_SECRET not set)')
  }

  let event: ResendBaseEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = safeType(event.type)
  console.log(`[resend-webhook] Received event: ${eventType}`)

  try {
    switch (event.type) {
      case 'email.received':
        await handleEmailReceived(event.data as unknown as ResendEmailReceivedData)
        break

      case 'email.bounced':
        await handleBounce(event.data as unknown as ResendEmailEventData)
        break

      case 'email.complained':
        await handleComplaint(event.data as unknown as ResendEmailEventData)
        break

      case 'email.delivered':
      case 'email.sent':
      case 'email.opened':
      case 'email.clicked':
        // Acknowledged but no action required for now
        console.log(`[resend-webhook] ${eventType} for email_id=${safeType((event.data as ResendEmailEventData).email_id)}`)
        break

      default:
        console.log(`[resend-webhook] Unknown event type: ${eventType} — ignoring`)
    }
  } catch (err) {
    console.error(`[resend-webhook] Error processing ${eventType}:`, err)
    // Return 200 so Resend doesn't keep retrying on handler errors;
    // use 500 only for infrastructure failures (signature check, DB down)
    return NextResponse.json({ error: 'Handler error', type: eventType }, { status: 200 })
  }

  return NextResponse.json({ received: true, type: eventType })
}

// Resend sends a GET to the webhook URL when you save it in the dashboard
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'resend-webhook' })
}
