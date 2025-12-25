// Marketing Email Templates

export function getNewsletterTemplateHTML(
  content: string,
  previewText?: string,
  unsubscribeEmail?: string // Change parameter name
) {
  const unsubscribeLink = unsubscribeEmail 
    ? `https://buildflow-ai.app/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}`
    : 'https://buildflow-ai.app/unsubscribe';
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${previewText ? `<meta name="description" content="${previewText}">` : ''}
        <title>BuildFlow Newsletter</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                
                <!-- Header with Logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">⚡ BuildFlow Newsletter</h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 14px;">
                      Build Better. Ship Faster.
                    </p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    ${content}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px;">
                      You're receiving this because you subscribed to BuildFlow updates.
                    </p>
                    
                    ${unsubscribeLink ? `
                      <p style="margin: 0 0 15px 0;">
                        <a href="${unsubscribeLink}" style="color: #999999; font-size: 12px; text-decoration: underline;">
                          Unsubscribe
                        </a>
                        <span style="color: #cccccc; margin: 0 8px;">|</span>
                        <a href="https://buildflow-ai.app" style="color: #999999; font-size: 12px; text-decoration: underline;">
                          Visit Website
                        </a>
                      </p>
                    ` : ''}
                    
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      BuildFlow - AI-Powered App Builder<br>
                      © 2025 BuildFlow. All rights reserved.
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

// Pre-built newsletter templates
export const newsletterTemplates = {
  productUpdate: (updates: { title: string; description: string; link?: string }[]) => `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">🚀 What's New at BuildFlow</h2>
    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
      We've been busy building amazing features for you. Here's what's new:
    </p>
    
    ${updates.map(update => `
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
        <h3 style="margin: 0 0 10px 0; color: #333333; font-size: 18px;">${update.title}</h3>
        <p style="margin: 0 0 15px 0; color: #666666; font-size: 15px; line-height: 1.6;">
          ${update.description}
        </p>
        ${update.link ? `
          <a href="${update.link}" style="display: inline-block; color: #667eea; text-decoration: none; font-weight: bold; font-size: 14px;">
            Learn More →
          </a>
        ` : ''}
      </div>
    `).join('')}
  `,

  tips: (tips: { emoji: string; title: string; description: string }[]) => `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">💡 Tips & Tricks</h2>
    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
      Get the most out of BuildFlow with these pro tips:
    </p>
    
    ${tips.map((tip, index) => `
      <div style="margin-bottom: 25px;">
        <div style="display: flex; align-items: start; gap: 15px;">
          <div style="font-size: 32px; line-height: 1;">${tip.emoji}</div>
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0; color: #333333; font-size: 16px; font-weight: bold;">
              ${index + 1}. ${tip.title}
            </h3>
            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
              ${tip.description}
            </p>
          </div>
        </div>
      </div>
    `).join('')}
  `,

  announcement: (title: string, message: string, ctaText?: string, ctaLink?: string) => `
    <div style="text-align: center; padding: 20px 0;">
      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 28px;">${title}</h2>
      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
        ${message}
      </p>
      
      ${ctaText && ctaLink ? `
        <a href="${ctaLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          ${ctaText}
        </a>
      ` : ''}
    </div>
  `
}

// Drip Campaign Email Templates
export const dripEmailTemplates = {
  welcome: {
    subject: '🎉 Welcome to BuildFlow AI - Your First Project Awaits!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin: 0;">BuildFlow AI</h1>
  </div>

  <div style="background: #f7fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
    <h2 style="color: #2d3748; margin-top: 0;">Welcome, {{name}}! 👋</h2>
    <p style="font-size: 16px; color: #4a5568;">You're now part of BuildFlow AI - where ideas become reality in seconds, not hours.</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h3 style="color: #2d3748;">🚀 Get Started in 3 Simple Steps:</h3>
    
    <div style="background: white; border-left: 4px solid #667eea; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
      <strong>1. Describe Your Project</strong>
      <p style="margin: 5px 0 0 0; color: #718096;">Just tell our AI what you want to build in plain English.</p>
    </div>

    <div style="background: white; border-left: 4px solid #667eea; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
      <strong>2. AI Generates Your Code</strong>
      <p style="margin: 5px 0 0 0; color: #718096;">Watch as Claude creates a complete, working application.</p>
    </div>

    <div style="background: white; border-left: 4px solid #667eea; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
      <strong>3. Publish & Share</strong>
      <p style="margin: 5px 0 0 0; color: #718096;">One click to publish and share your project with the world.</p>
    </div>
  </div>

  <div style="text-align: center; margin: 40px 0;">
    <a href="https://buildflow-ai.app/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Create Your First Project →</a>
  </div>

  <div style="background: #edf2f7; border-radius: 8px; padding: 20px; margin-top: 30px;">
    <h4 style="margin-top: 0; color: #2d3748;">💡 Quick Tip:</h4>
    <p style="margin: 0; color: #4a5568;">Try starting with: "Create a landing page for a SaaS product" or "Build a dashboard with user analytics"</p>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 14px;">
    <p>Need help? Reply to this email or visit our <a href="https://buildflow-ai.app/docs" style="color: #667eea;">documentation</a>.</p>
    <p style="margin-top: 10px;">
      <a href="https://buildflow-ai.app" style="color: #667eea; text-decoration: none;">BuildFlow AI</a> | 
      <a href="{{unsubscribe_url}}" style="color: #a0aec0; text-decoration: none;">Unsubscribe</a>
    </p>
  </div>

</body>
</html>
    `
  },

  featureHighlight: {
    subject: '🚀 Did You Know? BuildFlow Can Export to GitHub',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <h2 style="color: #2d3748;">Hey {{name}}! 👋</h2>
  
  <p style="font-size: 16px;">I noticed you created your first project - that's awesome! 🎉</p>
  
  <p>Did you know BuildFlow AI can do so much more?</p>

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 30px; margin: 30px 0;">
    <h3 style="margin-top: 0; color: white;">🔥 Power Features You Might Have Missed:</h3>
    
    <ul style="list-style: none; padding: 0;">
      <li style="margin-bottom: 15px;">✅ <strong>GitHub Export</strong> - Push your code directly to GitHub</li>
      <li style="margin-bottom: 15px;">✅ <strong>One-Click Publish</strong> - Live URL in seconds</li>
      <li style="margin-bottom: 15px;">✅ <strong>Vercel Deploy</strong> - Production-ready hosting</li>
      <li style="margin-bottom: 15px;">✅ <strong>AI Regeneration</strong> - Refine until perfect</li>
    </ul>
  </div>

  <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h4 style="margin-top: 0;">📊 What BuildFlow Users Are Building:</h4>
    <ul style="color: #4a5568;">
      <li>Landing pages in 30 seconds</li>
      <li>Admin dashboards without code</li>
      <li>Portfolio sites that impress</li>
      <li>SaaS MVPs in minutes</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 40px 0;">
    <a href="https://buildflow-ai.app/dashboard" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Try These Features →</a>
  </div>

  <p style="color: #718096; font-size: 14px; margin-top: 30px;">
    Questions? Just reply to this email - I read every message personally!
  </p>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 14px;">
    <a href="{{unsubscribe_url}}" style="color: #a0aec0;">Unsubscribe</a>
  </div>

</body>
</html>
    `
  },

  upgradeInvite: {
    subject: '🎁 Special Offer: Unlock Unlimited Projects',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <h2 style="color: #2d3748;">Ready to Go Pro, {{name}}? 🚀</h2>
  
  <p style="font-size: 16px;">You've created some amazing projects - but you're on the Free tier limits.</p>
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
    <h3 style="margin-top: 0; color: white;">Upgrade to Pro & Get:</h3>
    
    <ul style="list-style: none; padding: 0; text-align: left;">
      <li style="margin-bottom: 12px;">∞ <strong>Unlimited Projects</strong></li>
      <li style="margin-bottom: 12px;">∞ <strong>Unlimited Generations</strong></li>
      <li style="margin-bottom: 12px;">⚡ <strong>Priority Support</strong></li>
      <li style="margin-bottom: 12px;">🎨 <strong>Advanced Templates</strong></li>
      <li>🔧 <strong>API Access</strong></li>
    </ul>
  </div>

  <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin-top: 0; font-size: 24px; color: #667eea; font-weight: bold;">Just $29/month</p>
    <p style="color: #4a5568; margin-bottom: 0;">Cancel anytime. No contract.</p>
  </div>

  <div style="text-align: center; margin: 40px 0;">
    <a href="https://buildflow-ai.app/pricing" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Upgrade Now & Save 20% →</a>
  </div>

  <p style="color: #718096; font-size: 14px; margin-top: 30px; text-align: center;">
    This offer is only valid for the next 7 days.
  </p>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 14px;">
    <a href="{{unsubscribe_url}}" style="color: #a0aec0;">Unsubscribe</a>
  </div>

</body>
</html>
    `
  }
}