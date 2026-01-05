'use client'

import { useSession } from 'next-auth/react'
import { TIER_LIMITS } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export function UsageDashboard() {
  const { data: session } = useSession()
  
  if (!session) return null
  
  const tier = session.user.subscriptionTier as keyof typeof TIER_LIMITS
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free
  
  const usageItems = [
    {
      label: 'Projects',
      used: session.user.projectsThisMonth,
      limit: limits.projectsPerMonth,
      color: 'blue',
    },
    {
      label: 'AI Generations',
      used: session.user.generationsUsed,
      limit: limits.generationsPerMonth,
      color: 'purple',
    },
  ]
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Usage & Limits</CardTitle>
          <Badge variant="secondary" className="capitalize">
            {tier}
          </Badge>
        </div>
        <CardDescription>
          Your current usage for this billing period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageItems.map((item) => {
          const percentage = item.limit === -1 ? 0 : (item.used / item.limit) * 100
          const isUnlimited = item.limit === -1
          
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.used} / {isUnlimited ? '∞' : item.limit}
                </span>
              </div>
              {!isUnlimited && (
                <Progress 
                  value={percentage} 
                  className={`h-2 ${percentage >= 90 ? 'bg-red-100' : ''}`}
                />
              )}
            </div>
          )
        })}
        
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Plan Features</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Custom Domains: {limits.customDomains === -1 ? 'Unlimited' : limits.customDomains}</li>
            <li>✓ Databases: {limits.databases === -1 ? 'Unlimited' : limits.databases}</li>
            <li>✓ Team Members: {limits.teamMembers === -1 ? 'Unlimited' : limits.teamMembers}</li>
            <li>✓ Max Pages: {limits.maxPages === -1 ? 'Unlimited' : limits.maxPages}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
