// app/api/integrations/github/status/route.ts
// Returns whether the current user has a GitHub integration connected.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ connected: false })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { githubUsername: true, githubAccessToken: true },
    })

    const connected = !!(user?.githubUsername && user?.githubAccessToken)

    return NextResponse.json({
      connected,
      username: user?.githubUsername ?? null,
    })
  } catch (error) {
    console.error('GitHub status check error:', error)
    return NextResponse.json({ connected: false, error: 'Failed to check status' })
  }
}
