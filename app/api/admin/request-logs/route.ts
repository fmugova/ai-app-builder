// app/api/admin/request-logs/route.ts
// Admin-only endpoint — returns the last 100 API request logs from Redis.
// Used for monitoring response times and error rates per endpoint.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecentLogs } from '@/lib/request-logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const logs = await getRecentLogs(100)

  return NextResponse.json({ logs, count: logs.length })
}
