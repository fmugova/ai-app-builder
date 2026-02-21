import { NextResponse } from 'next/server'
import { prisma, slowQueryCounter } from '@/lib/prisma'
import { getEnvironmentStatus } from '@/lib/env-validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health Check Endpoint
 *
 * Checks: database connectivity + size, pgBouncer pool, Redis, environment,
 * slow-query counter, API key presence, system memory.
 *
 * Used by: load balancers, UptimeRobot, Vercel, CI/CD pipelines.
 *
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, unknown> = {}

  // ── 1. Database connectivity + size + pool stats ────────────────────────
  try {
    const dbStart = Date.now()

    // Connectivity probe
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStart

    // Database size (pg_database_size reports the current logical database)
    const sizeRows = await prisma.$queryRaw<{ size_mb: number }[]>`
      SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 1) AS size_mb
    `
    const dbSizeMb = sizeRows[0]?.size_mb ?? 0

    // pgBouncer / active connection stats from pg_stat_activity
    const connRows = await prisma.$queryRaw<{ active: number; idle: number; total: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active')  AS active,
        COUNT(*) FILTER (WHERE state = 'idle')    AS idle,
        COUNT(*)                                   AS total
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
    const connStats = connRows[0] ?? { active: 0, idle: 0, total: 0 }

    // Disk-space alert: warn at 80 % of a 500 MB Supabase free-tier DB
    const DB_SIZE_WARN_MB  = 400  // ~80 % of 500 MB
    const DB_SIZE_LIMIT_MB = 500  // free-tier cap — update for paid tiers

    const diskStatus =
      dbSizeMb >= DB_SIZE_LIMIT_MB ? 'critical' :
      dbSizeMb >= DB_SIZE_WARN_MB  ? 'warning'  : 'ok'

    checks.database = {
      status: 'healthy',
      responseTime: dbResponseTime,
      sizeMb: dbSizeMb,
      diskStatus,           // 'ok' | 'warning' | 'critical'
      diskLimitMb: DB_SIZE_LIMIT_MB,
      connections: {
        active: Number(connStats.active),
        idle:   Number(connStats.idle),
        total:  Number(connStats.total),
      },
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    }
  }

  // ── 2. Slow query metrics (from in-process counter) ─────────────────────
  checks.slowQueries = {
    sinceLastRestart: slowQueryCounter.count,
    critical: slowQueryCounter.critical,   // >2 000 ms
    lastSeen: slowQueryCounter.lastSeen?.toISOString() ?? null,
    threshold: '500ms',
  }

  // ── 3. Environment configuration ────────────────────────────────────────
  try {
    const envStatus = getEnvironmentStatus()
    const criticalMissing = envStatus.missing.filter(
      (v) =>
        v.includes('DATABASE') ||
        v.includes('NEXTAUTH_SECRET') ||
        v.includes('ANTHROPIC')
    )

    checks.environment = {
      status: criticalMissing.length === 0 ? 'healthy' : 'degraded',
      configured: envStatus.configured.length,
      missing: envStatus.missing.length,
      optional: envStatus.optional.length,
      criticalMissing,
    }
  } catch (error) {
    checks.environment = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Environment validation failed',
    }
  }

  // ── 4. Redis / Upstash ──────────────────────────────────────────────────
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const redisStart = Date.now()
      const redisCheck = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/ping`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        }
      )
      checks.redis = {
        status: redisCheck.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - redisStart,
        message: redisCheck.ok ? 'Redis ping OK' : 'Redis ping failed',
      }
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Redis check failed',
      }
    }
  } else {
    checks.redis = {
      status: 'not_configured',
      message: 'Redis not configured',
    }
  }

  // ── 5. API key presence ──────────────────────────────────────────────────
  // Only report a summary count — never expose which specific keys are present
  // (that leaks information about which integrations are live to attackers).
  const keyPresence = [
    process.env.ANTHROPIC_API_KEY,
    process.env.STRIPE_SECRET_KEY,
    process.env.GITHUB_CLIENT_ID,
    process.env.VERCEL_API_TOKEN,
    process.env.RESEND_API_KEY,
  ]
  const keysConfigured = keyPresence.filter(Boolean).length
  checks.apiKeys = {
    configured: keysConfigured,
    total: keyPresence.length,
    status: keysConfigured === keyPresence.length ? 'all_configured' : 'some_missing',
  }

  // ── 6. System info ───────────────────────────────────────────────────────
  const mem = process.memoryUsage()
  checks.system = {
    nodeVersion: process.version,
    platform:    process.platform,
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      heapUsedMb:  Math.round(mem.heapUsed  / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb:       Math.round(mem.rss       / 1024 / 1024),
      unit: 'MB',
    },
    environment: process.env.NODE_ENV,
  }

  // ── Overall status ───────────────────────────────────────────────────────
  const db = checks.database as { status: string; diskStatus?: string }
  const env = checks.environment as { status: string }

  const overallStatus =
    db.status === 'unhealthy'        ? 'unhealthy' :
    db.diskStatus === 'critical'     ? 'degraded'  :
    env.status === 'unhealthy'       ? 'degraded'  :
    db.diskStatus === 'warning'      ? 'degraded'  : 'healthy'

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks,
      version: process.env.npm_package_version || 'unknown',
    },
    { status: httpStatus }
  )
}

// For load balancers that only support POST
export async function POST() {
  return GET()
}

// For monitoring probes that use HEAD (UptimeRobot, Vercel, etc.)
// Returns 200 with no body — no DB queries needed.
export async function HEAD() {
  return new Response(null, { status: 200 })
}
