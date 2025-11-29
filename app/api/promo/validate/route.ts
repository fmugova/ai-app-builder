export const dynamic = 'force-dynamic'

import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔍 Promo validation - Session:', session) // DEBUG
    
    if (!session?.user?.email) {
      console.log('❌ No session found in promo validation') // DEBUG
      return NextResponse.json({ 
        error: 'Unauthorized', 
        valid: false 
      }, { status: 401 })
    }

    const { code, plan } = await request.json()

    console.log('📦 Promo validation request:', { code, plan }) // DEBUG

    if (!code || !plan) {
      return NextResponse.json(
        { error: 'Code and plan are required', valid: false },
        { status: 400 }
      )
    }

    const promo = await prisma.promoCodes.findUnique({
      where: { code: code.toUpperCase() },
    })

    console.log('🎟️ Promo found:', promo ? 'Yes' : 'No') // DEBUG

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

    // Check if promo applies to the selected plan
    const applicableTo = promo.applicableTo || []
    if (!applicableTo.includes(plan) && !applicableTo.includes('all')) {
      return NextResponse.json(
        { 
          error: `This promo code is only valid for: ${applicableTo.join(', ')}`,
          valid: false 
        },
        { status: 400 }
      )
    }

    console.log('✅ Promo valid:', {
      code: promo.code,
      discount: promo.discountValue,
      type: promo.discountType
    }) // DEBUG

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
