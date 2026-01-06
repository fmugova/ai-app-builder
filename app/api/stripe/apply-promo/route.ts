export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await req.json()

    // Find and increment promo code usage
    const promo = await prisma.promoCodes.findFirst({
      where: {
        code: code.toUpperCase(),
        active: true,
      },
    })

    if (!promo) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }

    // Increment usage count
    await prisma.promoCodes.update({
      where: { id: promo.id },
      data: { timesUsed: { increment: 1 } },
    })

    // Mark user as having used a promo code
    await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        promoCodeUsed: true,
        discountRate: promo.discountType === 'percentage' ? promo.discountValue : 0,
      },
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Apply promo error:', error)
    return NextResponse.json(
      { error: 'Failed to apply promo code' },
      { status: 500 }
    )
  }
}
