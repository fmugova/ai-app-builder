import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    console.log('📝 Signup attempt:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // ✅ HASH PASSWORD (THIS IS CRITICAL!)
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('✅ Password hashed')

    // Create user
    const user = await prisma.user.create({
      data: {
        id: require('crypto').randomBytes(12).toString('hex'),
        email,
        name: name || email.split('@')[0],
        password: hashedPassword, // ✅ Use hashed password, not plaintext!
        updatedAt: new Date(),
      },
    })

    console.log('✅ User created:', user.email)

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: { id: user.id, email: user.email, name: user.name }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}