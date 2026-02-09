import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        SupabaseIntegration: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const isConnected = !!user.SupabaseIntegration

    return NextResponse.json({
      connected: isConnected,
      username: user.SupabaseIntegration?.username,
      email: user.SupabaseIntegration?.email,
      connectedAt: user.SupabaseIntegration?.connectedAt,
    })
  } catch (error: any) {
    console.error('Supabase status error:', error)
    return NextResponse.json(
      { error: 'Failed to get Supabase status', message: error.message },
      { status: 500 }
    )
  }
}
