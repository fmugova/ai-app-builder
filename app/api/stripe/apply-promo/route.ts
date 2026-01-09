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

    // Find promo code (model is PromoCodes plural)
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

    // Check expiry date (field is validUntil, not expiresAt)
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
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
    // promoCodeUsed is String, discountRate is Float
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        promoCodeUsed: promo.code, // String - store the actual promo code
        discountRate: promo.discountType === 'percentage' 
          ? promo.discountValue 
          : 0, // Float - store the discount rate
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
  } catch (error: unknown) {
    console.error('Apply promo code error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to apply promo code', details: errorMessage },
      { status: 500 }
    )
  }
}