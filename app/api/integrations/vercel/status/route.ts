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

    // Get user by email to find their ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ connected: false })
    }

    const connection = await prisma.vercelConnection.findUnique({
      where: { userId: user.id },
      select: {
        username: true,
        email: true,
        teamId: true,
        connectedAt: true,
      }
    })

    return NextResponse.json({
      connected: !!connection,
      connection: connection || null
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ connected: false, error: 'Failed to check status' })
  }
}
