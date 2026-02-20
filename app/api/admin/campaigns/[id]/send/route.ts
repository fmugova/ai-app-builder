export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminAsync } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isAdminAsync()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 })
    }

    // Get subscribers based on segment
    let subscribers
    
    if (campaign.segment === 'all') {
      subscribers = await prisma.newsletterSubscriber.findMany({
        where: { status: 'active' },
        select: { email: true, name: true }
      })
    } else {
      // Get users with specific subscription tier
      const users = await prisma.user.findMany({
        where: { subscriptionTier: campaign.segment },
        select: { email: true, name: true }
      })
      subscribers = users
    }

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id },
      data: { status: 'sending' }
    })

    // Send emails (in production, use a queue system like Bull or Inngest)
    let sentCount = 0

    for (const subscriber of subscribers) {
      try {
        await sendEmail({
          to: subscriber.email,
          subject: campaign.subject,
          html: campaign.htmlContent,
          from: 'BuildFlow <newsletter@buildflow-ai.app>'
        })

        // Track send
        await prisma.emailSend.create({
          data: {
            id: crypto.randomUUID(),
            campaignId: campaign.id,
            subscriberEmail: subscriber.email,
            user_id: session.user.id
          }
        })

        sentCount++
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error)
      }
    }

    // Update campaign with results
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        totalSent: sentCount
      }
    })

    // PostHog server-side: track campaign sent
    try {
      const adminId = (session.user as { id?: string }).id || session.user.email!
      const ph = getPostHogClient()
      ph.capture({
        distinctId: adminId,
        event: 'campaign_sent',
        properties: {
          campaign_id: id,
          campaign_name: campaign.subject,
          segment: campaign.segment,
          sent_count: sentCount,
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      sentCount
    })
  } catch (error) {
    console.error('Send campaign error:', error)
    
    // Rollback campaign status
    await prisma.emailCampaign.update({
      where: { id },
      data: { status: 'draft' }
    })
    
    const Sentry = (await import('@/lib/sentry')).default
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}