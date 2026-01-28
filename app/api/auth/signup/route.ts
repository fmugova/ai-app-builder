export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, getWelcomeEmailHTML } from '@/lib/email'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'
import { signupSchema, validateSchema } from '@/lib/schemas'
import { randomBytes } from 'crypto'

// Server-side analytics logging (GA tracking happens client-side)
const logAnalyticsEvent = (event: string, properties?: Record<string, any>) => {
  console.log(`📊 Analytics [${event}]:`, properties || {})
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - use IP address for signup
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const rateLimitResult = checkRateLimit(`signup:${ip}`, rateLimits.auth)
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many signup attempts. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validate input with Zod
    const validation = validateSchema(signupSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { name, email, password } = validation.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex')
    const emailVerificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

    // Create user with verification token
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        projectsLimit: 3,
        generationsLimit: 10,
        emailVerificationToken,
        emailVerificationTokenExpiry,
        twoFactorEnabled: false,
        twoFactorRequired: true, // Custom flag to enforce 2FA setup after signup
      }
    })

    // Log signup analytics event (server-side)
    logAnalyticsEvent('sign_up', { method: 'email', userId: user.id })

    // Auto-enroll in welcome drip campaign
    try {
      await prisma.dripEnrollment.create({
        data: {
          id: crypto.randomUUID(),
          campaignId: 'welcome_series',
          userEmail: user.email,
          userId: user.id,
          enrolledAt: new Date(),
          emailsSent: {}
        }
      })
    } catch (enrollmentError) {
      console.error('Drip enrollment failed:', enrollmentError)
      // Don't fail signup if enrollment fails
    }


    // Send verification email (don't await - send async)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow.ai'
    const verifyUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}`
    const verificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background: #6366f1; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 18px;">Verify Email</a>
        </p>
        <p>If you did not sign up, you can ignore this email.</p>
        <p style="color: #888; font-size: 13px;">This link will expire in 24 hours.</p>
      </div>
    `
    sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: verificationHtml,
      from: 'BuildFlow <noreply@buildflow-ai.app>'
    }).catch(err => 
      console.error('Verification email failed:', err)
    )

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}