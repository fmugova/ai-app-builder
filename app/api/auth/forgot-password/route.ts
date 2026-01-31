import { checkRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    // Rate limiting - use IP address for forgot-password
    const rateLimit = await checkRateLimit(req, 'auth')
    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many password reset requests. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }
    // ...existing code...
    const { email } = await req.json()
    // ...existing code...
    
    <!-- Content -->
    <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Hi ${user.name || 'there'},
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        We received a request to reset your password for your BuildFlow account. Click the button below to create a new password:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        Or copy and paste this link into your browser:
      </p>
      
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563; margin: 8px 0 20px 0;">
        ${resetLink}
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0 0 10px 0;">
          ⏱️ This link will expire in 1 hour for security reasons.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
          If you didn't request this password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 BuildFlow. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
        `,
      })

      console.log(`✅ Password reset email sent successfully to ${email}`)
      console.log(`📧 Resend Email ID: ${emailResult.data?.id}`)
    } catch (emailError) {
      console.error('❌ Failed to send email via Resend:', emailError)
      // Don't fail the request if email fails - user can still use console link in dev
      if (process.env.NODE_ENV === 'production') {
        throw emailError
      }
    }

    return NextResponse.json({
      message: 'If that email exists, a reset link has been sent',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
