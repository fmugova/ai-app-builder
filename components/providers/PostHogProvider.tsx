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

// ── Provider ─────────────────────────────────────────────────────────────────
// PostHog is initialised in instrumentation-client.ts (Next.js 15.3+ approach).
// This component provides the React context and wires up identity + pageview tracking.
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
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
