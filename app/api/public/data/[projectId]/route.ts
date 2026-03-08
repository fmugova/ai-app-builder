// app/api/public/data/[projectId]/route.ts
// Generic data persistence API for generated sites.
// Allows generated HTML sites to store, retrieve, update and delete records
// in named collections (e.g. "tasks", "inventory", "notes").
//
// Authentication (optional): pass Authorization: Bearer <jwt> where the JWT was
// issued by /api/public/auth/[projectId]. When a valid token is present all
// reads and writes are scoped to that ProjectUser (projectUserId). Without a
// token the data is treated as public/shared (projectUserId = null).
//
// GET    /api/public/data/[projectId]?collection=tasks[&limit=100][&offset=0]
// POST   /api/public/data/[projectId]          body: { collection, data }
// PATCH  /api/public/data/[projectId]?id=[id]  body: { data }
// DELETE /api/public/data/[projectId]?id=[id]

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { jwtVerify } from 'jose'

export const runtime = 'nodejs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

const MAX_COLLECTION_SIZE = 1000  // records per collection
const MAX_RECORD_BYTES    = 32_768 // 32 KB per record

async function verifyProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
}

// Extract the projectUserId from an optional Bearer JWT.
// Returns null if no token, invalid token, or wrong project.
// Never throws — fail-open so missing/expired tokens just mean public access.
async function extractUserId(request: NextRequest, projectId: string): Promise<string | null> {
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  if (!token) return null
  try {
    const base = process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET
    if (!base) return null
    const secret = new TextEncoder().encode(`${base}:project:${projectId}`)
    const { payload } = await jwtVerify(token, secret)
    const userId = payload.sub as string | undefined
    // Ensure token was issued for this project
    if (!userId || payload.projectId !== projectId) return null
    return userId
  } catch {
    return null
  }
}

// ── GET — list records in a collection ────────────────────────────────────────
export async function GET(
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
    if (!await verifyProject(projectId)) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
    }

    const projectUserId = await extractUserId(request, projectId)

    const { searchParams } = new URL(request.url)
    const collection = searchParams.get('collection') || 'default'
    const limit      = Math.min(parseInt(searchParams.get('limit')  || '100'), 500)
    const offset     = Math.max(parseInt(searchParams.get('offset') || '0'),   0)

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(collection)) {
      return corsJson({ error: 'Invalid collection name' }, { status: 400 })
    }

    // When a user token is present, return only that user's records.
    // Without a token, return records with no owner (public/shared collections).
    const userFilter = projectUserId
      ? { projectUserId }
      : { projectUserId: null }

    const [records, total] = await prisma.$transaction([
      prisma.projectData.findMany({
        where: { projectId, collection, ...userFilter },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, data: true, createdAt: true, updatedAt: true },
      }),
      prisma.projectData.count({ where: { projectId, collection, ...userFilter } }),
    ])

    return corsJson({ records, total, limit, offset })
  } catch (err) {
    console.error('[public/data] GET error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — create a record ─────────────────────────────────────────────────────
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
    if (!await verifyProject(projectId)) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
    }

    const projectUserId = await extractUserId(request, projectId)

    let body: { collection?: string; data?: unknown }
    try { body = await request.json() }
    catch { return corsJson({ error: 'Invalid JSON' }, { status: 400 }) }

    const collection = body.collection || 'default'
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(collection)) {
      return corsJson({ error: 'Invalid collection name' }, { status: 400 })
    }
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return corsJson({ error: 'data must be a JSON object' }, { status: 400 })
    }
    if (JSON.stringify(body.data).length > MAX_RECORD_BYTES) {
      return corsJson({ error: 'Record too large (max 32 KB)' }, { status: 413 })
    }

    // Count only this user's records (or public records) to enforce the cap
    const userFilter = projectUserId ? { projectUserId } : { projectUserId: null }
    const count = await prisma.projectData.count({ where: { projectId, collection, ...userFilter } })
    if (count >= MAX_COLLECTION_SIZE) {
      return corsJson(
        { error: `Collection is full (max ${MAX_COLLECTION_SIZE} records). Delete old records first.` },
        { status: 429 }
      )
    }

    const record = await prisma.projectData.create({
      data: { projectId, collection, data: body.data as object, projectUserId },
      select: { id: true, data: true, createdAt: true, updatedAt: true },
    })

    return corsJson({ record }, { status: 201 })
  } catch (err) {
    console.error('[public/data] POST error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH — update a record ────────────────────────────────────────────────────
export async function PATCH(
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
    if (!await verifyProject(projectId)) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
    }

    const projectUserId = await extractUserId(request, projectId)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return corsJson({ error: 'Record id required (?id=...)' }, { status: 400 })

    let body: { data?: unknown }
    try { body = await request.json() }
    catch { return corsJson({ error: 'Invalid JSON' }, { status: 400 }) }

    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return corsJson({ error: 'data must be a JSON object' }, { status: 400 })
    }

    // Enforce ownership: if token present, record must belong to same user
    const ownerFilter = projectUserId ? { projectUserId } : { projectUserId: null }
    const existing = await prisma.projectData.findFirst({
      where: { id, projectId, ...ownerFilter },
      select: { id: true, data: true },
    })
    if (!existing) return corsJson({ error: 'Record not found' }, { status: 404 })

    const merged = { ...(existing.data as object), ...(body.data as object) }

    const record = await prisma.projectData.update({
      where: { id },
      data: { data: merged },
      select: { id: true, data: true, createdAt: true, updatedAt: true },
    })

    return corsJson({ record })
  } catch (err) {
    console.error('[public/data] PATCH error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE — remove a record ───────────────────────────────────────────────────
export async function DELETE(
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
    if (!await verifyProject(projectId)) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
    }

    const projectUserId = await extractUserId(request, projectId)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return corsJson({ error: 'Record id required (?id=...)' }, { status: 400 })

    const ownerFilter = projectUserId ? { projectUserId } : { projectUserId: null }
    const existing = await prisma.projectData.findFirst({
      where: { id, projectId, ...ownerFilter },
      select: { id: true },
    })
    if (!existing) return corsJson({ error: 'Record not found' }, { status: 404 })

    await prisma.projectData.delete({ where: { id } })

    return corsJson({ success: true })
  } catch (err) {
    console.error('[public/data] DELETE error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}
