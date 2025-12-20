export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminAsync } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isAdminAsync()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: params.id }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    await sendEmail({
      to: email,
      subject: `[TEST] ${campaign.subject}`,
      html: campaign.htmlContent,
      from: 'BuildFlow <newsletter@buildflow-ai.app>'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}