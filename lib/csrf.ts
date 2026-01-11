import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

/**
 * CSRF Protection Utility
 * Validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 */

export async function validateCSRF(req: NextRequest) {
  const token = await getToken({ req })
  const csrfToken = req.headers.get('x-csrf-token')
  
  if (!token) {
    throw new Error('Unauthorized: No session token')
  }
  
  if (!csrfToken) {
    throw new Error('Invalid CSRF token: Missing header')
  }
  
  // In NextAuth, CSRF tokens are typically managed automatically
  // This adds an extra layer for critical operations
  const sessionCsrf = token.csrfToken as string | undefined
  
  if (!sessionCsrf || sessionCsrf !== csrfToken) {
    throw new Error('Invalid CSRF token: Token mismatch')
  }
  
  return true
}

/**
 * Generate a CSRF token for the client
 * Usage: Include this in forms/requests to critical endpoints
 */
export async function getCSRFToken(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req })
  return (token?.csrfToken as string) || null
}

/**
 * Middleware helper to validate CSRF on protected routes
 * Usage: await requireCSRF(request) in API routes
 */
export async function requireCSRF(req: NextRequest): Promise<void> {
  try {
    await validateCSRF(req)
  } catch (error) {
    throw new Error(`CSRF validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
