// Drip Campaign Email Templates

export function getDripEmailHTML(content: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BuildFlow</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">⚡ BuildFlow</h1>
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
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">
                      Happy building! 🚀
                    </p>
                    <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                      BuildFlow - Build Better. Ship Faster.
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

// Day 0: Welcome Email
export function getWelcomeEmailContent(userName: string): string {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
      Welcome to BuildFlow, ${userName}! 🎉
    </h2>
    
    <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      We're thrilled to have you on board! BuildFlow is your AI-powered companion for building amazing web applications in minutes, not hours.
    </p>
    
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
        🚀 Quick Start Guide
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #ffffff; font-size: 15px; line-height: 1.8;">
        <li>Describe what you want to build in plain English</li>
        <li>Our AI generates complete, production-ready code</li>
        <li>Customize and iterate with natural language</li>
        <li>Deploy with one click to Vercel or GitHub</li>
      </ul>
    </div>
    
    <p style="margin: 30px 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      <strong>Your account is ready!</strong> You have <strong>3 free AI generations</strong> and can create up to <strong>5 projects</strong> to explore BuildFlow.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://buildflow-ai.app/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Start Building Now →
      </a>
    </div>
    
    <p style="margin: 30px 0 0 0; color: #6c757d; font-size: 14px; line-height: 1.6;">
      Have questions? Just reply to this email - we're here to help!
    </p>
  `
  
  return getDripEmailHTML(content, userName)
}

// Day 1: Create Your First Project
export function getFirstProjectEmailContent(userName: string, hasProjects: boolean): string {
  if (hasProjects) {
    // User has already created a project
    const content = `
      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
        Great progress, ${userName}! 🎨
      </h2>
      
      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        We noticed you've already started building with BuildFlow - that's awesome! You're off to a great start.
      </p>
      
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 25px; border-radius: 8px; margin: 30px 0;">
        <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
          💡 Pro Tips for Better Results
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #ffffff; font-size: 15px; line-height: 1.8;">
          <li><strong>Be specific:</strong> "Create a landing page with hero, features, and pricing"</li>
          <li><strong>Iterate freely:</strong> Use the chat to refine your design</li>
          <li><strong>Save versions:</strong> Duplicate projects to try variations</li>
          <li><strong>Deploy fast:</strong> One-click deployment to production</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://buildflow-ai.app/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Continue Building →
        </a>
      </div>
    `
    return getDripEmailHTML(content, userName)
  }
  
  // User hasn't created a project yet
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
      Ready to create something amazing, ${userName}? ✨
    </h2>
    
    <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      You've got everything you need to build your first project. Let's make it happen!
    </p>
    
    <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
        🎯 Popular First Projects
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #ffffff; font-size: 15px; line-height: 1.8;">
        <li><strong>Landing Page:</strong> "Create a modern landing page for a SaaS product"</li>
        <li><strong>Portfolio:</strong> "Build a personal portfolio with dark mode"</li>
        <li><strong>Dashboard:</strong> "Create an analytics dashboard with charts"</li>
        <li><strong>E-commerce:</strong> "Build a product showcase page with cart"</li>
      </ul>
    </div>
    
    <p style="margin: 30px 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Simply describe what you want in the prompt box, and our AI will generate complete, production-ready code in seconds.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://buildflow-ai.app/builder" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Create Your First Project →
      </a>
    </div>
  `
  
  return getDripEmailHTML(content, userName)
}

// Day 3: Customize Your Design
export function getCustomizeEmailContent(userName: string): string {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
      Master the art of customization, ${userName}! 🎨
    </h2>
    
    <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      You're making great progress! Now let's explore how to fine-tune your projects to perfection.
    </p>
    
    <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
        🔧 Powerful Customization Features
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #2c3e50; font-size: 15px; line-height: 1.8;">
        <li><strong>AI Chat Iteration:</strong> "Make the header sticky" or "Change to a blue theme"</li>
        <li><strong>Live Preview:</strong> See changes in real-time as you iterate</li>
        <li><strong>Code Access:</strong> Download or copy code anytime</li>
        <li><strong>Version History:</strong> Track changes and revert if needed</li>
      </ul>
    </div>
    
    <p style="margin: 30px 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      <strong>Pro Tip:</strong> The more specific you are with your requests, the better the results. Try: "Add a gradient background from purple to blue" instead of just "change colors."
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://buildflow-ai.app/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Customize Your Projects →
      </a>
    </div>
  `
  
  return getDripEmailHTML(content, userName)
}

// Day 7: Ready to Upgrade?
export function getUpgradePromptEmailContent(userName: string, generationsUsed: number, projectsCount: number): string {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
      You're building great things, ${userName}! 🚀
    </h2>
    
    <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Over the past week, you've created <strong>${projectsCount} project${projectsCount !== 1 ? 's' : ''}</strong> and used <strong>${generationsUsed} AI generation${generationsUsed !== 1 ? 's' : ''}</strong>. That's impressive!
    </p>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <h3 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px; font-weight: 600;">
        ⚡ Unlock Your Full Potential
      </h3>
      
      <div style="background: rgba(255, 255, 255, 0.15); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
          Pro Plan - $19/month
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #ffffff; font-size: 15px; line-height: 1.8; text-align: left;">
          <li>50 AI generations per month</li>
          <li>20 projects</li>
          <li>Priority support</li>
          <li>Advanced customization</li>
          <li>Export to GitHub</li>
        </ul>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.15); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
          Business Plan - $49/month
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #ffffff; font-size: 15px; line-height: 1.8; text-align: left;">
          <li>500 AI generations per month</li>
          <li>100 projects</li>
          <li>White-label options</li>
          <li>Custom domains</li>
          <li>API access</li>
        </ul>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://buildflow-ai.app/pricing" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Pricing Plans →
      </a>
    </div>
    
    <p style="margin: 30px 0 0 0; color: #6c757d; font-size: 14px; line-height: 1.6; text-align: center;">
      Not ready yet? No problem! Keep building on the free plan.
    </p>
  `
  
  return getDripEmailHTML(content, userName)
}

// Day 14: See What Pro Users Can Do
export function getProShowcaseEmailContent(userName: string): string {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
      See what's possible, ${userName}! 💎
    </h2>
    
    <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Two weeks in, and you're part of the BuildFlow community! Here's what our Pro users are building:
    </p>
    
    <div style="margin: 30px 0;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #667eea;">
        <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
          🎯 Sarah - Marketing Agency
        </h4>
        <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
          "I create custom landing pages for clients in minutes instead of hours. BuildFlow Pro pays for itself with just one project."
        </p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #764ba2;">
        <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
          💼 Mike - Startup Founder
        </h4>
        <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
          "I prototyped our entire product UI in a weekend. No need to hire a designer for MVP testing."
        </p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f093fb;">
        <h4 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
          🚀 Alex - Developer
        </h4>
        <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
          "GitHub integration is a game-changer. I generate components, push to my repo, and ship. So fast!"
        </p>
      </div>
    </div>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
        🎁 Special Offer: Get 20% off your first month
      </p>
      <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 14px;">
        Use code <strong style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; font-family: monospace;">WELCOME20</strong> at checkout
      </p>
      <a href="https://buildflow-ai.app/pricing" style="display: inline-block; padding: 14px 32px; background: #ffffff; color: #667eea; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Upgrade to Pro →
      </a>
    </div>
    
    <p style="margin: 30px 0 0 0; color: #6c757d; font-size: 14px; line-height: 1.6;">
      Thank you for being part of our journey. Whether you upgrade or stay on the free plan, we're here to help you build amazing things!
    </p>
  `
  
  return getDripEmailHTML(content, userName)
}
