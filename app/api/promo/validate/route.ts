export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'Unauthorized', 
        valid: false 
      }, { status: 401 })
    }

    // Rate-limit: 10 attempts per 10 minutes per user
    const rl = await checkRateLimitByIdentifier(`promo-validate:${session.user.email}`, 'external')
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', valid: false },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      )
    }

    const { code, plan } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required', valid: false },
        { status: 400 }
      )
    }

    // Sanitise input
    const upperCode = String(code).toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    if (!upperCode) {
      return NextResponse.json(
        { error: 'Invalid promo code format', valid: false },
        { status: 400 }
      )
    }

    // Check if user already used a promo code
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { promoCodeUsed: true },
    })
    if (user?.promoCodeUsed) {
      return NextResponse.json(
        { error: 'You have already used a promo code', valid: false },
        { status: 400 }
      )
    }

    const promo = await prisma.promo_codes.findUnique({
      where: { code: upperCode },
    })

    if (!promo) {
      return NextResponse.json(
        { error: 'Invalid promo code', valid: false },
        { status: 404 }
      )
    }

    // Check if promo is active
    if (!promo.active) {
      return NextResponse.json(
        { error: 'This promo code is no longer active', valid: false },
        { status: 400 }
      )
    }

    // Check if promo has expired
    if (promo.validUntil && new Date() > promo.validUntil) {
      return NextResponse.json(
        { error: 'This promo code has expired', valid: false },
        { status: 400 }
      )
    }

    // Check usage limit (handle nullable values)
    const maxUses = promo.maxUses ?? -1
    const timesUsed = promo.timesUsed ?? 0
    
    if (maxUses !== -1 && timesUsed >= maxUses) {
      return NextResponse.json(
        { error: 'This promo code has reached its usage limit', valid: false },
        { status: 400 }
      )
    }

    // Check if promo applies to the selected plan (skip when plan not provided)
    const applicableTo = promo.applicableTo || []
    if (plan && applicableTo.length > 0 && !applicableTo.includes(plan) && !applicableTo.includes('all')) {
      return NextResponse.json(
        { 
          error: `This promo code is only valid for: ${applicableTo.join(', ')}`,
          valid: false 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      applicableTo: promo.applicableTo,
    })
  } catch (error: any) {
    console.error('❌ Promo validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate promo code', valid: false },
      { status: 500 }
    )
  }
}
