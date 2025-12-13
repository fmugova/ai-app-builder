import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminAsync } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isAdminAsync(session.user.email)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, subject, message } = await request.json()

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Send email
    const result = await sendEmail({
      to: user.email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px;">
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px;">📬 Message from BuildFlow Team</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #333333;">Hi ${user.name || 'there'}!</h2>
                        <div style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                          ${message}
                        </div>
                        <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px;">
                          This is a message from the BuildFlow admin team.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8f8f8; padding: 30px; text-align: center;">
                        <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                          Need help? Reply to this email or contact <a href="mailto:support@buildflow-ai.app" style="color: #667eea;">support@buildflow-ai.app</a>
                        </p>
                        <p style="margin: 0; color: #999999; font-size: 12px;">
                          © 2025 BuildFlow. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      from: 'BuildFlow Team <notifications@buildflow-ai.app>'
    })

    if (result.success) {
      // Log activity
      await prisma.activity.create({
        data: {
          userId: session.user.id as string,
          type: 'admin',
          action: 'Email sent to user',
          metadata: {
            recipientId: userId,
            recipientEmail: user.email,
            subject
          }
        }
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}