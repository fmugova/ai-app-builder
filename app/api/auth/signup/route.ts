export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, getWelcomeEmailHTML } from '@/lib/email'
import { checkRateLimit, rateLimits } from '@/lib/rateLimit'
import { validatePassword } from '@/lib/validation'

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
    const { name, email, password } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Strong password validation
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join(' ') },
        { status: 400 }
      )
    }

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

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        projectsLimit: 3,
        generationsLimit: 10,
      }
    })

    // Log signup analytics event (server-side)
    logAnalyticsEvent('sign_up', { method: 'email', userId: user.id })

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to BuildFlow! 🚀',
        html: getWelcomeEmailHTML(name)
      })
      console.log('Welcome email sent to:', email)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail signup if email fails
    }

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