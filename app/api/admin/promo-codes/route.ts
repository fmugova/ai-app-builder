export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all promo codes
    const promoCodes = await prisma.promo_codes.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ promoCodes })

  } catch (error: unknown) {
    console.error('Get promo codes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promo codes' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { code, discountType, discountValue, maxUses, validUntil, applicableTo } = body

    // Validate input
    if (!code || !discountType || !discountValue || !maxUses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Create promo code
    const promoCode = await prisma.promo_codes.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUses,
        validUntil: validUntil ? new Date(validUntil) : null,
        applicableTo: applicableTo || [],
        active: true,
      },
    })

    return NextResponse.json({ promoCode })

  } catch (error: unknown) {
    console.error('Create promo code error:', error)
    
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A promo code with this code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create promo code' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Promo code ID required' }, { status: 400 })
    }

    // Delete promo code
    await prisma.promo_codes.delete({
      where: { id: id as string },
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Delete promo code error:', error)
    return NextResponse.json(
      { error: 'Failed to delete promo code' },
      { status: 500 }
    )
  }
}
