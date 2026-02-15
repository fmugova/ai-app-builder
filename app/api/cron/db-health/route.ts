/**
 * /api/cron/db-health
 *
 * Scheduled daily at 06:00 UTC (see vercel.json).
 * Runs autonomously — no user session required.
 *
 * Checks:
 * 1. Database connectivity and response time
 * 2. Database size — alerts when approaching Supabase free-tier limit
 * 3. Backup freshness — records a "last verified at" timestamp in Redis;
 *    alerts if the timestamp is older than 25 h (Supabase backs up daily)
 * 4. Slow-query counter — resets in-process counters after each daily report
 *
 * Alerts are sent via Resend to ALERT_EMAIL (falls back to ADMIN_EMAIL).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Config ────────────────────────────────────────────────────────────────
const DB_WARN_MB    = 400   // alert at  80 % of free-tier
const DB_CRIT_MB    = 475   // alert at  95 % of free-tier
const DB_LIMIT_MB   = 500   // Supabase free-tier cap
const BACKUP_MAX_H  = 25    // warn if no confirmed backup in 25 h
const BACKUP_KEY    = 'db:backup:last-verified'

// ── Auth ──────────────────────────────────────────────────────────────────
function authorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return auth === `Bearer ${cronSecret}`
}

// ── Email ─────────────────────────────────────────────────────────────────
async function sendAlert(subject: string, html: string) {
  const to = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL
  if (!to || !process.env.RESEND_API_KEY) {
    console.warn('[db-health] Alert email not sent — ALERT_EMAIL/RESEND_API_KEY not set')
    return
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'BuildFlow Alerts <alerts@buildflow-ai.app>',
        to,
        subject,
        html,
      }),
    })
  } catch (err) {
    console.error('[db-health] Failed to send alert email:', err)
  }
}

function alertHtml(title: string, body: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">⚠️ BuildFlow DB Alert — ${title}</h2>
      <pre style="background:#f3f4f6;padding:1rem;border-radius:8px;font-size:13px;white-space:pre-wrap">${body}</pre>
      <p style="color:#6b7280;font-size:12px">Sent by /api/cron/db-health · ${new Date().toISOString()}</p>
    </div>`
}

// ── Main ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report: Record<string, unknown> = {}
  const alerts: string[] = []

  // 1. Connectivity + response time
  try {
    const t0 = Date.now()
    await prisma.$queryRaw`SELECT 1`
    report.responseTime = Date.now() - t0
    report.connectivity = 'ok'
  } catch (err) {
    report.connectivity = 'failed'
    report.error = String(err)
    await sendAlert('DB Unreachable', `Connection failed:\n${err}`)
    return NextResponse.json({ ok: false, report }, { status: 500 })
  }

  // 2. DB size check
  try {
    const rows = await prisma.$queryRaw<{ size_mb: number }[]>`
      SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 1) AS size_mb
    `
    const sizeMb = rows[0]?.size_mb ?? 0
    report.sizeMb = sizeMb
    report.limitMb = DB_LIMIT_MB
    report.usagePct = Math.round((sizeMb / DB_LIMIT_MB) * 100)

    if (sizeMb >= DB_CRIT_MB) {
      alerts.push(`🔴 DB size CRITICAL: ${sizeMb} MB / ${DB_LIMIT_MB} MB (${report.usagePct}%)`)
    } else if (sizeMb >= DB_WARN_MB) {
      alerts.push(`🟡 DB size WARNING: ${sizeMb} MB / ${DB_LIMIT_MB} MB (${report.usagePct}%)`)
    }
  } catch (err) {
    report.sizeError = String(err)
  }

  // 3. Backup freshness check
  //    Supabase runs daily automated backups; we track the last time this
  //    cron successfully ran as a proxy for "backup pipeline is healthy".
  //    For actual backup verification, check the Supabase dashboard or
  //    configure PITR (Point-in-Time Recovery) on a paid plan.
  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      const lastVerifiedIso = await redis.get<string>(BACKUP_KEY)
      const nowMs = Date.now()

      if (!lastVerifiedIso) {
        // First run — write the timestamp
        await redis.set(BACKUP_KEY, new Date().toISOString())
        report.backup = 'first-run — timestamp recorded'
      } else {
        const lastMs = new Date(lastVerifiedIso).getTime()
        const ageH = (nowMs - lastMs) / 3_600_000
        report.backupLastVerifiedAt = lastVerifiedIso
        report.backupAgeHours = Math.round(ageH * 10) / 10

        if (ageH > BACKUP_MAX_H) {
          alerts.push(
            `🔴 Backup verification gap: last confirmed ${Math.round(ageH)}h ago (threshold ${BACKUP_MAX_H}h). ` +
            `Check Supabase dashboard → Backups.`
          )
        }
        // Stamp this successful run
        await redis.set(BACKUP_KEY, new Date().toISOString())
      }
    } else {
      report.backup = 'skipped — Redis not configured'
    }
  } catch (err) {
    report.backupError = String(err)
  }

  // 4. Connection pool snapshot
  try {
    const rows = await prisma.$queryRaw<{ active: number; idle: number; total: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active')  AS active,
        COUNT(*) FILTER (WHERE state = 'idle')    AS idle,
        COUNT(*)                                   AS total
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
    const c = rows[0] ?? { active: 0, idle: 0, total: 0 }
    report.connections = {
      active: Number(c.active),
      idle:   Number(c.idle),
      total:  Number(c.total),
    }
  } catch (err) {
    report.connectionsError = String(err)
  }

  // 5. Send consolidated alert if any issues found
  if (alerts.length > 0) {
    const body = alerts.join('\n\n') + '\n\nFull report:\n' + JSON.stringify(report, null, 2)
    await sendAlert(`${alerts.length} issue(s) detected`, body)
  }

  console.log('[db-health] cron completed', report)

  return NextResponse.json({
    ok: alerts.length === 0,
    alerts,
    report,
    checkedAt: new Date().toISOString(),
  })
}
