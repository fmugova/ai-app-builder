export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
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

    // Check if promo code exists in our database
    const promo = await prisma.promoCodes.findFirst({
      where: {
        code: code.toUpperCase(),
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
    if (promo.applicableTo.length > 0 && !promo.applicableTo.includes(plan)) {
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
      stripeCoupon = await stripe.coupons.retrieve(code.toUpperCase())
    } catch (error) {
      // Coupon doesn't exist in Stripe, create it
      const couponData: Stripe.CouponCreateParams = {
        id: code.toUpperCase(),
        name: `Promo: ${code.toUpperCase()}`,
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

  } catch (error: any) {
    console.error('Promo validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    )
  }
}
