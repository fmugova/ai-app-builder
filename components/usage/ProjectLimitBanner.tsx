'use client'

import { useSession } from 'next-auth/react'
import { TIER_LIMITS } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { AlertCircle, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function ProjectLimitBanner() {
  const { data: session } = useSession()
  const router = useRouter()
  
  if (!session) return null
  
  const tier = session.user.subscriptionTier as keyof typeof TIER_LIMITS
  const used = session.user.projectsThisMonth
  const limit = TIER_LIMITS[tier]?.projectsPerMonth ?? 3
  
  if (limit === -1) return null // Unlimited
  
  const percentage = (used / limit) * 100
  const isNearLimit = percentage >= 80
  const isAtLimit = used >= limit
  
  if (!isNearLimit) return null
  
  return (
    <Alert variant={isAtLimit ? 'destructive' : 'default'}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isAtLimit ? 'Project Limit Reached' : 'Approaching Project Limit'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You've used {used} of {limit} projects this month.
          {isAtLimit ? ' Upgrade to create more projects.' : ' Consider upgrading soon.'}
        </span>
        {isNearLimit && (
          <Button
            size="sm"
            variant={isAtLimit ? 'default' : 'outline'}
            onClick={() => router.push('/pricing')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
