export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import {
  getWelcomeEmailContent,
  getFirstProjectEmailContent,
  getCustomizeEmailContent,
  getUpgradePromptEmailContent,
  getProShowcaseEmailContent,
} from '@/lib/drip-email-templates'

// Define drip campaign schedule
const DRIP_SCHEDULE = [
  { day: 0, subject: '🎉 Welcome to BuildFlow!', type: 'welcome' },
  { day: 1, subject: '🚀 Create your first project', type: 'first-project' },
  { day: 3, subject: '🎨 Customize your design like a pro', type: 'customize' },
  { day: 7, subject: '⚡ Ready to unlock unlimited potential?', type: 'upgrade-prompt' },
  { day: 14, subject: '💎 See what Pro users are building', type: 'pro-showcase' },
]

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting drip email processor...')

    const now = new Date()
    const processedEmails: unknown[] = []

    // Get all users created in the last 30 days who are not paid subscribers
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
        subscriptionTier: 'free',
        email: { not: '' }, // Exclude users with empty email
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        generationsUsed: true,
      },
    })

    console.log(`📧 Found ${users.length} eligible users`)

    for (const user of users) {
      if (!user.email) continue

      const daysSinceSignup = Math.floor(
        (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Find which emails should be sent based on days since signup
      for (const schedule of DRIP_SCHEDULE) {
        if (daysSinceSignup >= schedule.day) {
          // Check if we already sent this email
          const emailKey = `day${schedule.day}_${schedule.type}`
          
          // Check for existing email send record (use a simple approach for now)
          const existingRecord = await prisma.dripEnrollment.findFirst({
            where: {
              userId: user.id,
              userEmail: user.email,
              campaignId: 'onboarding', // We'll use a fixed campaign ID
            },
          })

          let emailsSent: Record<string, unknown> = {}
          if (existingRecord && existingRecord.emailsSent) {
            emailsSent = existingRecord.emailsSent as Record<string, unknown>
          }

          // Skip if already sent
          if (emailsSent[emailKey]) {
            continue
          }

          // Generate email content based on type
          let htmlContent = ''
          let shouldSend = true

          switch (schedule.type) {
            case 'welcome':
              htmlContent = getWelcomeEmailContent(user.name || 'there')
              break

            case 'first-project':
              // Check if user has projects
              const projectCount = await prisma.project.count({
                where: { userId: user.id },
              })
              htmlContent = getFirstProjectEmailContent(user.name || 'there', projectCount > 0)
              break

            case 'customize':
              htmlContent = getCustomizeEmailContent(user.name || 'there')
              break

            case 'upgrade-prompt':
              const userProjects = await prisma.project.count({
                where: { userId: user.id },
              })
              htmlContent = getUpgradePromptEmailContent(
                user.name || 'there',
                Number(user.generationsUsed),
                userProjects
              )
              break

            case 'pro-showcase':
              htmlContent = getProShowcaseEmailContent(user.name || 'there')
              break

            default:
              shouldSend = false
          }

          if (shouldSend && htmlContent) {
            try {
              // Send the email
              await sendEmail({
                to: user.email,
                subject: schedule.subject,
                html: htmlContent,
              })

              // Mark as sent
              emailsSent[emailKey] = new Date().toISOString()

              // Update or create enrollment record
              if (existingRecord) {
                await prisma.dripEnrollment.update({
                  where: { id: existingRecord.id },
                  data: {
                    emailsSent: emailsSent as Record<string, string>,
                  },
                })
              } else {
                await prisma.dripEnrollment.create({
                  data: {
                    id: `${user.id}_onboarding_${Date.now()}`,
                    campaignId: 'onboarding',
                    userId: user.id,
                    userEmail: user.email,
                    emailsSent: emailsSent as Record<string, string>,
                  },
                })
              }

              processedEmails.push({
                email: user.email,
                type: schedule.type,
                day: schedule.day,
                status: 'sent',
              })

              console.log(`✅ Sent ${schedule.type} email to ${user.email}`)

            } catch (error) {
              console.error(`❌ Failed to send ${schedule.type} email to ${user.email}:`, error)
              processedEmails.push({
                email: user.email,
                type: schedule.type,
                day: schedule.day,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            }
          }
        }
      }
    }

    console.log(`✅ Drip email processor completed. Sent ${processedEmails.length} emails.`)

    return NextResponse.json({
      success: true,
      processed: processedEmails.length,
      details: processedEmails,
    })

  } catch (error: unknown) {
    console.error('Drip email processor error:', error)
    return NextResponse.json(
      { error: 'Failed to process drip emails', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
