import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ isAdmin: false })
    }

    // Check if user has admin role
    const isAdmin = session.user.role === 'admin'
    
    return NextResponse.json({ 
      isAdmin,
      user: {
        email: session.user.email,
        role: session.user.role
      }
    })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ isAdmin: false })
  }
}
