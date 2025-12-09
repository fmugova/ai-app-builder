export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, getWelcomeEmailHTML } from '@/lib/email'

// Server-side analytics logging (GA tracking happens client-side)
const logAnalyticsEvent = (event: string, properties?: Record<string, any>) => {
  console.log(`📊 Analytics [${event}]:`, properties || {})
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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