# 🔄 API Routes Migration Guide

## Overview

This guide shows how to migrate from unprotected API routes to properly secured routes using our middleware.

---

## Example 1: Projects API

### ❌ BEFORE (Unprotected)

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // No auth check!
  const projects = await prisma.project.findMany()
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  // No validation, no rate limiting, no usage check!
  const project = await prisma.project.create({
    data: body
  })
  
  return NextResponse.json({ project })
}
```

### ✅ AFTER (Protected)

```typescript
// app/api/projects/route.ts
import { compose, withAuth, withRateLimit, withUsageCheck } from '@/lib/api-middleware'
import { incrementUsage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const GET = compose(
  withRateLimit(100),
  withAuth
)(async (req, context, session) => {
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  
  return NextResponse.json({ projects })
})

export const POST = compose(
  withRateLimit(20),
  withUsageCheck('create_project'),
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  // Validate input
  const result = createProjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error },
      { status: 400 }
    )
  }
  
  const project = await prisma.project.create({
    data: {
      ...result.data,
      userId: session.user.id,
    },
  })
  
  // Increment usage
  await incrementUsage(session.user.id, 'project')
  
  return NextResponse.json({ project }, { status: 201 })
})
```

---

## Example 2: Project Detail API

### ❌ BEFORE (Unprotected)

```typescript
// app/api/projects/[id]/route.ts
export async function GET(req: NextRequest, { params }: any) {
  const project = await prisma.project.findUnique({
    where: { id: params.id }
  })
  return NextResponse.json({ project })
}

export async function DELETE(req: NextRequest, { params }: any) {
  await prisma.project.delete({
    where: { id: params.id }
  })
  return NextResponse.json({ success: true })
}
```

### ✅ AFTER (Protected)

```typescript
// app/api/projects/[id]/route.ts
import { compose, withAuth, withResourceOwnership } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const GET = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  const project = await prisma.project.findUnique({
    where: { id: context.params.id },
    include: {
      pages: true,
      customDomains: true,
    },
  })
  
  return NextResponse.json({ project })
})

export const PUT = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  const project = await prisma.project.update({
    where: { id: context.params.id },
    data: body,
  })
  
  return NextResponse.json({ project })
})

export const DELETE = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  await prisma.project.delete({
    where: { id: context.params.id },
  })
  
  return NextResponse.json({ success: true })
})
```

---

## Example 3: Admin Routes

### ❌ BEFORE (Unprotected)

```typescript
// app/api/admin/users/route.ts
export async function GET(req: NextRequest) {
  const users = await prisma.user.findMany()
  return NextResponse.json({ users })
}
```

### ✅ AFTER (Protected)

```typescript
// app/api/admin/users/route.ts
import { withAdmin } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const GET = withAdmin(async (req, context, session) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      subscriptionTier: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  
  return NextResponse.json({ users })
})
```

---

## Example 4: Database Connections (Pro Feature)

### ❌ BEFORE (Unprotected)

```typescript
// app/api/databases/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json()
  
  const db = await prisma.databaseConnection.create({
    data: body
  })
  
  return NextResponse.json({ database: db })
}
```

### ✅ AFTER (Protected)

```typescript
// app/api/databases/route.ts
import { compose, withAuth, withSubscription, withUsageCheck } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createDatabaseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['postgres', 'mysql', 'mongodb']),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
})

export const GET = compose(
  withSubscription('pro'),
  withAuth
)(async (req, context, session) => {
  const databases = await prisma.databaseConnection.findMany({
    where: { userId: session.user.id },
  })
  
  return NextResponse.json({ databases })
})

export const POST = compose(
  withUsageCheck('create_database'),
  withSubscription('pro'),
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  const result = createDatabaseSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error },
      { status: 400 }
    )
  }
  
  const db = await prisma.databaseConnection.create({
    data: {
      ...result.data,
      userId: session.user.id,
    },
  })
  
  return NextResponse.json({ database: db }, { status: 201 })
})
```

---

## Example 5: AI Generation Endpoint

### ❌ BEFORE (Unprotected)

```typescript
// app/api/generate/route.ts
export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  
  const result = await generateWithAI(prompt)
  
  return NextResponse.json({ result })
}
```

### ✅ AFTER (Protected)

```typescript
// app/api/generate/route.ts
import { compose, withAuth, withRateLimit } from '@/lib/api-middleware'
import { checkUserPermission, incrementUsage } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const generateSchema = z.object({
  prompt: z.string().min(10).max(1000),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo']).default('gpt-3.5-turbo'),
})

export const POST = compose(
  withRateLimit(10, 60000), // 10 per minute
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  // Validate input
  const result = generateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error },
      { status: 400 }
    )
  }
  
  // Check generation limits
  const permission = await checkUserPermission(
    session.user.id,
    'create_project' // Using project permission as proxy
  )
  
  if (!permission.allowed) {
    return NextResponse.json(
      { error: permission.reason },
      { status: 429 }
    )
  }
  
  // Generate with AI
  const aiResult = await generateWithAI(result.data.prompt, result.data.model)
  
  // Increment usage
  await incrementUsage(session.user.id, 'generation')
  
  return NextResponse.json({ result: aiResult })
})
```

---

## Migration Checklist

When migrating an API route, ensure you:

- [ ] Replace `async function` with `export const` + middleware
- [ ] Add authentication with `withAuth`
- [ ] Add rate limiting with `withRateLimit`
- [ ] Add subscription checks if needed with `withSubscription`
- [ ] Add usage limit checks with `withUsageCheck`
- [ ] Add resource ownership checks with `withResourceOwnership`
- [ ] Validate input with Zod schemas
- [ ] Only return user's own data (check `userId`)
- [ ] Increment usage counters where appropriate
- [ ] Add proper error handling
- [ ] Remove any exposed sensitive data from responses

## Quick Reference

```typescript
// Simple auth
export const GET = withAuth(handler)

// Auth + Rate Limit
export const POST = compose(
  withRateLimit(20),
  withAuth
)(handler)

// Full protection
export const POST = compose(
  withRateLimit(20),
  withUsageCheck('create_project'),
  withSubscription('pro'),
  withAuth
)(handler)

// Resource ownership
export const DELETE = compose(
  withResourceOwnership('project', params => params.id),
  withAuth
)(handler)

// Admin only
export const GET = withAdmin(handler)
```
