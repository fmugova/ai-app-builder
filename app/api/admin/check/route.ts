// app/api/admin/check/route.ts
// ⚠️ REPLACE THE ENTIRE FILE WITH THIS CODE - DELETE ALL EXISTING CONTENT FIRST

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    // Double-check against database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    const isAdmin = user?.role === 'admin'

    return NextResponse.json({ isAdmin })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}