import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ============================================================================
// RATE LIMITERS BY USE CASE
// ============================================================================

export const rateLimiters = {
  // 🔴 AI Generation - Free tier (very limited)
  aiFree: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 generations per hour
    analytics: true,
    prefix: 'ratelimit:ai:free',
  }),

  // 🟡 AI Generation - Pro tier (moderate)
  aiPro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'), // 30 generations per hour
    analytics: true,
    prefix: 'ratelimit:ai:pro',
  }),

  // 🟢 AI Generation - Enterprise tier (generous)
  aiEnterprise: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 generations per hour
    analytics: true,
    prefix: 'ratelimit:ai:enterprise',
  }),

  // 🔴 Authentication (prevent brute force)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // 🟡 Database writes
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 writes per minute
    analytics: true,
    prefix: 'ratelimit:write',
  }),

  // 🟡 External API calls (GitHub, Vercel)
  external: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 m'), // 10 per 10 minutes
    analytics: true,
    prefix: 'ratelimit:external',
  }),

  // 🟢 General API (read operations)
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'ratelimit:general',
  }),
}

// ============================================================================
// RATE LIMIT TYPES
// ============================================================================

export type RateLimitType = keyof typeof rateLimiters

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// ============================================================================
// BASIC RATE LIMITING
// ============================================================================

export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'general',
  customIdentifier?: string
): Promise<RateLimitResult> {
  try {
    // Get identifier (user ID, IP, or custom)
    const identifier = customIdentifier || 
                      request.headers.get('x-user-id') || 
                      request.ip || 
                      request.headers.get('x-forwarded-for') ||
                      'anonymous'

    const limiter = rateLimiters[type]
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error('❌ Rate limit check failed:', error)
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    }
  }
}

// ============================================================================
// USER-AWARE RATE LIMITING (Based on Subscription Tier)
// ============================================================================

export async function checkUserRateLimit(
  request: NextRequest,
  userId: string,
  subscriptionTier: string,
  subscriptionStatus: string
): Promise<RateLimitResult> {
  try {
    // ✅ Check if subscription is active
    if (subscriptionStatus !== 'active') {
      console.warn('⚠️ Inactive subscription:', { userId, status: subscriptionStatus })
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 3600000, // 1 hour from now
      }
    }

    // ✅ Choose rate limiter based on subscription tier
    let limiterType: RateLimitType
    
    switch (subscriptionTier.toLowerCase()) {
      case 'enterprise':
        limiterType = 'aiEnterprise'
        break
      case 'pro':
        limiterType = 'aiPro'
        break
      case 'free':
      default:
        limiterType = 'aiFree'
        break
    }

    // ✅ Use user ID as identifier (not IP)
    const result = await checkRateLimit(request, limiterType, userId)

    // ✅ Log for monitoring
    if (!result.success) {
      console.warn('⚠️ Rate limit exceeded:', {
        userId,
        tier: subscriptionTier,
        limit: result.limit,
        reset: new Date(result.reset).toISOString()
      })
    }

    return result

  } catch (error) {
    console.error('❌ User rate limit check failed:', error)
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    }
  }
}

// ============================================================================
// RATE LIMIT ERROR RESPONSE
// ============================================================================

export function createRateLimitResponse(
  rateLimit: RateLimitResult,
  subscriptionTier: string = 'free'
): NextResponse {
  const retryAfterSeconds = Math.ceil((rateLimit.reset - Date.now()) / 1000)
  const retryAfterDate = new Date(rateLimit.reset)

  // ✅ Custom message based on tier
  let message = `Rate limit exceeded. Please try again after ${retryAfterDate.toLocaleTimeString()}.`
  
  if (subscriptionTier === 'free') {
    message += ' Upgrade to Pro for more generations per hour!'
  } else if (subscriptionTier === 'pro') {
    message += ' Upgrade to Enterprise for unlimited generations!'
  }

  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message,
      retryAfter: retryAfterSeconds,
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetAt: retryAfterDate.toISOString(),
      upgradeUrl: subscriptionTier === 'free' ? '/pricing' : undefined,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': retryAfterDate.toISOString(),
        'Retry-After': retryAfterSeconds.toString(),
      },
    }
  )
}

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

export function withRateLimit(
  type: RateLimitType = 'general',
  options?: {
    identifier?: (req: NextRequest) => string | Promise<string>
    onRateLimited?: (req: NextRequest, result: RateLimitResult) => NextResponse
  }
) {
  return async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    // Get custom identifier if provided
    const identifier = options?.identifier
      ? await options.identifier(request)
      : undefined

    // Check rate limit
    const result = await checkRateLimit(request, type, identifier)

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    }

    // Rate limit exceeded
    if (!result.success) {
      const response = options?.onRateLimited?.(request, result) ||
        createRateLimitResponse(result)
      
      return response
    }

    // Execute handler with rate limit headers
    const response = await handler(request)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

// ============================================================================
// RATE LIMIT INFO (for displaying to users)
// ============================================================================

export function getRateLimitInfo(tier: string) {
  switch (tier.toLowerCase()) {
    case 'enterprise':
      return {
        limit: 100,
        window: '1 hour',
        description: 'Enterprise: 100 generations per hour'
      }
    case 'pro':
      return {
        limit: 30,
        window: '1 hour',
        description: 'Pro: 30 generations per hour'
      }
    case 'free':
    default:
      return {
        limit: 5,
        window: '1 hour',
        description: 'Free: 5 generations per hour'
      }
  }
}import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Define different rate limiters for different use cases
export const rateLimiters = {
  // 🔴 CRITICAL: AI Generation (expensive operations)
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
    analytics: true,
    prefix: 'ratelimit:ai',
  }),

  // 🔴 CRITICAL: Authentication (prevent brute force)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // 🟡 MEDIUM: Database writes
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 writes per minute
    analytics: true,
    prefix: 'ratelimit:write',
  }),

  // 🟡 MEDIUM: External API calls (GitHub, Vercel)
  external: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '10 m'), // 20 per 10 minutes
    analytics: true,
    prefix: 'ratelimit:external',
  }),

  // 🟢 LOW: General API (read operations)
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'ratelimit:general',
  }),

  // 🎯 PREMIUM: Higher limits for paid users
  premium: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'), // 50 AI requests per hour
    analytics: true,
    prefix: 'ratelimit:premium',
  }),
}

// Rate limit types
export type RateLimitType = keyof typeof rateLimiters

// Helper function to apply rate limiting
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'general',
  customIdentifier?: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Get identifier (user ID, IP, or custom)
  const identifier = customIdentifier || 
                    request.headers.get('x-user-id') || 
                    request.ip || 
                    'anonymous'

  const limiter = rateLimiters[type]
  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

// Middleware wrapper for easy route protection
export function withRateLimit(
  type: RateLimitType = 'general',
  options?: { 
    identifier?: (req: NextRequest) => string | Promise<string>
    onRateLimited?: (req: NextRequest) => NextResponse
  }
) {
  return async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ) => {
    // Get custom identifier if provided
    const identifier = options?.identifier 
      ? await options.identifier(request)
      : undefined

    // Check rate limit
    const result = await checkRateLimit(request, type, identifier)

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    }

    // Rate limit exceeded
    if (!result.success) {
      const response = options?.onRateLimited?.(request) || 
        NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again after ${new Date(result.reset).toLocaleTimeString()}`,
            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
          },
          { status: 429, headers }
        )
      
      return response
    }

    // Execute handler with rate limit headers
    const response = await handler(request)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}

// User-aware rate limiting (different limits based on subscription tier)
export async function checkUserRateLimit(
  request: NextRequest,
  userId: string,
  subscriptionTier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Choose rate limiter based on subscription
  const type: RateLimitType = 
    subscriptionTier === 'enterprise' ? 'premium' :
    subscriptionTier === 'pro' ? 'premium' :
    'ai'

  return checkRateLimit(request, type, userId)
}