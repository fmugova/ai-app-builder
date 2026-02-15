import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: 5,
    pricePerCredit: 0.50,
    description: 'Great for occasional use',
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    credits: 50,
    price: 20,
    pricePerCredit: 0.40,
    description: 'Best value for regular users',
    popular: true,
  },
  {
    id: 'power',
    name: 'Power Pack',
    credits: 120,
    price: 40,
    pricePerCredit: 0.33,
    description: 'For heavy builders',
    popular: false,
  },
  {
    id: 'agency',
    name: 'Agency Pack',
    credits: 300,
    price: 80,
    pricePerCredit: 0.27,
    description: 'Bulk credits for teams',
    popular: false,
  },
]

// POST — create a one-time Stripe checkout for credit top-up
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { packageId } = await req.json()
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
  if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://buildflow-ai.app'

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: pkg.price * 100,
          product_data: {
            name: `BuildFlow ${pkg.name}`,
            description: `${pkg.credits} AI generation credits — ${pkg.description}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/dashboard?credits_added=${pkg.credits}`,
    cancel_url: `${baseUrl}/pricing`,
    customer_email: user.email || undefined,
    client_reference_id: user.id,
    metadata: {
      type: 'credit_purchase',
      userId: user.id,
      packageId: pkg.id,
      credits: String(pkg.credits),
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}

// GET — return available packages (used by pricing page)
export async function GET() {
  return NextResponse.json(CREDIT_PACKAGES)
}
