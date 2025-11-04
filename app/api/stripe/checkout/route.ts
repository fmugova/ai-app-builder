import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createCheckoutSession, PLANS } from "@/lib/stripe"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { plan } = await req.json()

    if (!plan || plan === 'FREE' || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      )
    }

    const checkoutSession = await createCheckoutSession(
      session.user.id,
      session.user.email,
      plan as 'PRO' | 'ENTERPRISE'
    )

    return NextResponse.json({ url: checkoutSession.url })

  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}