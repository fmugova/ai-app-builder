'use client'

// ConditionalAnalytics — renders third-party analytics scripts only when the
// user has given explicit consent (bf_consent=all cookie).
// This gates Google Analytics, GTM, Vercel Analytics, and SpeedInsights.
// PostHog is gated separately in instrumentation-client.ts at init time.

import { useEffect, useState } from 'react'
import { hasAnalyticsConsent } from '@/lib/consent'
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function ConditionalAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(hasAnalyticsConsent() && process.env.NODE_ENV === 'production')
  }, [])

  if (!enabled) return null

  return (
    <>
      <GoogleAnalytics gaId="GTM-KNTK3Z8G" />
      <GoogleTagManager gtmId="GTM-KNTK3Z8G" />
      <Analytics />
      <SpeedInsights />
    </>
  )
}
