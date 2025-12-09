// Track custom events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties)
  }

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Event:', eventName, properties)
  }
}

// Predefined events
export const analytics = {
  // User actions
  signUp: (method: 'email' | 'google') => {
    trackEvent('sign_up', { method })
  },

  signIn: (method: 'email' | 'google') => {
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
      generation_type: generationType 
    })
  },

  // Subscription actions
  upgradeClicked: (tier: string) => {
    trackEvent('upgrade_clicked', { tier })
  },

  checkoutStarted: (tier: string, price: number) => {
    trackEvent('begin_checkout', { 
      tier, 
      value: price,
      currency: 'USD'
    })
  },

  checkoutCompleted: (tier: string, price: number) => {
    trackEvent('purchase', {
      tier,
      value: price,
      currency: 'USD',
      transaction_id: Date.now().toString()
    })
  },

  // Engagement
  templateViewed: (templateName: string) => {
    trackEvent('template_viewed', { template_name: templateName })
  },

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
}
