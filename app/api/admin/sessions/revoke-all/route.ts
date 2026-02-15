/**
 * Platform-wide session revocation endpoint.
 *
 * POST /api/admin/sessions/revoke-all
 *   body: { reason?: string, exceptAdmins?: boolean }
 *   → Revokes ALL active sessions for ALL users (or non-admin users only).
 *   → Returns { revokedUsers, revokedSessions }
 *
 * Use case: Data breach response — force every user to re-authenticate immediately.
 *
 * Admin-only. Logs a security event for audit trail.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/security'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== 'admin') return null
  return session
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let reason = 'Admin-initiated platform-wide session revocation'
  let exceptAdmins = false
  try {
    const body = await req.json()
    if (body.reason && typeof body.reason === 'string') reason = body.reason.slice(0, 500)
    if (body.exceptAdmins === true) exceptAdmins = true
  } catch {
    // defaults
  }

  const ipAddress =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  // Find all users whose sessions we'll revoke
  let userIdsToRevoke: string[]
  if (exceptAdmins) {
    const nonAdminUsers = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true },
    })
    userIdsToRevoke = nonAdminUsers.map((u) => u.id)
  } else {
    const allUsers = await prisma.user.findMany({ select: { id: true } })
    userIdsToRevoke = allUsers.map((u) => u.id)
  }

  // Count existing sessions first for reporting
  const sessionsBefore = await prisma.activeSession.count({
    where: { userId: { in: userIdsToRevoke } },
  })

  // Delete all sessions in one query
  const result = await prisma.activeSession.deleteMany({
    where: { userId: { in: userIdsToRevoke } },
  })

  // Audit log
  await logSecurityEvent({
    userId: session.user?.id,
    type: 'logout_all',
    action: 'success',
    ipAddress,
    metadata: {
      reason,
      revokedUsers: userIdsToRevoke.length,
      revokedSessions: result.count,
      exceptAdmins,
      initiatedBy: session.user?.email,
    },
    severity: 'critical',
  })

  console.warn(
    `[SECURITY] Platform-wide session revocation by ${session.user?.email}: ` +
    `${result.count} sessions across ${userIdsToRevoke.length} users. Reason: ${reason}`
  )

  return NextResponse.json({
    success: true,
    revokedUsers: userIdsToRevoke.length,
    revokedSessions: result.count,
    sessionsBefore,
    reason,
    exceptAdmins,
    revokedAt: new Date().toISOString(),
  })
}

/**
 * GET — preview how many sessions would be revoked (dry run)
 */
export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const exceptAdmins = searchParams.get('exceptAdmins') === 'true'

  let userCount: number
  let sessionCount: number

  if (exceptAdmins) {
    const nonAdmins = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true },
    })
    const ids = nonAdmins.map((u) => u.id)
    userCount = ids.length
    sessionCount = await prisma.activeSession.count({ where: { userId: { in: ids } } })
  } else {
    userCount = await prisma.user.count()
    sessionCount = await prisma.activeSession.count()
  }

  return NextResponse.json({
    dryRun: true,
    usersAffected: userCount,
    sessionsToRevoke: sessionCount,
    exceptAdmins,
  })
}
