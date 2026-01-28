"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TwoFactorOnboarding({ user }: { user: { twoFactorRequired: boolean, twoFactorEnabled: boolean } }) {
  const router = useRouter()

  useEffect(() => {
    if (user.twoFactorRequired && !user.twoFactorEnabled) {
      router.replace('/account/security/2fa?onboarding=1')
    }
  }, [user.twoFactorRequired, user.twoFactorEnabled, router])

  return null
}
