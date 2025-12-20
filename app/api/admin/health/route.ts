export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const startTime = Date.now()
    
    // Test database connection
    let dbHealth: 'healthy' | 'degraded' | 'down' = 'healthy'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      dbHealth = 'down'
    }

    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      database: dbHealth,
      api: 'healthy',
      responseTime,
      errors: 0
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      database: 'down',
      api: 'degraded',
      responseTime: 0,
      errors: 1
    })
  }
}