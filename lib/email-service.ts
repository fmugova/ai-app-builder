// lib/email-service.ts
// Universal email service supporting multiple providers
// Supports: Resend, SendGrid, and development console logging

interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Universal email sending function
 * Automatically detects and uses configured email provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = getEmailProvider()

  try {
    switch (provider) {
      case 'resend':
        return await sendWithResend(options)
      case 'sendgrid':
        return await sendWithSendGrid(options)
      case 'console':
      default:
        return sendWithConsole(options)
    }
  } catch (error) {
    console.error('Email sending failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Detect which email provider is configured
 */
function getEmailProvider(): 'resend' | 'sendgrid' | 'console' {
  if (process.env.RESEND_API_KEY) {
    return 'resend'
  }
  if (process.env.SENDGRID_API_KEY) {
    return 'sendgrid'
  }
  return 'console'
}

/**
 * Send email via Resend (recommended)
 * https://resend.com
 */
async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const from = options.from || process.env.EMAIL_FROM || 'noreply@example.com'
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      cc: options.cc,
      bcc: options.bcc
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Resend API error: ${error.message || response.statusText}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    messageId: data.id
  }
}

/**
 * Send email via SendGrid
 * https://sendgrid.com
 */
async function sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY not configured')
  }

  const from = options.from || process.env.EMAIL_FROM || 'noreply@example.com'
  
  const personalizations: any[] = [{
    to: Array.isArray(options.to) 
      ? options.to.map(email => ({ email }))
      : [{ email: options.to }]
  }]

  if (options.cc) {
    personalizations[0].cc = options.cc.map(email => ({ email }))
  }
  if (options.bcc) {
    personalizations[0].bcc = options.bcc.map(email => ({ email }))
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations,
      from: { email: from },
      subject: options.subject,
      content: [
        ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
        ...(options.text ? [{ type: 'text/plain', value: options.text }] : [])
      ],
      reply_to: options.replyTo ? { email: options.replyTo } : undefined
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`SendGrid API error: ${error.errors?.[0]?.message || response.statusText}`)
  }

  // SendGrid returns 202 Accepted with X-Message-Id header
  const messageId = response.headers.get('X-Message-Id') || undefined
  
  return {
    success: true,
    messageId
  }
}

/**
 * Development fallback - log email to console
 */
function sendWithConsole(options: EmailOptions): EmailResult {
  console.log('\n📧 ===== EMAIL (DEVELOPMENT MODE) =====')
  console.log('From:', options.from || process.env.EMAIL_FROM || 'noreply@example.com')
  console.log('To:', options.to)
  console.log('Subject:', options.subject)
  if (options.cc) console.log('CC:', options.cc)
  if (options.bcc) console.log('BCC:', options.bcc)
  if (options.replyTo) console.log('Reply-To:', options.replyTo)
  console.log('\n--- Content ---')
  if (options.html) {
    console.log('HTML:', options.html.substring(0, 200) + (options.html.length > 200 ? '...' : ''))
  }
  if (options.text) {
    console.log('Text:', options.text)
  }
  console.log('=====================================\n')

  return {
    success: true,
    messageId: `dev-${Date.now()}`
  }
}

/**
 * Email templates for common use cases
 */
export const emailTemplates = {
  /**
   * Contact form submission notification
   */
  contactFormNotification: (data: { name: string; email: string; message: string }) => ({
    subject: 'New Contact Form Submission',
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Reply directly to this email to respond to ${escapeHtml(data.name)}</small></p>
    `,
    text: `
New Contact Form Submission

From: ${data.name} (${data.email})
Message:
${data.message}
    `.trim()
  }),

  /**
   * Newsletter welcome email
   */
  newsletterWelcome: (data: { name?: string }) => ({
    subject: 'Welcome to our newsletter! 🎉',
    html: `
      <h2>Welcome${data.name ? `, ${escapeHtml(data.name)}` : ''}! 🎉</h2>
      <p>Thank you for subscribing to our newsletter.</p>
      <p>You'll receive updates about:</p>
      <ul>
        <li>New features and updates</li>
        <li>Tips and best practices</li>
        <li>Exclusive content</li>
      </ul>
      <p>You can unsubscribe at any time using the link in our emails.</p>
      <hr>
      <p><small>If you didn't subscribe, please ignore this email.</small></p>
    `,
    text: `
Welcome${data.name ? `, ${data.name}` : ''}!

Thank you for subscribing to our newsletter.

You'll receive updates about:
- New features and updates
- Tips and best practices
- Exclusive content

You can unsubscribe at any time using the link in our emails.
    `.trim()
  }),

  /**
   * Email verification
   */
  verifyEmail: (data: { verificationUrl: string; name?: string }) => ({
    subject: 'Verify your email address',
    html: `
      <h2>Verify Your Email Address</h2>
      <p>Hi${data.name ? ` ${escapeHtml(data.name)}` : ''},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p style="margin: 30px 0;">
        <a href="${escapeHtml(data.verificationUrl)}" 
           style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email Address
        </a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p><a href="${escapeHtml(data.verificationUrl)}">${escapeHtml(data.verificationUrl)}</a></p>
      <hr>
      <p><small>If you didn't create an account, please ignore this email.</small></p>
    `,
    text: `
Verify Your Email Address

Hi${data.name ? ` ${data.name}` : ''},

Please verify your email address by clicking this link:
${data.verificationUrl}

If you didn't create an account, please ignore this email.
    `.trim()
  }),

  /**
   * Password reset
   */
  passwordReset: (data: { resetUrl: string; name?: string }) => ({
    subject: 'Reset your password',
    html: `
      <h2>Reset Your Password</h2>
      <p>Hi${data.name ? ` ${escapeHtml(data.name)}` : ''},</p>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <p style="margin: 30px 0;">
        <a href="${escapeHtml(data.resetUrl)}" 
           style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p><a href="${escapeHtml(data.resetUrl)}">${escapeHtml(data.resetUrl)}</a></p>
      <p>This link will expire in 1 hour.</p>
      <hr>
      <p><small>If you didn't request a password reset, please ignore this email.</small></p>
    `,
    text: `
Reset Your Password

Hi${data.name ? ` ${data.name}` : ''},

You requested to reset your password. Click this link to proceed:
${data.resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.
    `.trim()
  }),

  /**
   * Admin notification
   */
  adminNotification: (data: { title: string; message: string; actionUrl?: string }) => ({
    subject: `Admin Notice: ${data.title}`,
    html: `
      <h2>${escapeHtml(data.title)}</h2>
      <p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
      ${data.actionUrl ? `
        <p style="margin: 30px 0;">
          <a href="${escapeHtml(data.actionUrl)}" 
             style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Details
          </a>
        </p>
      ` : ''}
      <hr>
      <p><small>This is an automated admin notification.</small></p>
    `,
    text: `
${data.title}

${data.message}
${data.actionUrl ? `\nView Details: ${data.actionUrl}` : ''}
    `.trim()
  })
}

/**
 * Helper function to escape HTML
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Send bulk emails with rate limiting
 */
export async function sendBulkEmails(
  emails: EmailOptions[],
  options: { delayMs?: number; batchSize?: number } = {}
): Promise<EmailResult[]> {
  const { delayMs = 100, batchSize = 10 } = options
  const results: EmailResult[] = []

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(email => sendEmail(email))
    )
    results.push(...batchResults)

    // Delay between batches to avoid rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}
