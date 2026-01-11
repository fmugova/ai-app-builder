import { prisma } from './prisma'
import { logSecurityEvent } from './security'

/**
 * Session Management Utilities
 * Enhanced session tracking with IP address, user agent, and activity monitoring
 */

interface SessionInfo {
  ipAddress?: string
  userAgent?: string
}

/**
 * Update session activity timestamp and metadata
 */
export async function trackSessionActivity(
  sessionToken: string,
  info?: SessionInfo
): Promise<void> {
  try {
    await prisma.session.update({
      where: { sessionToken },
      data: {
        lastActive: new Date(),
        ...(info?.ipAddress && { ipAddress: info.ipAddress }),
        ...(info?.userAgent && { userAgent: info.userAgent }),
      },
    })
  } catch (error) {
    console.error('Failed to track session activity:', error)
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  return await prisma.session.findMany({
    where: {
      userId,
      expires: { gt: new Date() },
    },
    orderBy: { lastActive: 'desc' },
    select: {
      id: true,
      sessionToken: true,
      ipAddress: true,
      userAgent: true,
      lastActive: true,
      createdAt: true,
      expires: true,
    },
  })
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionToken: string,
  userId: string
): Promise<boolean> {
  try {
    await prisma.session.delete({
      where: {
        sessionToken,
        userId, // Ensure user owns this session
      },
    })

    await logSecurityEvent({
      userId,
      type: 'session_revoked',
      action: 'success',
      metadata: {
        sessionToken: sessionToken.substring(0, 10) + '...', // Partial for security
      },
      severity: 'info',
    })

    return true
  } catch (error) {
    console.error('Failed to revoke session:', error)
    return false
  }
}

/**
 * Revoke all sessions except the current one
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionToken: string
): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        userId,
        sessionToken: { not: currentSessionToken },
      },
    })

    await logSecurityEvent({
      userId,
      type: 'all_sessions_revoked',
      action: 'success',
      metadata: {
        count: result.count,
      },
      severity: 'warning',
    })

    return result.count
  } catch (error) {
    console.error('Failed to revoke sessions:', error)
    return 0
  }
}

/**
 * Detect suspicious session activity
 */
export async function detectSuspiciousActivity(userId: string): Promise<{
  suspicious: boolean
  reasons: string[]
}> {
  const sessions = await getUserSessions(userId)
  const reasons: string[] = []

  // Check for multiple active sessions from different IPs
  const uniqueIPs = new Set(sessions.map(s => s.ipAddress).filter(Boolean))
  if (uniqueIPs.size > 5) {
    reasons.push(`Multiple IPs detected (${uniqueIPs.size} different locations)`)
  }

  // Check for sessions from unusual locations (too many concurrent)
  if (sessions.length > 10) {
    reasons.push(`Unusual number of active sessions (${sessions.length})`)
  }

  // Check for rapid session creation
  const recentSessions = sessions.filter(
    s => s.createdAt > new Date(Date.now() - 60 * 60 * 1000) // Last hour
  )
  if (recentSessions.length > 5) {
    reasons.push(`Rapid session creation (${recentSessions.length} in last hour)`)
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: { lt: new Date() },
      },
    })

    console.log(`Cleaned up ${result.count} expired sessions`)
    return result.count
  } catch (error) {
    console.error('Failed to cleanup sessions:', error)
    return 0
  }
}

/**
 * Get session statistics for a user
 */
export async function getSessionStats(userId: string) {
  const sessions = await getUserSessions(userId)
  
  return {
    totalActive: sessions.length,
    uniqueIPs: new Set(sessions.map(s => s.ipAddress).filter(Boolean)).size,
    mostRecentActivity: sessions[0]?.lastActive || null,
    oldestSession: sessions[sessions.length - 1]?.createdAt || null,
  }
}
