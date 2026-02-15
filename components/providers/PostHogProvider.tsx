'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

// ── Pageview tracker ────────────────────────────────────────────────────────
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

// ── Identity sync — links PostHog distinct ID to authenticated user ──────────
function IdentitySync() {
  const { data: session } = useSession()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return
    if (session?.user) {
      const user = session.user as { id?: string; email?: string; name?: string }
      if (user.id) {
        ph.identify(user.id, {
          email: user.email,
          name: user.name,
        })
      }
    } else {
      // User logged out — reset to anonymous
      ph.reset()
    }
  }, [session, ph])

  return null
}

// ── Init + Provider ─────────────────────────────────────────────────────────
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  useEffect(() => {
    if (!key) return
    posthog.init(key, {
      api_host: host,
      ui_host: 'https://us.posthog.com',
      // Capture pageviews manually via PageviewTracker for accurate SPA tracking
      capture_pageview: false,
      // Capture pageleave events for session duration
      capture_pageleave: true,
      // Persist across sessions
      persistence: 'localStorage+cookie',
      // Autocapture clicks/inputs (disable if CSP strict)
      autocapture: false,
      // Don't send data in development unless explicitly enabled
      loaded: (phInstance) => {
        if (process.env.NODE_ENV === 'development') phInstance.debug()
      },
    })
  }, [key, host])

  if (!key) {
    // PostHog not configured — render children without wrapping
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
        <IdentitySync />
      </Suspense>
      {children}
    </PHProvider>
  )
}
