import { prisma } from './prisma'
import { Resend } from 'resend'

/**
 * Security Email Notifications
 * Send alerts for important security events
 */

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send email using Resend
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'BuildFlow <noreply@buildflow.ai>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
  } catch (error) {
    console.error('[Email Send Failed]', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Send security alert email to user
 */
export async function sendSecurityAlert(
  userId: string,
  eventType: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

    if (!user?.email) {
      console.error('Cannot send security alert: User email not found')
      return
    }

    const { subject, html, text } = getSecurityEmailTemplate(eventType, user.name || 'User', details)

    await sendEmail({
      to: user.email,
      subject,
      html,
      text,
    })
  } catch (error) {
    console.error('Failed to send security alert:', error)
  }
}

/**
 * Generate email template based on security event type
 */
function getSecurityEmailTemplate(
  eventType: string,
  userName: string,
  details?: Record<string, unknown>
): { subject: string; html: string; text: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow.ai'
  
  switch (eventType) {
    case 'account_locked':
      return {
        subject: '🔒 Security Alert: Account Temporarily Locked',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Account Temporarily Locked</h2>
            <p>Hi ${userName},</p>
            <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Details:</strong></p>
              <ul style="margin: 8px 0;">
                <li>IP Address: ${details?.ipAddress || 'Unknown'}</li>
                <li>Failed Attempts: ${details?.attempts || 'Multiple'}</li>
                <li>Lockout Duration: 30 minutes</li>
              </ul>
            </div>
            <p>If this wasn't you, please secure your account immediately:</p>
            <ol>
              <li>Wait for the lockout to expire (30 minutes)</li>
              <li>Change your password</li>
              <li>Enable two-factor authentication</li>
            </ol>
            <a href="${baseUrl}/account/security" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Secure Your Account
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              If you recognize this activity, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `
Account Temporarily Locked

Hi ${userName},

Your account has been temporarily locked due to multiple failed login attempts.

Details:
- IP Address: ${details?.ipAddress || 'Unknown'}
- Failed Attempts: ${details?.attempts || 'Multiple'}
- Lockout Duration: 30 minutes

If this wasn't you, please secure your account immediately:
1. Wait for the lockout to expire (30 minutes)
2. Change your password
3. Enable two-factor authentication

Visit ${baseUrl}/account/security to secure your account.
        `
      }

    case 'failed_login':
      return {
        subject: '⚠️ Security Alert: Failed Login Attempt',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ea580c;">Failed Login Attempt Detected</h2>
            <p>Hi ${userName},</p>
            <p>We detected a failed login attempt on your account.</p>
            <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Details:</strong></p>
              <ul style="margin: 8px 0;">
                <li>IP Address: ${details?.ipAddress || 'Unknown'}</li>
                <li>Time: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p>If this was you, you can ignore this email. Otherwise, we recommend:</p>
            <ul>
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication</li>
              <li>Review recent account activity</li>
            </ul>
            <a href="${baseUrl}/account/security" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Review Security Settings
            </a>
          </div>
        `,
        text: `
Failed Login Attempt Detected

Hi ${userName},

We detected a failed login attempt on your account.

Details:
- IP Address: ${details?.ipAddress || 'Unknown'}
- Time: ${new Date().toLocaleString()}

If this wasn't you, change your password immediately at ${baseUrl}/account/security
        `
      }

    case 'password_changed':
      return {
        subject: '✅ Password Successfully Changed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Password Successfully Changed</h2>
            <p>Hi ${userName},</p>
            <p>Your password was successfully changed.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Details:</strong></p>
              <ul style="margin: 8px 0;">
                <li>Time: ${new Date().toLocaleString()}</li>
                <li>IP Address: ${details?.ipAddress || 'Unknown'}</li>
              </ul>
            </div>
            <p style="color: #dc2626; font-weight: bold;">If you didn't make this change:</p>
            <ol>
              <li>Contact support immediately</li>
              <li>Use account recovery to regain access</li>
            </ol>
            <a href="${baseUrl}/support" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Contact Support
            </a>
          </div>
        `,
        text: `
Password Successfully Changed

Hi ${userName},

Your password was successfully changed.

Time: ${new Date().toLocaleString()}
IP Address: ${details?.ipAddress || 'Unknown'}

If you didn't make this change, contact support immediately at ${baseUrl}/support
        `
      }

    case 'new_login_location':
      return {
        subject: '📍 New Login from Unrecognized Location',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Login Detected</h2>
            <p>Hi ${userName},</p>
            <p>We noticed a login from a new location.</p>
            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Login Details:</strong></p>
              <ul style="margin: 8px 0;">
                <li>IP Address: ${details?.ipAddress || 'Unknown'}</li>
                <li>Device: ${details?.userAgent || 'Unknown'}</li>
                <li>Time: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p>Was this you?</p>
            <a href="${baseUrl}/account/sessions" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Yes, This Was Me
            </a>
            <a href="${baseUrl}/account/security" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0 16px 8px;">
              No, Secure My Account
            </a>
          </div>
        `,
        text: `
New Login Detected

Hi ${userName},

We noticed a login from a new location.

Details:
- IP Address: ${details?.ipAddress || 'Unknown'}
- Device: ${details?.userAgent || 'Unknown'}
- Time: ${new Date().toLocaleString()}

If this wasn't you, secure your account at ${baseUrl}/account/security
        `
      }

    default:
      return {
        subject: `🔔 Security Alert: ${eventType}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Security Alert</h2>
            <p>Hi ${userName},</p>
            <p>We detected: <strong>${eventType}</strong></p>
            <p>If this wasn't you, please secure your account immediately.</p>
            <a href="${baseUrl}/account/security" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Review Security Settings
            </a>
          </div>
        `,
        text: `
Security Alert: ${eventType}

Hi ${userName},

If this wasn't you, please secure your account at ${baseUrl}/account/security
        `
      }
  }
}
