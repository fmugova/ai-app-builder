# 🔒 API Route Protection

## Available Middleware

- **withAuth** - Requires authentication
- **withAdmin** - Requires admin role
- **withSubscription(tier)** - Requires minimum subscription tier
- **withUsageCheck(action)** - Checks usage limits
- **withResourceOwnership(type, getId)** - Verifies resource ownership
- **withRateLimit(max, window)** - Rate limiting
- **compose(...)** - Combines multiple middleware

## Basic Example

```typescript
import { withAuth } from '@/lib/api-middleware'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (req, context, session) => {
  // session.user is guaranteed to exist
  const userId = session.user.id
  
  // Your logic here
  return NextResponse.json({ success: true })
})
```

## Advanced Example (Multiple Middleware)

```typescript
import { 
  compose, 
  withAuth, 
  withSubscription, 
  withUsageCheck,
  withRateLimit 
} from '@/lib/api-middleware'
import { NextResponse } from 'next/server'

export const POST = compose(
  withRateLimit(20),               // Max 20 requests per minute
  withUsageCheck('create_project'), // Check project limits
  withSubscription('pro'),          // Requires Pro subscription
  withAuth                          // Requires authentication
)(async (req, context, session) => {
  // All checks passed!
  const body = await req.json()
  
  // Your logic here
  return NextResponse.json({ success: true })
})
```

## Resource Ownership Example

```typescript
import { compose, withAuth, withResourceOwnership } from '@/lib/api-middleware'
import { NextResponse } from 'next/server'

export const DELETE = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  const projectId = context.params.id
  
  // User owns this project, safe to delete
  await prisma.project.delete({ where: { id: projectId } })
  
  return NextResponse.json({ success: true })
})
```

## Admin-Only Route

```typescript
import { withAdmin } from '@/lib/api-middleware'
import { NextResponse } from 'next/server'

export const GET = withAdmin(async (req, context, session) => {
  // Only admins can access this
  const users = await prisma.user.findMany()
  
  return NextResponse.json({ users })
})
```

## Subscription Tier Check

```typescript
import { compose, withAuth, withSubscription } from '@/lib/api-middleware'
import { NextResponse } from 'next/server'

export const POST = compose(
  withSubscription('business'), // Requires Business or Enterprise
  withAuth
)(async (req, context, session) => {
  // Business/Enterprise feature
  return NextResponse.json({ success: true })
})
```

## Usage Limit Check

```typescript
import { compose, withAuth, withUsageCheck } from '@/lib/api-middleware'
import { incrementUsage } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const POST = compose(
  withUsageCheck('create_database'),
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  // Create database
  const db = await prisma.databaseConnection.create({
    data: {
      userId: session.user.id,
      ...body
    }
  })
  
  return NextResponse.json({ database: db })
})
```

## Rate Limiting

```typescript
import { compose, withRateLimit, withAuth } from '@/lib/api-middleware'
import { NextResponse } from 'next/server'

export const POST = compose(
  withRateLimit(10, 60000), // 10 requests per minute
  withAuth
)(async (req, context, session) => {
  // Rate-limited endpoint
  return NextResponse.json({ success: true })
})
```

## Error Responses

Each middleware returns specific error codes:

- **401 Unauthorized** - Not authenticated (withAuth)
- **403 Forbidden** - Insufficient permissions (withAdmin, withSubscription)
- **404 Not Found** - Resource not found or no access (withResourceOwnership)
- **429 Too Many Requests** - Rate limit exceeded or usage limit reached

## Complete Example

```typescript
// app/api/projects/[id]/route.ts
import { 
  compose, 
  withAuth, 
  withResourceOwnership,
  withRateLimit 
} from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/projects/[id]
export const GET = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  const project = await prisma.project.findUnique({
    where: { id: context.params.id }
  })
  
  return NextResponse.json({ project })
})

// PUT /api/projects/[id]
export const PUT = compose(
  withRateLimit(30),
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  const body = await req.json()
  
  const project = await prisma.project.update({
    where: { id: context.params.id },
    data: body
  })
  
  return NextResponse.json({ project })
})

// DELETE /api/projects/[id]
export const DELETE = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  await prisma.project.delete({
    where: { id: context.params.id }
  })
  
  return NextResponse.json({ success: true })
})
```
