import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { randomBytes } from 'crypto'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 20 preview sessions per user per minute — prevents Redis abuse
const previewRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: false,
  prefix: 'ratelimit:preview-session',
})

const TTL_SECONDS = 20 * 60 // 20 minutes

// Allowlist of MIME types that can be stored and served
const ALLOWED_MIME_TYPES = new Set([
  'text/html', 'text/html; charset=utf-8',
  'text/css', 'text/css; charset=utf-8',
  'application/javascript', 'application/javascript; charset=utf-8',
  'application/json',
  'image/svg+xml',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/x-icon',
  'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
  'text/plain', 'text/plain; charset=utf-8',
])

export interface PreviewFile {
  filename: string // e.g. "index.html", "about.html", "styles.css"
  content: string
  mimeType: string
}

/** Sanitise a filename the same way the file-server GET handler does */
function sanitiseFilename(raw: string): string {
  return raw
    .replace(/^\/+/, '')                        // strip leading slashes
    .split('/')
    .map(seg => seg.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._\-]/g, ''))
    .filter(Boolean)
    .join('/')
}

// POST /api/preview-session — store files and return session ID
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 20 sessions/min per user
  const { success, reset } = await previewRateLimit.limit(session.user.id)
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many preview requests. Please wait before retrying.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  let body: { files: PreviewFile[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { files } = body

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  // Cap at 50 files, 512 KB per file, 2 MB total to prevent abuse
  const MAX_FILES = 50
  const MAX_FILE_BYTES = 512 * 1024
  const MAX_TOTAL_BYTES = 2 * 1024 * 1024
  const safeFiles = files.slice(0, MAX_FILES)

  for (const f of safeFiles) {
    if (typeof f.content === 'string' && f.content.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `File "${f.filename}" exceeds 512 KB limit` }, { status: 413 })
    }
  }

  const totalBytes = safeFiles.reduce((acc, f) => acc + (f.content?.length ?? 0), 0)
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: 'Total content too large (max 2 MB)' }, { status: 413 })
  }

  const sessionId = randomBytes(16).toString('hex')
  const key = `preview:files:${sessionId}`

  // Store as a hash of filename -> {content, mimeType}
  const payload: Record<string, string> = {}
  for (const file of safeFiles) {
    if (!file.filename || typeof file.content !== 'string') continue
    // Sanitise filename at write time (mirrors the GET handler sanitisation)
    const name = sanitiseFilename(file.filename)
    if (!name) continue
    // Validate MIME type; fall back to text/html for unknown types
    const mime = ALLOWED_MIME_TYPES.has(file.mimeType) ? file.mimeType : 'text/html; charset=utf-8'
    payload[name] = JSON.stringify({ content: file.content, mimeType: mime })
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No valid files after sanitisation' }, { status: 400 })
  }

  await redis.hset(key, payload)
  await redis.expire(key, TTL_SECONDS)

  return NextResponse.json({ sessionId, ttl: TTL_SECONDS })
}
