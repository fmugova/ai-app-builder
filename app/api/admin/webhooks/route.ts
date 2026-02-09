import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getRecentWebhookEvents,
  getWebhookStats,
  getWebhookEventById,
  retryFailedWebhook,
} from '@/lib/webhook-logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/webhooks
 * Get webhook event logs and statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    // Get specific webhook event
    if (action === 'get' && id) {
      const event = await getWebhookEventById(id)
      if (!event) {
        return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 })
      }
      return NextResponse.json(event)
    }

    // Get webhook statistics
    if (action === 'stats') {
      const provider = searchParams.get('provider') || undefined
      const hours = parseInt(searchParams.get('hours') || '24')
      const stats = await getWebhookStats(provider, hours)
      return NextResponse.json(stats)
    }

    // Get recent webhook events (default)
    const provider = searchParams.get('provider') || undefined
    const eventType = searchParams.get('eventType') || undefined
    const status = searchParams.get('status') as any
    const limit = parseInt(searchParams.get('limit') || '50')

    const events = await getRecentWebhookEvents({
      provider,
      eventType,
      status,
      limit,
    })

    return NextResponse.json({
      events,
      count: events.length,
    })
  } catch (error) {
    console.error('Webhook logs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/webhooks
 * Retry failed webhook (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { action, id } = await request.json()

    if (action === 'retry' && id) {
      const success = await retryFailedWebhook(id)
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to retry webhook or webhook not in failed state' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Webhook marked for retry',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Webhook retry error:', error)
    return NextResponse.json(
      { error: 'Failed to retry webhook' },
      { status: 500 }
    )
  }
}
