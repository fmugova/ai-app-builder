import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST — create Stripe checkout for a paid template, or grant free template immediately
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeCustomerId: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const template = await prisma.template.findFirst({
    where: { id: templateId, status: 'PUBLISHED' },
  })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  // Block self-purchase — creators cannot buy their own template
  if (template.creatorId === user.id) {
    return NextResponse.json({ error: 'You cannot purchase your own template' }, { status: 400 })
  }

  // Check if already owned
  if (template.tier !== 'FREE') {
    const existing = await prisma.templatePurchase.findUnique({
      where: { templateId_userId: { templateId, userId: user.id } },
    })
    if (existing) {
      return NextResponse.json({ alreadyOwned: true })
    }
  }

  // Free template — record purchase immediately and return
  if (template.tier === 'FREE' || template.price === 0) {
    await prisma.templatePurchase.upsert({
      where: { templateId_userId: { templateId, userId: user.id } },
      update: {},
      create: { templateId, userId: user.id, price: 0 },
    })
    await prisma.template.update({
      where: { id: templateId },
      data: { downloads: { increment: 1 } },
    })
    return NextResponse.json({ free: true, templateId })
  }

  // Paid template — create Stripe one-time checkout session
  const baseUrl = process.env.NEXTAUTH_URL || 'https://buildflow-ai.app'

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(template.price * 100), // cents
          product_data: {
            name: template.name,
            description: template.description.slice(0, 200),
            ...(template.thumbnail ? { images: [template.thumbnail] } : {}),
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/templates?purchased=${templateId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/templates`,
    customer_email: user.email || undefined,
    client_reference_id: user.id,
    metadata: {
      type: 'template_purchase',
      templateId,
      userId: user.id,
      creatorId: template.creatorId,
      price: String(template.price),
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
