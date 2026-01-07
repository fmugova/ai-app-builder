export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/stripe/apply-promo
 * Validate and apply a promo code to user's account
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      )
    }

    // Find promo code
    const promo = await prisma.promoCodes.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!promo) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 404 }
      )
    }

    // Check if promo code is active
    if (!promo.active) {
      return NextResponse.json(
        { error: 'This promo code is no longer active' },
        { status: 400 }
      )
    }

    // Check if promo code has been used too many times
    if (promo.timesUsed >= promo.maxUses) {
      return NextResponse.json(
        { error: 'This promo code has reached its usage limit' },
        { status: 400 }
      )
    }

    // Check expiry date
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This promo code has expired' },
        { status: 400 }
      )
    }

    // Check if user has already used a promo code
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { promoCodeUsed: true },
    })

    if (user?.promoCodeUsed) {
      return NextResponse.json(
        { error: 'You have already used a promo code' },
        { status: 400 }
      )
    }

    // Update user with promo code
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        promoCodeUsed: promo.code, // ✅ Store the actual promo code used
        discountRate: promo.discountType === 'percentage' ? promo.discountValue : 0,
      },
    })

    // Increment promo code usage count
    await prisma.promoCodes.update({
      where: { code: promo.code },
      data: {
        timesUsed: {
          increment: 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Promo code applied successfully',
      discount: {
        type: promo.discountType,
        value: promo.discountValue,
      },
    })
  } catch (error: any) {
    console.error('Apply promo code error:', error)
    return NextResponse.json(
      { error: 'Failed to apply promo code', details: error.message },
      { status: 500 }
    )
  }
}
