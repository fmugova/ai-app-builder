import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // 🔴 CHECK RATE LIMIT (IP-based to prevent brute force)
    const rateLimit = await checkRateLimit(request, 'auth')

    if (!rateLimit.success) {
      // Log suspicious activity
      console.warn('⚠️ Rate limit hit on signin:', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        reset: new Date(rateLimit.reset).toISOString()
      })

      return NextResponse.json(
        { 
          error: 'Too many login attempts',
          message: 'Please try again later',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { status: 429 }
      )
    }

    // Continue with authentication...
    // ... rest of your code
    
  } catch (error) {
    console.error('Signin error:', error)
    const Sentry = (await import('@/lib/sentry')).default
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
