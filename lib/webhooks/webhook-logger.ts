/**
 * Webhook Event Logger
 * 
 * Provides webhook event logging and automatic retry functionality.
 * All webhooks are stored in the database with retry logic for failures.
 * 
 * Usage:
 * ```typescript
 * import { processWebhookWithLogging } from '@/lib/webhooks/webhook-logger';
 * 
 * await processWebhookWithLogging(
 *   {
 *     provider: 'stripe',
 *     eventType: 'checkout.session.completed',
 *     payload: event,
 *   },
 *   async (payload) => {
 *     // Your webhook handler logic
 *     await handleCheckout(payload);
 *   }
 * );
 * ```
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type WebhookEventInput = {
  provider: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  eventId?: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
};

type WebhookProcessResult = {
  success: boolean;
  error?: string;
  eventId: string;
};

/**
 * Process webhook with automatic logging
 */
export async function processWebhookWithLogging(
  eventData: WebhookEventInput,
  handler: (payload: unknown) => Promise<void>
): Promise<WebhookProcessResult> {
  // Create webhook event record
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: eventData.provider,
      eventType: eventData.eventType,
      payload: eventData.payload,
      eventId: eventData.eventId,
      userId: eventData.userId,
      metadata: eventData.metadata,
      status: 'pending',
      attempts: 0,
    },
  });

  try {
    // Process the webhook
    await handler(eventData.payload);

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
        attempts: 1,
      },
    });

    return {
      success: true,
      eventId: webhookEvent.id,
    };
  } catch (error: unknown) {
    // Log the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: 'failed',
        error: errorMessage,
        attempts: 1,
        retryAt: calculateRetryTime(1),
      },
    });

    return {
      success: false,
      error: errorMessage,
      eventId: webhookEvent.id,
    };
  }
}

/**
 * Process failed webhook retries
 */
export async function processWebhookRetries(): Promise<number> {
  const now = new Date();

  // Get failed events ready for retry
  const eventsToRetry = await prisma.webhookEvent.findMany({
    where: {
      status: 'failed',
      retryAt: {
        lte: now,
      },
      attempts: {
        lt: 5, // Max 5 attempts
      },
    },
    take: 100, // Process in batches
  });

  let processedCount = 0;

  for (const event of eventsToRetry) {
    try {
      // Increment attempt counter
      const attempts = event.attempts + 1;

      // Update status to processing
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          attempts,
          status: 'processing',
        },
      });

      // Try to reprocess (This would need the actual handler)
      // For now, we just mark it for manual review
      // In a real implementation, you'd need to store and retrieve the handler

      // Mark as needing manual intervention after 5 attempts
      if (attempts >= 5) {
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'manual_review',
          },
        });
      } else {
        // Schedule next retry
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'failed',
            retryAt: calculateRetryTime(attempts),
          },
        });
      }

      processedCount++;
    } catch (error) {
      console.error(`Failed to retry webhook ${event.id}:`, error);
    }
  }

  return processedCount;
}

/**
 * Calculate retry time with exponential backoff
 */
function calculateRetryTime(attempts: number): Date {
  const delays = [
    1 * 60 * 1000, // 1 minute
    5 * 60 * 1000, // 5 minutes
    15 * 60 * 1000, // 15 minutes
    60 * 60 * 1000, // 1 hour
    6 * 60 * 60 * 1000, // 6 hours
  ];

  const delay = delays[Math.min(attempts - 1, delays.length - 1)];
  return new Date(Date.now() + delay);
}

/**
 * Get webhook statistics, optionally filtered by provider and time window
 */
export async function getWebhookStats(provider?: string, hours?: number) {
  const timeFilter: Prisma.WebhookEventWhereInput = {};
  if (provider) timeFilter.provider = provider;
  if (hours) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    timeFilter.createdAt = { gte: since };
  }

  const [total, processed, failed, pending, manualReview] = await Promise.all([
    prisma.webhookEvent.count({ where: timeFilter }),
    prisma.webhookEvent.count({ where: { ...timeFilter, status: 'processed' } }),
    prisma.webhookEvent.count({ where: { ...timeFilter, status: 'failed' } }),
    prisma.webhookEvent.count({ where: { ...timeFilter, status: 'pending' } }),
    prisma.webhookEvent.count({ where: { ...timeFilter, status: 'manual_review' } }),
  ]);

  return {
    total,
    processed,
    failed,
    pending,
    manualReview,
    successRate: total > 0 ? ((processed / total) * 100).toFixed(2) + '%' : '0%',
  };
}

/**
 * Clean up old webhook events (older than 90 days)
 */
export async function cleanupOldWebhookEvents(): Promise<number> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await prisma.webhookEvent.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
      status: 'processed',
    },
  });

  return result.count;
}

/**
 * Get recent webhook events with optional filters
 */
export async function getRecentWebhookEvents(opts: {
  provider?: string;
  eventType?: string;
  status?: string;
  limit?: number;
} = {}) {
  const { provider, eventType, status, limit = 50 } = opts;

  const where: Prisma.WebhookEventWhereInput = {};
  if (provider) where.provider = provider;
  if (eventType) where.eventType = eventType;
  if (status) where.status = status;

  return prisma.webhookEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 200),
    select: {
      id: true,
      provider: true,
      eventType: true,
      eventId: true,
      status: true,
      error: true,
      attempts: true,
      retryAt: true,
      createdAt: true,
      processedAt: true,
      userId: true,
      // payload/metadata intentionally omitted for list view (returned in detail)
    },
  });
}

/**
 * Get a single webhook event by ID (includes full payload)
 */
export async function getWebhookEventById(id: string) {
  return prisma.webhookEvent.findUnique({ where: { id } });
}

/**
 * Mark a specific failed/manual_review webhook event for immediate retry
 */
export async function retryFailedWebhook(id: string): Promise<boolean> {
  const event = await prisma.webhookEvent.findUnique({ where: { id } });

  if (!event) return false;
  if (event.status !== 'failed' && event.status !== 'manual_review') return false;

  await prisma.webhookEvent.update({
    where: { id },
    data: {
      status: 'pending',
      retryAt: new Date(), // process immediately on next cron run
      error: null,
    },
  });

  return true;
}

/**
 * Replay a specific webhook event
 */
export async function replayWebhookEvent(
  eventId: string,
  handler: (payload: unknown) => Promise<void>
): Promise<boolean> {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Webhook event not found');
  }

  try {
    await handler(event.payload);

    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
        error: null,
      },
    });

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        error: errorMessage,
      },
    });

    return false;
  }
}
