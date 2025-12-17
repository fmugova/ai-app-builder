
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { role: 'user', isAdmin: false, isPro: false },
        { status: 200 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        role: true,
        stripeSubscriptionId: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { role: 'user', isAdmin: false, isPro: false },
        { status: 200 }
      )
    }

    const isAdmin = user.role === 'admin'
    const isPro = !!user.stripeSubscriptionId || isAdmin

    return NextResponse.json({
      role: user.role,
      isAdmin,
      isPro
    })
  } catch (error) {
    console.error('Role check error:', error)
    return NextResponse.json(
      { role: 'user', isAdmin: false, isPro: false },
      { status: 200 }
    )
  }
}