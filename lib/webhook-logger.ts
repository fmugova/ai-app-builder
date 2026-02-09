// lib/webhook-logger.ts
// Webhook event logging for reliability and debugging

import { prisma } from '@/lib/prisma'

export interface WebhookLogData {
  provider: string
  eventType: string
  eventId?: string
  data: any
  metadata?: any
  userId?: string
}

/**
 * Log webhook event to database
 * Provides audit trail and debugging for webhook processing
 */
export async function logWebhookEvent(
  data: WebhookLogData,
  options: { status?: 'pending' | 'processed' | 'failed'; error?: string } = {}
): Promise<string> {
  const { status = 'pending', error } = options

  try {
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: data.provider,
        eventType: data.eventType,
        eventId: data.eventId,
        payload: data.data || {},
        metadata: data.metadata || {},
        userId: data.userId,
        status,
        error,
        processedAt: status === 'processed' ? new Date() : null,
      },
    })

    return webhookEvent.id
  } catch (logError) {
    // Don't fail the webhook if logging fails
    console.error('Failed to log webhook event:', logError)
    return ''
  }
}

/**
 * Update webhook event status after processing
 */
export async function updateWebhookEvent(
  id: string,
  status: 'processed' | 'failed',
  error?: string
): Promise<void> {
  try {
    await prisma.webhookEvent.update({
      where: { id },
      data: {
        status,
        error,
        processedAt: new Date(),
      },
    })
  } catch (updateError) {
    console.error('Failed to update webhook event:', updateError)
  }
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
export async function isWebhookEventProcessed(
  provider: string,
  eventId: string
): Promise<boolean> {
  if (!eventId) return false

  try {
    const existing = await prisma.webhookEvent.findFirst({
      where: {
        provider,
        eventId,
        status: 'processed',
      },
    })

    return !!existing
  } catch (error) {
    console.error('Failed to check webhook event:', error)
    return false
  }
}

/**
 * Get webhook event statistics
 */
export async function getWebhookStats(provider?: string, hours: number = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const where = {
      createdAt: { gte: since },
      ...(provider && { provider }),
    }

    const [total, processed, failed, pending] = await Promise.all([
      prisma.webhookEvent.count({ where }),
      prisma.webhookEvent.count({ where: { ...where, status: 'processed' } }),
      prisma.webhookEvent.count({ where: { ...where, status: 'failed' } }),
      prisma.webhookEvent.count({ where: { ...where, status: 'pending' } }),
    ])

    return {
      total,
      processed,
      failed,
      pending,
      successRate: total > 0 ? ((processed / total) * 100).toFixed(2) + '%' : '0%',
    }
  } catch (error) {
    console.error('Failed to get webhook stats:', error)
    return { total: 0, processed: 0, failed: 0, pending: 0, successRate: '0%' }
  }
}

/**
 * Get recent webhook events for debugging
 */
export async function getRecentWebhookEvents(
  options: {
    provider?: string
    eventType?: string
    status?: 'pending' | 'processed' | 'failed'
    limit?: number
  } = {}
) {
  const { provider, eventType, status, limit = 50 } = options

  try {
    return await prisma.webhookEvent.findMany({
      where: {
        ...(provider && { provider }),
        ...(eventType && { eventType }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        provider: true,
        eventType: true,
        eventId: true,
        status: true,
        error: true,
        createdAt: true,
        processedAt: true,
        userId: true,
      },
    })
  } catch (error) {
    console.error('Failed to get recent webhook events:', error)
    return []
  }
}

/**
 * Clean up old webhook events (data retention)
 */
export async function cleanupOldWebhookEvents(daysToKeep: number = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

    const result = await prisma.webhookEvent.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['processed', 'failed'] }, // Keep pending for investigation
      },
    })

    console.log(`Cleaned up ${result.count} old webhook events`)
    return result.count
  } catch (error) {
    console.error('Failed to cleanup webhook events:', error)
    return 0
  }
}

/**
 * Retry failed webhook processing
 */
export async function retryFailedWebhook(id: string): Promise<boolean> {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id },
    })

    if (!event || event.status !== 'failed') {
      return false
    }

    // Reset status to pending for retry
    await prisma.webhookEvent.update({
      where: { id },
      data: {
        status: 'pending',
        error: null,
        processedAt: null,
      },
    })

    return true
  } catch (error) {
    console.error('Failed to retry webhook:', error)
    return false
  }
}

/**
 * Get webhook event by ID with full payload
 */
export async function getWebhookEventById(id: string) {
  try {
    return await prisma.webhookEvent.findUnique({
      where: { id },
    })
  } catch (error) {
    console.error('Failed to get webhook event:', error)
    return null
  }
}
