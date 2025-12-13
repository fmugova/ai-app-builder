export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminAsync } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { getNewsletterTemplateHTML } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isAdminAsync(session.user.email)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, subject, previewText, htmlContent, segment } = await request.json()

    if (!name || !subject || !htmlContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Wrap content in newsletter template
    const fullHtml = getNewsletterTemplateHTML(
      htmlContent,
      previewText || undefined,
      'https://buildflow-ai.app/unsubscribe'
    )

    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        subject,
        previewText,
        htmlContent: fullHtml,
        segment,
        status: 'draft',
        createdBy: user.id
      }
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Create campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}