// lib/with-logging.ts
// HOF that wraps Next.js App Router handlers with structured request logging.
// Generates (or propagates) X-Request-ID, measures duration, extracts userId
// from JWT, and logs via request-logger.ts after the handler returns.
//
// Usage:
//   async function GETHandler(req: NextRequest) { ... }
//   export const GET = withLogging(GETHandler)
//
// Works with both regular JSON routes and SSE streaming routes.
// For SSE streams, duration reflects total stream lifetime.

import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { logRequest } from '@/lib/request-logger'

type RouteHandler = (req: NextRequest, context?: unknown) => Promise<Response>

export function withLogging(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: unknown): Promise<Response> => {
    const start = Date.now()

    // Prefer X-Request-ID injected by proxy.ts; generate one if absent
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()

    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      undefined

    // Read userId from JWT — non-fatal if unavailable
    let userId: string | undefined
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      userId = (token?.id ?? token?.sub) as string | undefined
    } catch {
      // Non-authenticated routes are fine without userId
    }

    // Execute the handler
    let response: Response
    let status = 500
    try {
      response = await handler(req, context)
      status = response.status
    } catch (err) {
      // Log the error before re-throwing
      await logRequest({
        id: requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        status: 500,
        duration: Date.now() - start,
        userId,
        ip,
        timestamp: new Date().toISOString(),
      }).catch(() => {})
      throw err
    }

    // Log after the handler returns (non-blocking best-effort)
    await logRequest({
      id: requestId,
      method: req.method,
      path: req.nextUrl.pathname,
      status,
      duration: Date.now() - start,
      userId,
      ip,
      timestamp: new Date().toISOString(),
    }).catch(() => {})

    // Inject X-Request-ID into response headers.
    // new Response(body, ...) transfers the ReadableStream body — correct
    // because the original `response` is not used after this point.
    const headers = new Headers(response.headers)
    headers.set('X-Request-ID', requestId)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
