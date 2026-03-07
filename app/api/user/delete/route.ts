// app/api/user/delete/route.ts
// GDPR Article 17 — Right to Erasure ("right to be forgotten").
// Permanently deletes the authenticated user's account and all associated data.
// Cascades to Projects, Pages, ProjectFiles, FormSubmissions, etc. via Prisma relations.
// Cancels any active Stripe subscription before deletion.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, stripeSubscriptionId: true, stripeCustomerId: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Cancel active Stripe subscription so the user isn't billed after deletion
  if (user.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId)
    } catch {
      // Log but don't block deletion — subscription may already be cancelled
      console.warn('Could not cancel Stripe subscription for user', user.id)
    }
  }

  // Delete user — Prisma cascades to all related records (Projects, Pages,
  // ProjectFiles, FormSubmissions, Deployments, Sessions, etc.)
  await prisma.user.delete({ where: { id: user.id } })

  return NextResponse.json({
    success: true,
    message: 'Your account and all associated data have been permanently deleted.',
  })
}
