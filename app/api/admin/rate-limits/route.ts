/**
 * GET /api/admin/rate-limits
 *
 * Admin-only endpoint. Returns current-window counters for every rate-limiter
 * bucket, flags any limiter that is at or above 80 % of its window limit,
 * and documents the configured tiers for support reference.
 *
 * Implementation note:
 * Upstash Ratelimit stores counters at keys like:
 *   {prefix}:{identifier}          ← sliding-window script result
 * We cannot enumerate all identifiers (they're per-user/IP), so this endpoint
 * instead reads the ANALYTICS keys written by Upstash when analytics: true.
 * Analytics are stored at  {prefix}:analytics  as a sorted-set.
 *
 * If you need per-identifier inspection, use the Upstash web console at
 * https://console.upstash.com → your Redis → Data Browser → search prefix.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

// ── Rate limiter definitions (mirrors lib/rate-limit.ts) ──────────────────
// This is the authoritative documentation for support staff.
const LIMITER_DOCS = [
  {
    key: 'ratelimit:ai:free',
    name: 'AI Generation — Free tier',
    limit: 5,
    window: '1 hour',
    tier: 'free',
    notes: 'Applies per user ID. Upgrade message shown at 429.',
  },
  {
    key: 'ratelimit:ai:pro',
    name: 'AI Generation — Pro tier',
    limit: 30,
    window: '1 hour',
    tier: 'pro',
    notes: 'Per user ID.',
  },
  {
    key: 'ratelimit:ai:enterprise',
    name: 'AI Generation — Enterprise tier',
    limit: 100,
    window: '1 hour',
    tier: 'enterprise',
    notes: 'Per user ID.',
  },
  {
    key: 'ratelimit:auth',
    name: 'Auth (login/signup)',
    limit: 5,
    window: '15 minutes',
    tier: 'all',
    notes: 'Per IP. Fail-closed when Redis unavailable.',
  },
  {
    key: 'ratelimit:write',
    name: 'Write operations',
    limit: 30,
    window: '1 minute',
    tier: 'all',
    notes: 'Per IP/user. Applies to project save, publish, etc.',
  },
  {
    key: 'ratelimit:external',
    name: 'External API calls',
    limit: 10,
    window: '10 minutes',
    tier: 'all',
    notes: 'Per IP/user. Guards third-party integrations.',
  },
  {
    key: 'ratelimit:general',
    name: 'General API',
    limit: 100,
    window: '1 minute',
    tier: 'all',
    notes: 'Default limiter for uncategorised endpoints.',
  },
  {
    key: 'ratelimit:newsletter',
    name: 'Newsletter signup',
    limit: 3,
    window: '1 hour',
    tier: 'all',
    notes: 'Per IP. Prevents bot signups.',
  },
  {
    key: 'ratelimit:feedback',
    name: 'Feedback submissions',
    limit: 5,
    window: '1 hour',
    tier: 'all',
    notes: 'Per user ID.',
  },
  {
    key: 'ratelimit:preview',
    name: 'Preview sessions',
    limit: 10,
    window: '1 minute',
    tier: 'all',
    notes: 'Per IP. Guards Redis storage for preview file server.',
  },
  {
    key: 'ratelimit:preview-session',
    name: 'Preview session creation',
    limit: 20,
    window: '1 minute',
    tier: 'all',
    notes: 'Per user ID. Separate limiter on /api/preview-session.',
  },
] as const

const ALERT_PCT = 80  // flag limiters whose recent usage is ≥ this %

export async function GET() {
  // Auth guard — admin only
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Redis analytics — read total request counts stored by Upstash analytics
  let analyticsAvailable = false
  const analyticsData: Record<string, { total: number; blocked: number }> = {}

  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      // Upstash analytics stores hourly buckets in sorted sets at:
      //   {prefix}@<timestamp>:total  and  {prefix}@<timestamp>:blocked
      // We read the most-recent total/blocked for each limiter prefix.
      for (const limiter of LIMITER_DOCS) {
        try {
          // Get the current hour bucket key
          const hourBucket = Math.floor(Date.now() / 3_600_000)
          const totalKey   = `${limiter.key}@${hourBucket}:total`
          const blockedKey = `${limiter.key}@${hourBucket}:blocked`

          const [total, blocked] = await Promise.all([
            redis.get<number>(totalKey),
            redis.get<number>(blockedKey),
          ])

          analyticsData[limiter.key] = {
            total:   total   ?? 0,
            blocked: blocked ?? 0,
          }
          analyticsAvailable = true
        } catch {
          // Analytics key might not exist yet — leave as 0
          analyticsData[limiter.key] = { total: 0, blocked: 0 }
        }
      }
    } catch (err) {
      console.error('[admin/rate-limits] Redis error:', err)
    }
  }

  // Build response — enrich each limiter with analytics + alert flag
  const limiters = LIMITER_DOCS.map((doc) => {
    const analytics = analyticsData[doc.key] ?? { total: 0, blocked: 0 }
    const blockedPct = analytics.total > 0
      ? Math.round((analytics.blocked / analytics.total) * 100)
      : 0
    const alerting = blockedPct >= ALERT_PCT

    return {
      ...doc,
      analytics: analyticsAvailable ? {
        requestsThisHour: analytics.total,
        blockedThisHour:  analytics.blocked,
        blockedPct,
      } : null,
      alerting,  // true when ≥ 80 % of requests are being blocked
    }
  })

  const alertingLimiters = limiters.filter((l) => l.alerting)

  return NextResponse.json({
    limiters,
    summary: {
      total: limiters.length,
      alerting: alertingLimiters.length,
      alertingKeys: alertingLimiters.map((l) => l.key),
      analyticsAvailable,
      alertThresholdPct: ALERT_PCT,
    },
    upstashDashboard: 'https://console.upstash.com',
    documentation: {
      rateLimitTiers: {
        free:       'AI: 5 req/h | Auth: 5/15m | Write: 30/min | General: 100/min',
        pro:        'AI: 30 req/h | same auth/write/general limits',
        enterprise: 'AI: 100 req/h | same auth/write/general limits',
        all:        'Auth: 5/15m | Write: 30/min | Preview: 10/min | General: 100/min',
      },
      support: [
        'All limiters use sliding-window algorithm (Upstash Ratelimit).',
        'All limiters fail-closed: if Redis is unreachable, requests are denied.',
        'Rate limit headers returned on every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After.',
        'Users see an upgrade prompt when hitting free/pro limits.',
        'To manually reset a user\'s limit: delete the Redis key {prefix}:{userId} via the Upstash console.',
      ],
    },
    generatedAt: new Date().toISOString(),
  })
}
