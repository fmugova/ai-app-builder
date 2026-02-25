/**
 * Maintenance Mode API
 *
 * GET  /api/admin/maintenance  → { enabled: boolean, message: string | null, enabledAt: string | null }
 * POST /api/admin/maintenance  → { enabled: true, message, enabledAt }  (enable)
 * DELETE /api/admin/maintenance → { enabled: false }                    (disable)
 *
 * Stores flag in Upstash Redis under `maintenance:enabled` (1 = on, absent = off)
 * and optional message under `maintenance:message`.
 * Middleware reads these keys synchronously on every request.
 *
 * Admin-only — protected by middleware role check.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redis } from '@/lib/rate-limit'

const KEY_ENABLED = 'maintenance:enabled'
const KEY_MESSAGE = 'maintenance:message'
const KEY_ENABLED_AT = 'maintenance:enabledAt'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [enabled, message, enabledAt] = await Promise.all([
    redis.get<string>(KEY_ENABLED),
    redis.get<string>(KEY_MESSAGE),
    redis.get<string>(KEY_ENABLED_AT),
  ])

  return NextResponse.json({
    enabled: enabled === '1',
    message: message ?? null,
    enabledAt: enabledAt ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let message = 'BuildFlow AI is undergoing scheduled maintenance. We\'ll be back shortly.'
  try {
    const body = await req.json()
    if (body.message && typeof body.message === 'string') {
      message = body.message.slice(0, 500)
    }
  } catch {
    // default message
  }

  const now = new Date().toISOString()
  await Promise.all([
    redis.set(KEY_ENABLED, '1'),
    redis.set(KEY_MESSAGE, message),
    redis.set(KEY_ENABLED_AT, now),
  ])

  console.warn(`[maintenance] ENABLED by admin ${session.user?.email} at ${now}`)

  return NextResponse.json({ enabled: true, message, enabledAt: now })
}

export async function DELETE() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await Promise.all([
    redis.del(KEY_ENABLED),
    redis.del(KEY_MESSAGE),
    redis.del(KEY_ENABLED_AT),
  ])

  console.log(`[maintenance] DISABLED by admin ${session.user?.email} at ${new Date().toISOString()}`)

  return NextResponse.json({ enabled: false })
}
