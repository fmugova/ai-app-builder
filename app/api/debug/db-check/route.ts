export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const userCount = await prisma.user.count()
    
    // Get sample of emails (masked for privacy)
    const users = await prisma.user.findMany({
      select: { 
        email: true, 
        password: true,
        createdAt: true 
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })

    const maskedUsers = users.map(u => ({
      email: u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      hasPassword: !!u.password,
      createdAt: u.createdAt
    }))

    return NextResponse.json({
      status: 'connected',
      userCount,
      recentUsers: maskedUsers,
      databaseUrl: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 50) + '...' : 
        'NOT SET',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Database check error:', error)
    return NextResponse.json({
      status: 'error',
      error: error.message,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    }, { status: 500 })
  }
}
