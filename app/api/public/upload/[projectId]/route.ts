// app/api/public/upload/[projectId]/route.ts
// Public file upload proxy for generated sites.
// Accepts multipart/form-data with a "file" field, stores in Vercel Blob,
// and returns the public URL. Rate-limited to prevent abuse.
//
// POST /api/public/upload/[projectId]
//   Content-Type: multipart/form-data
//   Body: file (required), filename (optional override)

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function corsJson(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) },
  })
}

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
])

const MAX_SIZE = 4.5 * 1024 * 1024 // 4.5 MB

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const rl = await checkRateLimit(request, 'external')
    if (!rl.success) {
      return corsJson({ error: 'Too many requests. Please try again later.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) },
      })
    }

    const { projectId } = await context.params

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })
    if (!project) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return corsJson({ error: 'File storage is not configured.' }, { status: 503 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return corsJson({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) {
      return corsJson({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return corsJson(
        { error: `File type "${file.type}" is not allowed.` },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return corsJson(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 4.5 MB.` },
        { status: 413 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const pathname = `uploads/${projectId}/${uniqueId}.${ext}`

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    })

    return corsJson(
      { url: blob.url, filename: file.name, size: file.size, mimeType: file.type },
      { status: 201 }
    )
  } catch (err) {
    console.error('[public/upload] POST error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}
