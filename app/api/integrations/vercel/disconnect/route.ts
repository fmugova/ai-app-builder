export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete connection
    await prisma.vercelConnection.delete({
      where: { userId: user.id }
    })

    return NextResponse.json({ success: true, message: 'Disconnected from Vercel' })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ 
      error: 'Failed to disconnect' 
    }, { status: 500 })
  }
}
