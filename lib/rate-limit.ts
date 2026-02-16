import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Redis (exported so other modules can use the same connection)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiters by use case
export const rateLimiters = {
  aiFree: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'ratelimit:ai:free',
  }),

  aiPro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    analytics: true,
    prefix: 'ratelimit:ai:pro',
  }),

  aiEnterprise: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    analytics: true,
    prefix: 'ratelimit:ai:enterprise',
  }),

  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'ratelimit:write',
  }),

  external: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 m'),
    analytics: true,
    prefix: 'ratelimit:external',
  }),

  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:general',
  }),

  newsletter: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: 'ratelimit:newsletter',
  }),

  feedback: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'ratelimit:feedback',
  }),

  // Public contact form — 3 submissions per 10 minutes per IP
  contact: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    analytics: true,
    prefix: 'ratelimit:contact',
  }),

  // User-generated site form submissions — 5 per minute per IP
  formSubmit: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'ratelimit:formsubmit',
  }),

  preview: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:preview',
  }),
}

export type RateLimitType = keyof typeof rateLimiters

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'general',
  customIdentifier?: string
): Promise<RateLimitResult> {
  try {
    const identifier = customIdentifier || 
                      request.headers.get('x-user-id') || 
                      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
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
    // Fail closed: deny the request when Redis is unavailable
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    }
  }
}

/**
 * Check rate limit using just an identifier (for use in Server Components)
 */
export async function checkRateLimitByIdentifier(
  identifier: string,
  type: RateLimitType = 'general'
): Promise<RateLimitResult> {
  try {
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
    // Fail closed: deny the request when Redis is unavailable
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    }
  }
}

export async function checkUserRateLimit(
  request: NextRequest,
  userId: string,
  subscriptionTier: string,
  subscriptionStatus: string
): Promise<RateLimitResult> {
  try {
    if (subscriptionStatus !== 'active') {
      console.warn('⚠️ Inactive subscription:', { userId, status: subscriptionStatus })
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 3600000,
      }
    }

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

    const result = await checkRateLimit(request, limiterType, userId)

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
    // Fail closed: deny the request when Redis is unavailable
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    }
  }
}

export function createRateLimitResponse(
  rateLimit: RateLimitResult,
  subscriptionTier: string = 'free'
): NextResponse {
  const retryAfterSeconds = Math.ceil((rateLimit.reset - Date.now()) / 1000)
  const retryAfterDate = new Date(rateLimit.reset)

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