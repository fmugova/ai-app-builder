export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkUsageAlerts } from '@/lib/usage-alerts'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get userId from session
    const userId = (session.user as any).id || session.user.email

    // Trigger usage alerts check
    const result = await checkUsageAlerts(userId)

    return NextResponse.json({
      success: true,
      message: 'Usage alerts checked',
      alerts: result
    })
  } catch (error: any) {
    console.error('Usage alert trigger error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check usage alerts' },
      { status: 500 }
    )
  }
}
