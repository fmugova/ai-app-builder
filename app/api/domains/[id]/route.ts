import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const DELETE = withAuth(async (req, context, session) => {
  try {
    // 1. Check subscription tier
    if (session.user.subscriptionTier === 'free') {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    // 2. Check ownership
    const { id } = await context.params;
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: id as string,
        Project: {
          userId: session.user.id
        }
      }
    })

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // 3. Delete domain
    await prisma.customDomain.delete({
      where: { id: id as string }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to delete domain' },
      { status: 500 }
    )
  }
})
