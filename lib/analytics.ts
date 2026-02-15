import posthog from 'posthog-js'

// Safe PostHog capture — no-ops if PostHog not initialised or on server
function ph(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    posthog.capture(event, props)
  } catch {
    // PostHog not yet initialised
  }
}

// Track custom events (PostHog + dev logging)
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  ph(eventName, properties)
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Event:', eventName, properties)
  }
}

// Predefined events
export const analytics = {
  // User actions
  signUp: (method: 'email' | 'google' | 'github') => {
    trackEvent('sign_up', { method })
  },

  signIn: (method: 'email' | 'google' | 'github') => {
    trackEvent('sign_in', { method })
  },

  // Project actions
  projectCreated: (projectType?: string) => {
    trackEvent('project_created', { project_type: projectType })
  },

  projectExported: (exportType: 'zip' | 'copy' | 'file' | 'github') => {
    trackEvent('project_exported', { export_type: exportType })
  },

  projectDeleted: () => {
    trackEvent('project_deleted')
  },

  // AI actions
  aiGeneration: (success: boolean, generationType?: string) => {
    trackEvent('ai_generation', {
      success,
      generation_type: generationType,
    })
  },

  // First generation milestone
  firstWebsiteGenerated: () => {
    trackEvent('first_website_generated')
  },

  // Subscription actions
  upgradeClicked: (tier: string) => {
    trackEvent('upgrade_clicked', { tier })
  },

  checkoutStarted: (tier: string, price: number) => {
    trackEvent('checkout_started', {
      tier,
      value: price,
      currency: 'USD',
    })
  },

  checkoutCompleted: (tier: string, price: number) => {
    trackEvent('checkout_completed', {
      tier,
      value: price,
      currency: 'USD',
    })
  },

  // Template marketplace
  templateViewed: (templateName: string, templateId?: string) => {
    trackEvent('template_viewed', { template_name: templateName, template_id: templateId })
  },

  templatePurchased: (templateId: string, price: number) => {
    trackEvent('template_purchased', { template_id: templateId, price })
  },

  // Deployments
  deploymentStarted: (provider: 'vercel' | 'github' | 'buildflow') => {
    trackEvent('deployment_started', { provider })
  },

  deploymentCompleted: (provider: 'vercel' | 'github' | 'buildflow', success: boolean) => {
    trackEvent('deployment_completed', { provider, success })
  },

  // Engagement
  tutorialStarted: () => {
    trackEvent('tutorial_started')
  },

  tutorialCompleted: () => {
    trackEvent('tutorial_completed')
  },

  // Marketing
  pricingViewed: () => {
    trackEvent('pricing_viewed')
  },

  demoVideoPlayed: () => {
    trackEvent('demo_video_played')
  },

  // Security
  cspViolation: (violatedDirective: string, blockedURI: string) => {
    trackEvent('csp_violation', {
      violated_directive: violatedDirective,
      blocked_uri: blockedURI,
    })
  },
}
