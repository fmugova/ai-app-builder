import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const MAX_SIZE = 4.5 * 1024 * 1024 // 4.5 MB — Next.js server upload limit

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Image storage is not configured. Add BLOB_READ_WRITE_TOKEN to your environment.' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `File type "${file.type}" is not allowed. Upload JPEG, PNG, GIF, WebP, or SVG.` },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 4.5 MB.` },
      { status: 400 }
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const pathname = `assets/${session.user.id}/${uniqueId}.${ext}`

  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file.type,
  })

  return NextResponse.json({
    url: blob.url,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  })
}
