/**
 * Multi-page preview file server.
 *
 * GET /preview/[sessionId]/index.html        → serves index.html from Redis
 * GET /preview/[sessionId]/about.html        → serves about.html
 * GET /preview/[sessionId]/styles/main.css   → serves CSS file
 *
 * Files are keyed in Redis under preview:{userId}:{sessionId}
 * We don't require auth here because the sessionId is a 32-char random hex token
 * (unguessable), and the content is ephemeral (20-min TTL) user-generated HTML.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const MIME_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css:  'text/css; charset=utf-8',
  js:   'application/javascript; charset=utf-8',
  json: 'application/json',
  svg:  'image/svg+xml',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
  ico:  'image/x-icon',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; path: string[] }> }
) {
  const { sessionId, path } = await params

  // Validate sessionId format (32 hex chars)
  if (!/^[0-9a-f]{32}$/i.test(sessionId)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Reconstruct filename from path segments
  const filename = path.join('/')

  // Find matching key in Redis — we stored under preview:{userId}:{sessionId}
  // We can't know userId here, so scan for the key by pattern
  // To avoid full scan, we store an index: preview:session:{sessionId} → userId
  // BUT since sessionIds are unguessable and short-lived, a simpler approach:
  // Try all possible user keys. Instead, we'll store files under a simpler key:
  // preview:files:{sessionId}:{filename}
  // See the POST route — we store as: key = `preview:files:{sessionId}`
  const key = `preview:files:${sessionId}`

  let stored: string | null = null
  try {
    stored = await redis.hget<string>(key, filename)
    // Also try index.html if accessing root
    if (!stored && (filename === '' || filename === '/')) {
      stored = await redis.hget<string>(key, 'index.html')
    }
  } catch {
    return new NextResponse('Preview session error', { status: 500 })
  }

  if (!stored) {
    return new NextResponse(`File not found: ${filename}`, { status: 404 })
  }

  let content: string
  let mimeType: string

  try {
    const parsed = JSON.parse(stored) as { content: string; mimeType: string }
    content = parsed.content
    mimeType = parsed.mimeType
  } catch {
    content = stored
    mimeType = 'text/html; charset=utf-8'
  }

  // Determine MIME from extension if not set
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'html'
  const finalMime = mimeType || MIME_TYPES[ext] || 'text/plain'

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': finalMime,
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
      ].join('; '),
    },
  })
}
