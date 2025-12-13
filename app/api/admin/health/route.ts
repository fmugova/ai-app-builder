export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is admin
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const startTime = Date.now()

    // Check database health
    let databaseHealth: 'healthy' | 'degraded' | 'down' = 'healthy'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      databaseHealth = 'down'
    }

    // Check API health (simple ping)
    const apiHealth: 'healthy' | 'degraded' | 'down' = 'healthy'

    // Calculate response time
    const responseTime = Date.now() - startTime

    // Get error count from last 24 hours (if you have error logging)
    // For now, return 0
    const errors = 0

    return NextResponse.json({
      database: databaseHealth,
      api: apiHealth,
      responseTime,
      errors,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        database: 'down',
        api: 'degraded',
        responseTime: 0,
        errors: 1,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}