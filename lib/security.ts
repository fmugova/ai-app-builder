// lib/security.ts
// Comprehensive security utilities

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// ============================================================================
// SECURITY EVENT LOGGING
// ============================================================================

export type SecurityEventType = 
  | 'login'
  | 'logout'
  | 'logout_all'
  | 'signup'
  | 'login_credentials'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'email_verification'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | '2fa_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'failed_login'
  | 'suspicious_activity'
  | 'session_revoked'
  | 'oauth_linked'
  | 'oauth_unlinked'

export type SecuritySeverity = 'info' | 'warning' | 'critical'

interface LogSecurityEventParams {
  userId?: string
  type: SecurityEventType | string
  action?: 'success' | 'failure' | 'attempt'
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  severity?: SecuritySeverity
}

export async function logSecurityEvent({
  userId,
  type,
  action = 'success',
  ipAddress,
  userAgent,
  metadata = {},
  severity
}: LogSecurityEventParams) {
  try {
    // Determine severity automatically based on event type
    if (!severity) {
      if (type.includes('locked') || type === 'suspicious_activity') {
        severity = 'critical'
      } else if (type.includes('failed') || action === 'failure') {
        severity = 'warning'
      } else {
        severity = 'info'
      }
    }

    // Get location from IP (optional - can integrate with IP geolocation service)
    const location = ipAddress ? await getLocationFromIP(ipAddress) : null

    await prisma.securityEvent.create({
      data: {
        userId,
        type,
        action,
        ipAddress,
        userAgent,
        location,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        severity
      }
    })

    // Log to console for immediate visibility
    console.log(`[SECURITY ${severity.toUpperCase()}] ${type} - ${action}`, {
      userId,
      ipAddress,
      metadata
    })
  } catch (error) {
    // Never let security logging break the app
    console.error('Failed to log security event:', error)
  }
}

// Get location from IP address (placeholder - integrate with service like ipapi.co)
async function getLocationFromIP(ipAddress: string): Promise<string | null> {
  try {
    // Skip for local IPs
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.')) {
      return 'Local'
    }

    // TODO: Integrate with IP geolocation service
    // const response = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    // const data = await response.json()
    // return `${data.city}, ${data.country_name}`
    
    return null
  } catch {
    return null
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export async function createActiveSession(
  userId: string,
  sessionToken: string,
  request: Request
) {
  const ipAddress = getIpAddress(request)
  const userAgent = request.headers.get('user-agent') || undefined
  const deviceInfo = parseUserAgent(userAgent || '')

  await prisma.activeSession.create({
    data: {
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      deviceType: deviceInfo.deviceType,
      deviceName: deviceInfo.deviceName,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  })
}

export async function updateSessionActivity(sessionToken: string) {
  await prisma.activeSession.update({
    where: { sessionToken },
    data: { lastActive: new Date() }
  })
}

export async function revokeSession(sessionToken: string, reason?: string) {
  const session = await prisma.activeSession.delete({
    where: { sessionToken }
  })

  await logSecurityEvent({
    userId: session.userId,
    type: 'session_revoked',
    action: 'success',
    metadata: { reason, sessionId: session.id },
    severity: 'warning'
  })
}

export async function revokeAllUserSessions(userId: string, exceptToken?: string) {
  const sessions = await prisma.activeSession.findMany({
    where: {
      userId,
      sessionToken: exceptToken ? { not: exceptToken } : undefined
    }
  })

  await prisma.activeSession.deleteMany({
    where: {
      userId,
      sessionToken: exceptToken ? { not: exceptToken } : undefined
    }
  })

  await logSecurityEvent({
    userId,
    type: 'logout_all',
    action: 'success',
    metadata: { revokedCount: sessions.length },
    severity: 'info'
  })

  return sessions.length
}

export async function getActiveSessions(userId: string) {
  return prisma.activeSession.findMany({
    where: { userId },
    orderBy: { lastActive: 'desc' }
  })
}

export async function cleanupExpiredSessions() {
  const result = await prisma.activeSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
  
  console.log(`Cleaned up ${result.count} expired sessions`)
  return result.count
}

// ============================================================================
// ACCOUNT LOCKOUT PROTECTION
// ============================================================================

export async function trackFailedLoginAttempt(
  email: string,
  ipAddress: string,
  userAgent?: string
): Promise<{ isLocked: boolean; remainingAttempts: number; lockedUntil?: Date }> {
  const MAX_ATTEMPTS = 5
  const LOCKOUT_DURATION_MINUTES = 30

  // Find or create failed attempt record
  const attempt = await prisma.failedLoginAttempt.upsert({
    where: {
      email_ipAddress: { email, ipAddress }
    },
    create: {
      email,
      ipAddress,
      userAgent,
      attempts: 1,
      lastAttempt: new Date()
    },
    update: {
      attempts: { increment: 1 },
      lastAttempt: new Date(),
      userAgent
    }
  })

  // Check if account should be locked
  if (attempt.attempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    
    await prisma.failedLoginAttempt.update({
      where: { email_ipAddress: { email, ipAddress } },
      data: { lockedUntil }
    })

    // Update user account
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountLockedUntil: lockedUntil,
          failedLoginAttempts: attempt.attempts
        }
      })

      await logSecurityEvent({
        userId: user.id,
        type: 'account_locked',
        action: 'success',
        ipAddress,
        userAgent,
        metadata: { attempts: attempt.attempts, lockedUntil },
        severity: 'critical'
      })
    }

    return {
      isLocked: true,
      remainingAttempts: 0,
      lockedUntil
    }
  }

  return {
    isLocked: false,
    remainingAttempts: MAX_ATTEMPTS - attempt.attempts
  }
}

export async function checkAccountLockout(
  email: string,
  ipAddress: string
): Promise<{ isLocked: boolean; lockedUntil?: Date }> {
  const attempt = await prisma.failedLoginAttempt.findUnique({
    where: { email_ipAddress: { email, ipAddress } }
  })

  if (!attempt?.lockedUntil) {
    return { isLocked: false }
  }

  // Check if lockout has expired
  if (attempt.lockedUntil < new Date()) {
    // Unlock account
    await prisma.failedLoginAttempt.update({
      where: { email_ipAddress: { email, ipAddress } },
      data: {
        attempts: 0,
        lockedUntil: null
      }
    })

    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountLockedUntil: null,
          failedLoginAttempts: 0
        }
      })

      await logSecurityEvent({
        userId: user.id,
        type: 'account_unlocked',
        action: 'success',
        ipAddress,
        metadata: { reason: 'timeout_expired' },
        severity: 'info'
      })
    }

    return { isLocked: false }
  }

  return {
    isLocked: true,
    lockedUntil: attempt.lockedUntil
  }
}

export async function resetFailedLoginAttempts(email: string, ipAddress: string) {
  await prisma.failedLoginAttempt.deleteMany({
    where: { email, ipAddress }
  })
}

// ============================================================================
// PASSWORD SECURITY
// ============================================================================

export async function checkPasswordHistory(
  userId: string,
  newPasswordHash: string
): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5 // Check last 5 passwords
  })

  // You would need to compare hashes properly with bcrypt
  // For now, just check if exact hash exists
  return history.some(h => h.hashedPassword === newPasswordHash)
}

export async function addPasswordToHistory(userId: string, hashedPassword: string) {
  await prisma.passwordHistory.create({
    data: { userId, hashedPassword }
  })

  // Keep only last 10 passwords in history
  const allHistory = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })

  if (allHistory.length > 10) {
    const toDelete = allHistory.slice(10)
    await prisma.passwordHistory.deleteMany({
      where: { id: { in: toDelete.map(h => h.id) } }
    })
  }
}

// Check if password has been pwned (Have I Been Pwned API)
export async function checkPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.substring(0, 5)
    const suffix = sha1.substring(5)

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
    const text = await response.text()
    
    return text.includes(suffix)
  } catch (error) {
    // Don't block login if API fails
    console.error('Failed to check password against HIBP:', error)
    return false
  }
}

// ============================================================================
// 2FA BACKUP CODES
// ============================================================================

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }
  return codes
}

export async function useBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorBackupCodes: true }
  })

  if (!user?.twoFactorBackupCodes.includes(code)) {
    return false
  }

  // Remove used code
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorBackupCodes: user.twoFactorBackupCodes.filter(c => c !== code)
    }
  })

  await logSecurityEvent({
    userId,
    type: '2fa_verified',
    action: 'success',
    metadata: { method: 'backup_code' },
    severity: 'info'
  })

  return true
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getIpAddress(request: Request): string {
  // Try various headers for IP (depends on your hosting/proxy setup)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  return cfConnectingIp || forwardedFor?.split(',')[0] || realIp || 'unknown'
}

export function parseUserAgent(userAgent: string) {
  // Simple user agent parsing (for production, use a library like ua-parser-js)
  let deviceType = 'desktop'
  let deviceName = 'Unknown Device'

  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile'
    if (/iphone/i.test(userAgent)) deviceName = 'iPhone'
    else if (/android/i.test(userAgent)) deviceName = 'Android Phone'
    else deviceName = 'Mobile Device'
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet'
    if (/ipad/i.test(userAgent)) deviceName = 'iPad'
    else deviceName = 'Tablet'
  } else {
    if (/chrome/i.test(userAgent)) deviceName = 'Chrome Browser'
    else if (/firefox/i.test(userAgent)) deviceName = 'Firefox Browser'
    else if (/safari/i.test(userAgent)) deviceName = 'Safari Browser'
    else if (/edge/i.test(userAgent)) deviceName = 'Edge Browser'
  }

  return { deviceType, deviceName }
}

// ============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================================================

export async function detectSuspiciousActivity(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<{ isSuspicious: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginIp: true, lastLoginAt: true }
  })

  if (!user) {
    return { isSuspicious: false }
  }

  // Check for login from new IP
  if (user.lastLoginIp && user.lastLoginIp !== ipAddress) {
    // Check if this is a completely new location (simplified)
    const recentEvents = await prisma.securityEvent.findMany({
      where: {
        userId,
        type: 'login',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: { ipAddress: true }
    })

    const knownIPs = recentEvents.map(e => e.ipAddress).filter(ip => ip !== null)
    
    if (!knownIPs.includes(ipAddress)) {
      await logSecurityEvent({
        userId,
        type: 'suspicious_activity',
        action: 'attempt',
        ipAddress,
        userAgent,
        metadata: {
          reason: 'new_ip_address',
          previousIp: user.lastLoginIp
        },
        severity: 'warning'
      })

      return {
        isSuspicious: true,
        reason: 'Login from new location detected'
      }
    }
  }

  // Check for rapid login attempts from different IPs
  const recentLogins = await prisma.securityEvent.findMany({
    where: {
      userId,
      type: 'login',
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    },
    select: { ipAddress: true }
  })

  const uniqueIPs = new Set(recentLogins.map(l => l.ipAddress).filter(ip => ip !== null))
  if (uniqueIPs.size > 3) {
    await logSecurityEvent({
      userId,
      type: 'suspicious_activity',
      action: 'attempt',
      ipAddress,
      userAgent,
      metadata: {
        reason: 'multiple_ips_short_time',
        ipCount: uniqueIPs.size
      },
      severity: 'critical'
    })

    return {
      isSuspicious: true,
      reason: 'Multiple login locations detected'
    }
  }

  return { isSuspicious: false }
}
