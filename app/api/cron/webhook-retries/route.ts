/**
 * Webhook Retry Cron Handler
 * 
 * Automatically processes failed webhook retries.
 * Should be called every 5 minutes via Vercel Cron.
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/webhook-retries",
 *     "schedule": "* /5 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processWebhookRetries } from '@/lib/webhooks/webhook-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Always require CRON_SECRET — fail closed if env var is not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/webhook-retries] CRON_SECRET is not set — rejecting request');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processedCount = await processWebhookRetries();

    return NextResponse.json({
      success: true,
      processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Webhook retry cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
