// app/api/databases/route.ts
// Complete fixed version

import { compose, withAuth, withSubscription, withRateLimit } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

// ✅ Define handler separately
const getHandler = async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const databases = await prisma.databaseConnection.findMany({
      where: { userId: session.user.id },
    })
    
    return NextResponse.json({ databases })
  } catch (error) {
    console.error('Failed to fetch databases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch databases' },
      { status: 500 }
    )
  }
}

// ✅ Export with proper Next.js 15 signature
export const GET = compose(
  withRateLimit(100),
  withSubscription('pro'),
  withAuth
)(getHandler)
