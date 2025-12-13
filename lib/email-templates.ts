// Marketing Email Templates

export function getNewsletterTemplateHTML(
  content: string,
  previewText?: string,
  unsubscribeLink?: string
) {
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