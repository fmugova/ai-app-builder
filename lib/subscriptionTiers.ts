export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    generationsPerMonth: 3,
    projectsPerMonth: 3,
    features: ['3 AI generations/month', '3 projects/month', 'Basic support']
  },
  pro: {
    name: 'Pro',
    price: 19,
    generationsPerMonth: 100,
    projectsPerMonth: 50,
    features: ['100 AI generations/month', '50 projects/month', 'Priority support', 'Advanced templates']
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    generationsPerMonth: -1, // Unlimited
    projectsPerMonth: -1,
    features: ['Unlimited generations', 'Unlimited projects', '24/7 support', 'Custom templates', 'API access']
  }
}

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS

export function getTierLimits(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier]
}

export function canGenerateMore(tier: SubscriptionTier, used: number): boolean {
  const limit = SUBSCRIPTION_TIERS[tier].generationsPerMonth
  return limit === -1 || used < limit
}

export function canCreateProject(tier: SubscriptionTier, created: number): boolean {
  const limit = SUBSCRIPTION_TIERS[tier].projectsPerMonth
  return limit === -1 || created < limit
}