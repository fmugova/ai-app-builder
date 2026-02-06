export type AuditAction = 
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.login'
  | 'user.logout'
  | 'user.verify'
  | 'user.ban'
  | 'user.unban'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.publish'
  | 'project.unpublish'
  | 'admin.access'
  | 'admin.user_action'
  | 'admin.bulk_action'
  | 'workspace.create'
  | 'workspace.update'
  | 'workspace.delete'
  | 'feedback.create'
  | 'newsletter.subscribe'
  | 'payment.success'
  | 'payment.failed'

interface AuditLogParams {
  userId?: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry for admin actions and security events
 */
export async function createAuditLog({
  userId,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
  userAgent,
}: AuditLogParams) {
  try {
    // Check if AuditLog model exists in schema
    // If not, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Audit Log:', {
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // In production, store in database
    // Uncomment when AuditLog model is added to schema
    /*
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress,
        userAgent,
        createdAt: new Date(),
      },
    })
    */

    // For now, log to console in production too
    console.log('📝 Audit Log:', {
      userId,
      action,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Failed to create audit log:', error)
    // Don't throw - audit logging shouldn't break the application
  }
}

/**
 * Helper to extract IP address from request headers
 */
export function getIpAddress(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Helper to extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown'
}
