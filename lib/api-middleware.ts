import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, checkUserPermission, verifyResourceOwnership } from './auth'


export type ApiHandler<P = object> = (
  req: NextRequest,
  context: { params: P }
) => Promise<NextResponse>


export interface AuthenticatedApiHandler<P = object> {
  (
    req: NextRequest,
    context: { params: P },
    session: {
      user: {
        id: string
        email: string
        role: string
        subscriptionTier: string
      }
    }
  ): Promise<NextResponse>
}

/**
 * Wraps an API route with authentication
 * Returns 401 if user is not authenticated
 */
export function withAuth<P = object>(handler: AuthenticatedApiHandler<P>): ApiHandler<P> {
  return async (req, context) => {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    return handler(req, context, session as Parameters<AuthenticatedApiHandler<P>>[2])
  }
}

/**
 * Wraps an API route with admin role check
 * Returns 403 if user is not an admin
 */
export function withAdmin<P = object>(handler: AuthenticatedApiHandler<P>): ApiHandler<P> {
  return withAuth(async (req, context, session) => {
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    return handler(req, context, session)
  })
}

/**
 * Wraps an API route with subscription tier check
 * Returns 403 if user doesn't have required tier
 */
export function withSubscription<P = Record<string, unknown>>(
  minTier: 'pro' | 'business' | 'enterprise'
): (handler: AuthenticatedApiHandler<P>) => ApiHandler<P> {
  const tierHierarchy = ['free', 'pro', 'business', 'enterprise']
  const minTierIndex = tierHierarchy.indexOf(minTier)

  return (handler: AuthenticatedApiHandler<P>) => {
    return withAuth(async (req, context, session) => {
      const userTierIndex = tierHierarchy.indexOf(session.user.subscriptionTier)

      if (userTierIndex < minTierIndex) {
        return NextResponse.json(
          {
            error: `Subscription upgrade required`,
            requiredTier: minTier,
            currentTier: session.user.subscriptionTier,
          },
          { status: 403 }
        )
      }

      return handler(req, context, session)
    })
  }
}

/**
 * Wraps an API route with usage limit check
 * Returns 429 if user has exceeded limits
 */
export function withUsageCheck<P = Record<string, unknown>>(
  action: 'create_project' | 'create_database' | 'add_domain' | 'invite_member'
): (handler: AuthenticatedApiHandler<P>) => ApiHandler<P> {
  return (handler: AuthenticatedApiHandler<P>) => {
    return withAuth(async (req, context, session) => {
      const permission = await checkUserPermission(session.user.id, action)

      if (!permission.allowed) {
        return NextResponse.json(
          {
            error: permission.reason || 'Usage limit exceeded',
            action,
          },
          { status: 429 }
        )
      }

      return handler(req, context, session)
    })
  }
}

/**
 * Wraps an API route with resource ownership verification
 * Returns 404 if resource doesn't exist or user doesn't own it
 */
export function withResourceOwnership<P = Record<string, unknown>>(
  resourceType: 'project' | 'database' | 'domain',
  getResourceId: (params: P) => string
): (handler: AuthenticatedApiHandler<P>) => ApiHandler<P> {
  return (handler: AuthenticatedApiHandler<P>) => {
    return withAuth(async (req, context, session) => {
      const resourceId = getResourceId(context.params)

      const hasAccess = await verifyResourceOwnership(
        session.user.id,
        resourceType,
        resourceId
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Resource not found or access denied' },
          { status: 404 }
        )
      }

      return handler(req, context, session)
    })
  }
}

/**
 * Simple rate limiting using in-memory storage
 * For production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function withRateLimit(
  maxRequests: number,
  windowMs: number = 60000 // 1 minute default
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (req, context) => {
      const identifier = req.headers.get('x-forwarded-for') || 'unknown'
      const now = Date.now()

      const record = rateLimitMap.get(identifier)

      if (record && record.resetAt > now) {
        if (record.count >= maxRequests) {
          return NextResponse.json(
            {
              error: 'Too many requests',
              retryAfter: Math.ceil((record.resetAt - now) / 1000),
            },
            { status: 429 }
          )
        }
        record.count++
      } else {
        rateLimitMap.set(identifier, {
          count: 1,
          resetAt: now + windowMs,
        })
      }

      // Cleanup old entries periodically
      if (Math.random() < 0.01) {
        // 1% chance
        for (const [key, value] of rateLimitMap.entries()) {
          if (value.resetAt < now) {
            rateLimitMap.delete(key)
          }
        }
      }

      return handler(req, context)
    }
  }
}

/**
 * Combines multiple middleware functions
 */
export function compose<T>(...middlewares: Array<(handler: T) => T>) {
  return (handler: T) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}
