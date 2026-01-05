# 📊 Checking Usage Limits Programmatically

## Available Functions

### checkUserPermission(userId, action)

Checks if a user can perform a specific action based on their subscription tier.

**Actions:**
- `'create_project'` - Check project creation limit
- `'create_database'` - Check database limit
- `'add_domain'` - Check custom domain limit
- `'invite_member'` - Check team member limit

**Returns:**
```typescript
{
  allowed: boolean
  reason?: string  // Only present if allowed is false
}
```

## Basic Usage

```typescript
import { checkUserPermission } from '@/lib/auth'
import { NextResponse } from 'next/server'

const permission = await checkUserPermission(userId, 'create_project')

if (!permission.allowed) {
  return NextResponse.json(
    { error: permission.reason },
    { status: 429 }
  )
}

// Proceed with creating the project
```

## Complete API Route Example

```typescript
// app/api/projects/route.ts
import { checkUserPermission, incrementUsage } from '@/lib/auth'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (req, context, session) => {
  const userId = session.user.id

  // Check if user can create a project
  const permission = await checkUserPermission(userId, 'create_project')

  if (!permission.allowed) {
    return NextResponse.json(
      { error: permission.reason },
      { status: 429 }
    )
  }

  // Parse request body
  const body = await req.json()
  const { name, description } = body

  // Create the project
  const project = await prisma.project.create({
    data: {
      name,
      description,
      userId,
    },
  })

  // Increment usage counter
  await incrementUsage(userId, 'project')

  return NextResponse.json({ project }, { status: 201 })
})
```

## With API Middleware

The `withUsageCheck` middleware automatically handles limit checking:

```typescript
import { compose, withAuth, withUsageCheck } from '@/lib/api-middleware'
import { incrementUsage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const POST = compose(
  withUsageCheck('create_project'),  // Automatic limit check
  withAuth
)(async (req, context, session) => {
  const body = await req.json()

  const project = await prisma.project.create({
    data: {
      ...body,
      userId: session.user.id,
    },
  })

  // Don't forget to increment!
  await incrementUsage(session.user.id, 'project')

  return NextResponse.json({ project }, { status: 201 })
})
```

## Check Multiple Limits

```typescript
import { checkUserPermission } from '@/lib/auth'

async function canCreateAdvancedProject(userId: string) {
  const checks = await Promise.all([
    checkUserPermission(userId, 'create_project'),
    checkUserPermission(userId, 'create_database'),
    checkUserPermission(userId, 'add_domain'),
  ])

  const failed = checks.find(check => !check.allowed)
  
  if (failed) {
    return { allowed: false, reason: failed.reason }
  }

  return { allowed: true }
}
```

## Get Current Limits

```typescript
import { getUserLimits } from '@/lib/auth'

const limits = await getUserLimits(userId)

console.log(limits)
// {
//   tier: 'pro',
//   limits: {
//     projectsPerMonth: 20,
//     generationsPerMonth: 500,
//     customDomains: 5,
//     databases: 3,
//     teamMembers: 3
//   },
//   usage: {
//     projects: 5,
//     generations: 150
//   }
// }
```

## Client-Side Usage Display

```typescript
// components/UsageBadge.tsx
'use client'

import { useEffect, useState } from 'react'

export function UsageBadge() {
  const [limits, setLimits] = useState(null)

  useEffect(() => {
    fetch('/api/user/limits')
      .then(res => res.json())
      .then(setLimits)
  }, [])

  if (!limits) return null

  return (
    <div className="space-y-2">
      <div>
        Projects: {limits.usage.projects} / {limits.limits.projectsPerMonth === -1 ? '∞' : limits.limits.projectsPerMonth}
      </div>
      <div>
        Generations: {limits.usage.generations} / {limits.limits.generationsPerMonth === -1 ? '∞' : limits.limits.generationsPerMonth}
      </div>
    </div>
  )
}
```

## Error Handling

```typescript
import { checkUserPermission } from '@/lib/auth'
import { NextResponse } from 'next/server'

try {
  const permission = await checkUserPermission(userId, 'create_database')

  if (!permission.allowed) {
    return NextResponse.json(
      { 
        error: permission.reason,
        upgrade: true,  // Hint to show upgrade modal
        action: 'create_database'
      },
      { status: 429 }
    )
  }

  // Continue with action
} catch (error) {
  return NextResponse.json(
    { error: 'Failed to check permissions' },
    { status: 500 }
  )
}
```
