import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

/**
 * CSRF Protection Utility
 * Validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 */

const CSRF_SECRET = process.env.NEXTAUTH_SECRET!
const CSRF_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Generate a stateless HMAC-signed CSRF token bound to a user ID.
 * Format: `<timestamp>.<hmac>` where hmac = HMAC-SHA256(userId:timestamp, secret)
 */
export function generateCSRFToken(userId: string): string {
  const timestamp = Date.now().toString()
  const hmac = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${userId}:${timestamp}`)
    .digest('hex')
  return Buffer.from(`${timestamp}.${hmac}`).toString('base64url')
}

/**
 * Validate a CSRF token against the current session.
 * Token must be signed with the user's ID and not older than 1 hour.
 */
export async function validateCSRF(request: Request): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return false
    }

    // Accept token from header or JSON body
    const headerToken = request.headers.get('x-csrf-token')
    let bodyToken: string | undefined
    try {
      const body = await request.clone().json()
      bodyToken = body.csrfToken
    } catch {
      // Body might not be JSON
    }

    const rawToken = headerToken || bodyToken
    if (!rawToken) {
      console.error('CSRF: token missing from request')
      return false
    }

    // Decode and parse
    let timestamp: string
    let providedHmac: string
    try {
      const decoded = Buffer.from(rawToken, 'base64url').toString()
      const dot = decoded.indexOf('.')
      if (dot === -1) return false
      timestamp = decoded.slice(0, dot)
      providedHmac = decoded.slice(dot + 1)
    } catch {
      return false
    }

    // Check token age
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (isNaN(tokenAge) || tokenAge > CSRF_TOKEN_TTL_MS || tokenAge < 0) {
      console.error('CSRF: token expired or invalid timestamp')
      return false
    }

    // Verify HMAC
    const expectedHmac = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(`${session.user.id}:${timestamp}`)
      .digest('hex')

    const tokensMatch = crypto.timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    )
    if (!tokensMatch) {
      console.error('CSRF: HMAC mismatch')
    }
    return tokensMatch
  } catch (error) {
    console.error('CSRF validation error:', error)
    return false
  }
}

// Middleware function to protect routes
export async function withCSRFProtection(
  handler: (req: Request, context?: unknown) => Promise<Response>,
  options?: { methods?: string[] }
) {
  return async function (req: Request, context?: unknown) {
    const method = req.method
    const protectedMethods = options?.methods || ['POST', 'PUT', 'DELETE', 'PATCH']

    // Only check CSRF for sensitive methods
    if (protectedMethods.includes(method)) {
      const isValid = await validateCSRF(req)
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        )
      }
    }

    return handler(req, context)
  }
}

// Helper to add CSRF token to response headers
export function addCSRFTokenToResponse(response: NextResponse, token: string) {
  response.headers.set('x-csrf-token', token)
  return response
}

// React hook helper (for client-side)
export const getCSRFToken = () => {
  if (typeof window === 'undefined') return null
  
  // Get from meta tag or session storage
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  const storageToken = sessionStorage.getItem('csrf-token')
  
  return metaToken || storageToken
}

// Add CSRF token to fetch requests (client-side helper)
export function csrfFetch(url: string, options: RequestInit = {}) {
  const token = getCSRFToken()
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token || ''
    }
  })
}

/**
 * Middleware helper to validate CSRF on protected routes
 * Usage: await requireCSRF(request) in API routes
 */
export async function requireCSRF(req: NextRequest): Promise<void> {
  try {
    const isValid = await validateCSRF(req)
    if (!isValid) {
      throw new Error('CSRF validation failed')
    }
  } catch (error) {
    throw new Error(`CSRF validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
