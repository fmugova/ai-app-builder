import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Redis } from '@upstash/redis'
import { randomBytes } from 'crypto'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TTL_SECONDS = 20 * 60 // 20 minutes

export interface PreviewFile {
  filename: string // e.g. "index.html", "about.html", "styles.css"
  content: string
  mimeType: string
}

// POST /api/preview-session — store files and return session ID
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { files }: { files: PreviewFile[] } = await req.json()

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  // Cap at 50 files and 2MB total to prevent abuse
  const MAX_FILES = 50
  const MAX_TOTAL_BYTES = 2 * 1024 * 1024
  const safeFiles = files.slice(0, MAX_FILES)
  const totalBytes = safeFiles.reduce((acc, f) => acc + (f.content?.length ?? 0), 0)
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: 'Total content too large' }, { status: 413 })
  }

  const sessionId = randomBytes(16).toString('hex')
  const key = `preview:files:${sessionId}`

  // Store as a hash of filename -> {content, mimeType}
  const payload: Record<string, string> = {}
  for (const file of safeFiles) {
    if (!file.filename || typeof file.content !== 'string') continue
    // Normalise: strip leading slash
    const name = file.filename.replace(/^\/+/, '')
    payload[name] = JSON.stringify({ content: file.content, mimeType: file.mimeType || 'text/html' })
  }

  await redis.hset(key, payload)
  await redis.expire(key, TTL_SECONDS)

  return NextResponse.json({ sessionId, ttl: TTL_SECONDS })
}
