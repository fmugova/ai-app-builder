'use client'

import { useSession } from 'next-auth/react'
import { TIER_LIMITS } from '@/lib/auth'
import { useMemo } from 'react'

export function useUsageLimits() {
  const { data: session } = useSession()
  
  const limits = useMemo(() => {
    if (!session) return null
    
    const tier = session.user.subscriptionTier as keyof typeof TIER_LIMITS
    const tierLimits = TIER_LIMITS[tier] ?? TIER_LIMITS.free
    
    return {
      tier,
      projects: {
        used: session.user.projectsThisMonth,
        limit: tierLimits.projectsPerMonth,
        canCreate: tierLimits.projectsPerMonth === -1 || session.user.projectsThisMonth < tierLimits.projectsPerMonth,
        percentage: tierLimits.projectsPerMonth === -1 ? 0 : (session.user.projectsThisMonth / tierLimits.projectsPerMonth) * 100,
      },
      generations: {
        used: session.user.generationsUsed,
        limit: tierLimits.generationsPerMonth,
        canGenerate: tierLimits.generationsPerMonth === -1 || session.user.generationsUsed < tierLimits.generationsPerMonth,
        percentage: tierLimits.generationsPerMonth === -1 ? 0 : (session.user.generationsUsed / tierLimits.generationsPerMonth) * 100,
      },
      features: {
        customDomains: tierLimits.customDomains,
        databases: tierLimits.databases,
        teamMembers: tierLimits.teamMembers,
        maxPages: tierLimits.maxPages,
      },
    }
  }, [session])
  
  return limits
}
