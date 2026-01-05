# 🔐 Security Best Practices

## 1. Always Use Server-Side Auth

### ✅ Good - Server Component
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Page() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  return <Dashboard user={session.user} />
}
```

### ❌ Bad - Client Component Only
```typescript
'use client'
import { useSession } from 'next-auth/react'

export default function Page() {
  const { data: session } = useSession()
  
  // Can be bypassed by disabling JavaScript!
  if (!session) return <div>Please sign in</div>
  
  return <Dashboard />
}
```

**Why?** Client-side checks can be bypassed. Always verify authentication on the server.

---

## 2. Protect All API Routes

### ✅ Good - Protected Route
```typescript
import { withAuth } from '@/lib/api-middleware'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (req, context, session) => {
  // session.user is guaranteed to exist
  const data = await req.json()
  
  const result = await createResource({
    ...data,
    userId: session.user.id
  })
  
  return NextResponse.json({ result })
})
```

### ❌ Bad - Unprotected Route
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const data = await req.json()
  
  // Anyone can access this!
  const result = await createResource(data)
  
  return NextResponse.json({ result })
}
```

**Why?** Unprotected routes expose your data to unauthorized access.

---

## 3. Check Permissions Before Actions

### ✅ Good - Permission Check
```typescript
import { checkUserPermission, incrementUsage } from '@/lib/auth'
import { withAuth } from '@/lib/api-middleware'

export const POST = withAuth(async (req, context, session) => {
  const permission = await checkUserPermission(
    session.user.id, 
    'create_database'
  )
  
  if (!permission.allowed) {
    return NextResponse.json(
      { error: permission.reason },
      { status: 429 }
    )
  }
  
  const database = await prisma.databaseConnection.create({
    data: {
      ...await req.json(),
      userId: session.user.id
    }
  })
  
  return NextResponse.json({ database })
})
```

### ❌ Bad - No Permission Check
```typescript
export const POST = withAuth(async (req, context, session) => {
  // No limit checking!
  const database = await prisma.databaseConnection.create({
    data: {
      ...await req.json(),
      userId: session.user.id
    }
  })
  
  return NextResponse.json({ database })
})
```

**Why?** Users might exceed their tier limits, costing you money or resources.

---

## 4. Verify Resource Ownership

### ✅ Good - Ownership Verification
```typescript
import { compose, withAuth, withResourceOwnership } from '@/lib/api-middleware'

export const DELETE = compose(
  withResourceOwnership('project', (params) => params.id),
  withAuth
)(async (req, context, session) => {
  // Ownership verified!
  await prisma.project.delete({
    where: { id: context.params.id }
  })
  
  return NextResponse.json({ success: true })
})
```

### ❌ Bad - No Ownership Check
```typescript
export const DELETE = withAuth(async (req, { params }: any) => {
  // Anyone can delete any project!
  await prisma.project.delete({
    where: { id: params.id }
  })
  
  return NextResponse.json({ success: true })
})
```

**Why?** Users could modify or delete resources they don't own.

---

## 5. Use Rate Limiting

### ✅ Good - Rate Limited
```typescript
import { compose, withRateLimit, withAuth } from '@/lib/api-middleware'

export const POST = compose(
  withRateLimit(10, 60000), // 10 requests per minute
  withAuth
)(async (req, context, session) => {
  // Protected from abuse
  const result = await expensiveOperation()
  return NextResponse.json({ result })
})
```

### ❌ Bad - No Rate Limiting
```typescript
export const POST = withAuth(async (req, context, session) => {
  // Can be spammed!
  const result = await expensiveOperation()
  return NextResponse.json({ result })
})
```

**Why?** Prevents abuse, DDoS attacks, and excessive resource usage.

---

## 6. Validate Input Data

### ✅ Good - Input Validation
```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(120),
})

export const POST = withAuth(async (req, context, session) => {
  const body = await req.json()
  
  // Validate input
  const result = schema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error },
      { status: 400 }
    )
  }
  
  // Use validated data
  const user = await createUser(result.data)
  return NextResponse.json({ user })
})
```

### ❌ Bad - No Validation
```typescript
export const POST = withAuth(async (req, context, session) => {
  const body = await req.json()
  
  // Directly using unvalidated input!
  const user = await createUser(body)
  return NextResponse.json({ user })
})
```

**Why?** Prevents injection attacks, data corruption, and crashes.

---

## 7. Sanitize User Input

### ✅ Good - Sanitized Output
```typescript
import DOMPurify from 'isomorphic-dompurify'

export const POST = withAuth(async (req, context, session) => {
  const { content } = await req.json()
  
  // Sanitize HTML content
  const sanitized = DOMPurify.sanitize(content)
  
  await prisma.post.create({
    data: {
      content: sanitized,
      userId: session.user.id
    }
  })
  
  return NextResponse.json({ success: true })
})
```

### ❌ Bad - Unsanitized Input
```typescript
export const POST = withAuth(async (req, context, session) => {
  const { content } = await req.json()
  
  // XSS vulnerability!
  await prisma.post.create({
    data: {
      content, // Could contain malicious scripts
      userId: session.user.id
    }
  })
  
  return NextResponse.json({ success: true })
})
```

**Why?** Prevents XSS attacks and malicious code injection.

---

## 8. Use Environment Variables

### ✅ Good - Environment Variables
```typescript
// .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="complex-random-string"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

// In code
const secret = process.env.NEXTAUTH_SECRET
```

### ❌ Bad - Hardcoded Secrets
```typescript
// Committing secrets to git!
const secret = "my-super-secret-key"
const apiKey = "sk_live_12345..."
```

**Why?** Prevents exposing sensitive credentials in version control.

---

## 9. Implement Proper Error Handling

### ✅ Good - Safe Error Handling
```typescript
export const POST = withAuth(async (req, context, session) => {
  try {
    const data = await riskyOperation()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Operation failed:', error)
    
    // Don't expose internal errors to users
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    )
  }
})
```

### ❌ Bad - Exposed Error Details
```typescript
export const POST = withAuth(async (req, context, session) => {
  try {
    const data = await riskyOperation()
    return NextResponse.json({ data })
  } catch (error: any) {
    // Exposes internal details!
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
})
```

**Why?** Prevents information leakage about your system internals.

---

## 10. Log Security Events

### ✅ Good - Event Logging
```typescript
import { logSecurityEvent } from '@/lib/auth'

export const POST = withAuth(async (req, context, session) => {
  await logSecurityEvent(session.user.id, 'project_created', {
    projectId: newProject.id,
    ip: req.headers.get('x-forwarded-for')
  })
  
  return NextResponse.json({ success: true })
})
```

### ❌ Bad - No Logging
```typescript
export const POST = withAuth(async (req, context, session) => {
  // No audit trail!
  await createProject()
  return NextResponse.json({ success: true })
})
```

**Why?** Helps detect and investigate security incidents.

---

## Complete Secure API Route Example

```typescript
// app/api/projects/route.ts
import { z } from 'zod'
import { compose, withAuth, withRateLimit, withUsageCheck } from '@/lib/api-middleware'
import { incrementUsage, logSecurityEvent } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import DOMPurify from 'isomorphic-dompurify'

// Input validation schema
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const POST = compose(
  withRateLimit(20, 60000),        // Rate limiting
  withUsageCheck('create_project'), // Usage limits
  withAuth                          // Authentication
)(async (req, context, session) => {
  try {
    const body = await req.json()
    
    // Validate input
    const result = createProjectSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error },
        { status: 400 }
      )
    }
    
    // Sanitize input
    const sanitizedData = {
      name: DOMPurify.sanitize(result.data.name),
      description: result.data.description 
        ? DOMPurify.sanitize(result.data.description)
        : undefined,
    }
    
    // Create project
    const project = await prisma.project.create({
      data: {
        ...sanitizedData,
        userId: session.user.id,
      },
    })
    
    // Increment usage
    await incrementUsage(session.user.id, 'project')
    
    // Log event
    await logSecurityEvent(session.user.id, 'project_created', {
      projectId: project.id,
      ip: req.headers.get('x-forwarded-for'),
    })
    
    return NextResponse.json({ project }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to create project:', error)
    
    // Don't expose error details
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
})
```

## Security Checklist

Before deploying, ensure:

- [ ] All API routes are protected with authentication
- [ ] Resource ownership is verified for user-specific operations
- [ ] Usage limits are checked before actions
- [ ] Rate limiting is implemented on all public endpoints
- [ ] Input validation is performed on all user data
- [ ] User input is sanitized before storage or display
- [ ] Secrets are stored in environment variables
- [ ] Error messages don't expose internal details
- [ ] Security events are logged
- [ ] HTTPS is enforced in production
- [ ] CORS is properly configured
- [ ] SQL injection is prevented (use Prisma ORM)
- [ ] XSS is prevented (sanitize HTML)
- [ ] CSRF tokens are used for sensitive operations
