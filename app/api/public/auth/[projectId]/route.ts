// app/api/public/auth/[projectId]/route.ts
// Per-project authentication for generated sites.
// Handles register, login, and token verification for end-users of generated HTML sites.
// This is a PUBLIC endpoint — no BuildFlow session required.
//
// POST body: { action: 'register' | 'login' | 'me', email, password, name? }
//   - register: create new ProjectUser, return JWT
//   - login: verify password, update lastLoginAt, return JWT
//   - me: verify JWT, return user profile
//
// JWTs are signed with NEXTAUTH_SECRET + projectId so tokens from one project
// cannot be used on another project.

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// CORS headers — generated sites may be hosted on any origin (downloaded + self-hosted)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// OPTIONS preflight — browsers send this before cross-origin POST
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

const TOKEN_EXPIRY = '7d'

function getJwtSecret(projectId: string): Uint8Array {
  const base = process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET
  if (!base) throw new Error('NEXTAUTH_SECRET is not set')
  // Scope the secret to this project so tokens can't cross projects
  return new TextEncoder().encode(`${base}:project:${projectId}`)
}

async function signProjectToken(payload: {
  sub: string
  projectId: string
  email: string
  name?: string | null
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret(payload.projectId))
}

interface ProjectTokenPayload {
  sub: string
  projectId: string
  email: string
  name?: string | null
}

async function verifyProjectToken(
  token: string,
  projectId: string
): Promise<ProjectTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(projectId))
  return payload as unknown as ProjectTokenPayload
}

// Wrapper so every response from this public endpoint carries CORS headers
function corsJson(data: unknown, init?: ResponseInit): NextResponse {
  return corsJson(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) },
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    // Rate limit: 20 auth requests per 10 minutes per IP
    const rateLimit = await checkRateLimit(request, 'external')
    if (!rateLimit.success) {
      return corsJson(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          },
        }
      )
    }

    const { projectId } = await context.params

    // Verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    })
    if (!project) {
      return corsJson({ error: 'Project not found' }, { status: 404 })
    }

    let body: { action: string; email?: string; password?: string; name?: string; token?: string }
    try {
      body = await request.json()
    } catch {
      return corsJson({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { action } = body

    // ── REGISTER ────────────────────────────────────────────────────────────
    if (action === 'register') {
      const { email, password, name } = body
      if (!email || !password) {
        return corsJson({ error: 'Email and password are required' }, { status: 400 })
      }
      if (password.length < 8) {
        return corsJson({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      const emailLower = email.toLowerCase().trim()

      // Check for existing user in this project
      const existing = await prisma.projectUser.findUnique({
        where: { projectId_email: { projectId, email: emailLower } },
      })
      if (existing) {
        return corsJson({ error: 'An account with this email already exists' }, { status: 409 })
      }

      const passwordHash = await bcryptjs.hash(password, 12)
      const user = await prisma.projectUser.create({
        data: {
          projectId,
          email: emailLower,
          passwordHash,
          name: name?.trim() || null,
          lastLoginAt: new Date(),
        },
      })

      const token = await signProjectToken({
        sub: user.id,
        projectId,
        email: user.email,
        name: user.name,
      })

      return corsJson({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name },
      })
    }

    // ── LOGIN ────────────────────────────────────────────────────────────────
    if (action === 'login') {
      const { email, password } = body
      if (!email || !password) {
        return corsJson({ error: 'Email and password are required' }, { status: 400 })
      }
      const emailLower = email.toLowerCase().trim()

      const user = await prisma.projectUser.findUnique({
        where: { projectId_email: { projectId, email: emailLower } },
      })

      // Constant-time response to prevent user enumeration
      const passwordMatch = user
        ? await bcryptjs.compare(password, user.passwordHash)
        : await bcryptjs.compare(password, '$2b$12$invalidhashforenumerationprotection')

      if (!user || !passwordMatch) {
        return corsJson({ error: 'Invalid email or password' }, { status: 401 })
      }

      await prisma.projectUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })

      const token = await signProjectToken({
        sub: user.id,
        projectId,
        email: user.email,
        name: user.name,
      })

      return corsJson({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name },
      })
    }

    // ── ME (token verification) ──────────────────────────────────────────────
    if (action === 'me') {
      const authHeader = request.headers.get('Authorization')
      const token = body.token ?? authHeader?.replace('Bearer ', '')
      if (!token) {
        return corsJson({ error: 'No token provided' }, { status: 401 })
      }

      try {
        const payload = await verifyProjectToken(token, projectId)
        const user = await prisma.projectUser.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, createdAt: true, lastLoginAt: true },
        })
        if (!user) {
          return corsJson({ error: 'User not found' }, { status: 401 })
        }
        return corsJson({ success: true, user })
      } catch {
        return corsJson({ error: 'Invalid or expired token' }, { status: 401 })
      }
    }

    return corsJson({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[public/auth] error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: list project users (BuildFlow dashboard — requires project ownership)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return corsJson({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await context.params

    // Verify the BuildFlow user owns this project
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: (session.user as { id: string }).id },
      select: { id: true },
    })
    if (!project) {
      return corsJson({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const users = await prisma.projectUser.findMany({
      where: { projectId },
      select: { id: true, email: true, name: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return corsJson({ users, total: users.length })
  } catch (err) {
    console.error('[public/auth] GET error:', err)
    return corsJson({ error: 'Internal server error' }, { status: 500 })
  }
}
