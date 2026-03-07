export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, plan } = await req.json()

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Promo code is required' })
    }

    // Sanitise: only allow safe characters to prevent injection
    const upperCode = String(code).toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    if (!upperCode) {
      return NextResponse.json({ valid: false, error: 'Invalid promo code format' })
    }

    // Check if promo code exists in our database
    const promo = await prisma.promo_codes.findFirst({
      where: {
        code: upperCode,
        active: true,
      },
    })

    if (!promo) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid promo code' 
      })
    }

    // Check if promo code has expired
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This promo code has expired' 
      })
    }

    // Check if promo code has reached max uses
    if (promo.timesUsed >= promo.maxUses) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This promo code has reached its usage limit' 
      })
    }

    // Check if promo code is applicable to the selected plan
    // Skip this check when no plan is provided (e.g. pricing page validates before plan selection)
    if (plan && promo.applicableTo.length > 0 &&
        !promo.applicableTo.includes(plan) && !promo.applicableTo.includes('all')) {
      return NextResponse.json({ 
        valid: false, 
        error: `This promo code is not valid for the ${plan} plan` 
      })
    }

    // Check if user has already used a promo code
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { promoCodeUsed: true },
    })

    if (user?.promoCodeUsed) {
      return NextResponse.json({ 
        valid: false, 
        error: 'You have already used a promo code' 
      })
    }

    // Try to get or create the Stripe coupon
    let stripeCoupon
    try {
      // Try to retrieve existing coupon
      stripeCoupon = await stripe.coupons.retrieve(upperCode)
    } catch {
      // Coupon doesn't exist in Stripe, create it
      const couponData: Stripe.CouponCreateParams = {
        id: upperCode,
        name: `Promo: ${upperCode}`,
        duration: 'once', // Apply once to the first payment
      }

      if (promo.discountType === 'percentage') {
        couponData.percent_off = promo.discountValue
      } else if (promo.discountType === 'fixed') {
        couponData.amount_off = promo.discountValue * 100 // Convert to cents
        couponData.currency = 'usd'
      }

      stripeCoupon = await stripe.coupons.create(couponData)
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      stripeCouponId: stripeCoupon.id,
      message: promo.discountType === 'percentage' 
        ? `${promo.discountValue}% discount applied!`
        : `$${promo.discountValue} discount applied!`
    })

  } catch (error: unknown) {
    console.error('Promo validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    )
  }
}
