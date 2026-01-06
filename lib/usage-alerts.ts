import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

interface UsageAlertResult {
  projectAlertSent: boolean
  generationAlertSent: boolean
}

export async function checkUsageAlerts(userId: string): Promise<UsageAlertResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        projectsThisMonth: true,
        projectsLimit: true,
        generationsUsed: true,
        generationsLimit: true,
        subscriptionTier: true,
      },
    })

    if (!user || !user.email) {
      return { projectAlertSent: false, generationAlertSent: false }
    }

    const result: UsageAlertResult = {
      projectAlertSent: false,
      generationAlertSent: false,
    }

    // Calculate usage percentages
    const projectUsage = (user.projectsThisMonth / user.projectsLimit) * 100
    const genUsage = (user.generationsUsed / user.generationsLimit) * 100

    // Alert at 80% project usage
    if (projectUsage >= 80 && projectUsage < 100) {
      await sendEmail({
        to: user.email,
        subject: '⚠️ You\'re approaching your project limit',
        html: getProjectLimitAlertHTML(
          user.name || 'there',
          user.projectsThisMonth,
          user.projectsLimit,
          projectUsage,
          user.subscriptionTier
        ),
      })
      result.projectAlertSent = true
      console.log(`📧 Project limit alert sent to ${user.email} (${projectUsage.toFixed(0)}% used)`)
    }

    // Alert at 80% generation usage
    if (genUsage >= 80 && genUsage < 100) {
      await sendEmail({
        to: user.email,
        subject: '⚠️ You\'re approaching your AI generation limit',
        html: getGenerationLimitAlertHTML(
          user.name || 'there',
          user.generationsUsed,
          user.generationsLimit,
          genUsage,
          user.subscriptionTier
        ),
      })
      result.generationAlertSent = true
      console.log(`📧 Generation limit alert sent to ${user.email} (${genUsage.toFixed(0)}% used)`)
    }

    // Alert at 100% usage (limit reached)
    if (projectUsage >= 100) {
      await sendEmail({
        to: user.email,
        subject: '🚨 You\'ve reached your project limit',
        html: getLimitReachedHTML(
          user.name || 'there',
          'project',
          user.projectsLimit,
          user.subscriptionTier
        ),
      })
      console.log(`📧 Project limit reached alert sent to ${user.email}`)
    }

    if (genUsage >= 100) {
      await sendEmail({
        to: user.email,
        subject: '🚨 You\'ve reached your AI generation limit',
        html: getLimitReachedHTML(
          user.name || 'there',
          'generation',
          user.generationsLimit,
          user.subscriptionTier
        ),
      })
      console.log(`📧 Generation limit reached alert sent to ${user.email}`)
    }

    return result
  } catch (error) {
    console.error('Failed to check usage alerts:', error)
    return { projectAlertSent: false, generationAlertSent: false }
  }
}

function getProjectLimitAlertHTML(
  userName: string,
  used: number,
  limit: number,
  percentage: number,
  tier: string
): string {
  const isFreeTier = tier === 'free'
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      ⚠️ Usage Alert
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px; color: #e2e8f0;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                      Hi ${userName},
                    </p>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
                      You're approaching your monthly project limit. Here's your current usage:
                    </p>
                    
                    <!-- Usage Bar -->
                    <div style="background-color: #334155; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: #f59e0b; font-weight: 600; font-size: 18px;">
                          ${used} / ${limit} projects
                        </span>
                        <span style="color: #f59e0b; font-weight: 600; font-size: 18px;">
                          ${percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div style="background-color: #475569; height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                      </div>
                    </div>
                    
                    ${isFreeTier ? `
                      <div style="background-color: #1e3a5f; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                        <p style="margin: 0; color: #93c5fd; font-size: 14px; line-height: 1.6;">
                          💡 <strong>Upgrade to Pro</strong> to get unlimited projects and avoid interruptions to your workflow.
                        </p>
                      </div>
                    ` : ''}
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
                      ${isFreeTier 
                        ? 'Upgrade now to continue creating amazing projects without limits!' 
                        : 'Your limit will reset at the start of next month.'}
                    </p>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${process.env.NEXTAUTH_URL}/${isFreeTier ? 'pricing' : 'account'}" 
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            ${isFreeTier ? 'Upgrade Now' : 'View Account'}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                      BuildFlow - AI-Powered App Builder
                    </p>
                    <p style="margin: 0; color: #475569; font-size: 12px;">
                      You're receiving this because you have usage alerts enabled.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function getGenerationLimitAlertHTML(
  userName: string,
  used: number,
  limit: number,
  percentage: number,
  tier: string
): string {
  const isFreeTier = tier === 'free'
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      ⚠️ AI Generation Alert
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px; color: #e2e8f0;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                      Hi ${userName},
                    </p>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
                      You're approaching your monthly AI generation limit:
                    </p>
                    
                    <div style="background-color: #334155; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: #f59e0b; font-weight: 600; font-size: 18px;">
                          ${used} / ${limit} generations
                        </span>
                        <span style="color: #f59e0b; font-weight: 600; font-size: 18px;">
                          ${percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div style="background-color: #475569; height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); height: 100%; width: ${percentage}%;"></div>
                      </div>
                    </div>
                    
                    ${isFreeTier ? `
                      <div style="background-color: #1e3a5f; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                        <p style="margin: 0; color: #93c5fd; font-size: 14px; line-height: 1.6;">
                          💡 <strong>Pro Plan</strong> includes 100 generations/month. <strong>Business Plan</strong> includes 500 generations/month.
                        </p>
                      </div>
                    ` : ''}
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${process.env.NEXTAUTH_URL}/${isFreeTier ? 'pricing' : 'account'}" 
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            ${isFreeTier ? 'Upgrade to Pro' : 'Manage Plan'}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px 40px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                      BuildFlow - AI-Powered App Builder
                    </p>
                    <p style="margin: 0; color: #475569; font-size: 12px;">
                      You're receiving this because you have usage alerts enabled.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function getLimitReachedHTML(
  userName: string,
  limitType: 'project' | 'generation',
  limit: number,
  tier: string
): string {
  const isFreeTier = tier === 'free'
  const limitText = limitType === 'project' ? 'project' : 'AI generation'
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      🚨 Limit Reached
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px; color: #e2e8f0;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                      Hi ${userName},
                    </p>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
                      You've reached your monthly ${limitText} limit of <strong>${limit}</strong>.
                    </p>
                    
                    ${isFreeTier ? `
                      <div style="background-color: #1e3a5f; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 12px; color: #60a5fa; font-size: 18px;">Upgrade to continue</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #93c5fd;">
                          <li style="margin-bottom: 8px;">Pro: ${limitType === 'project' ? '50 projects' : '100 generations'}/month</li>
                          <li style="margin-bottom: 8px;">Business: ${limitType === 'project' ? '200 projects' : '500 generations'}/month</li>
                          <li>All premium features included</li>
                        </ul>
                      </div>
                    ` : `
                      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                        Your limit will reset at the start of next month, or you can upgrade to a higher tier for more capacity.
                      </p>
                    `}
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${process.env.NEXTAUTH_URL}/pricing" 
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            ${isFreeTier ? 'Upgrade Now' : 'View Plans'}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px 40px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                      BuildFlow - AI-Powered App Builder
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
