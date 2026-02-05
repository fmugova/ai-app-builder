// app/api/admin/check/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check if Prisma is available
    if (!prisma) {
      console.error('[Admin Check] Prisma client not initialized')
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'Database unavailable' 
      }, { status: 503 })
    }

    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    // Double-check against database with error handling
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    const isAdmin = user?.role === 'admin'

    return NextResponse.json({ isAdmin })
  } catch (error) {
    console.error('[Admin Check] Error:', error)
    // Return more detailed error in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        isAdmin: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 })
    }
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}