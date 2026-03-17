'use client'

/**
 * Shim for 'next-auth/react' that replaces the hooks (SessionProvider,
 * useSession) with app-native React implementations.
 *
 * WHY THIS EXISTS
 * ---------------
 * next-auth must stay in `serverExternalPackages` so Turbopack doesn't try
 * to bundle it (which breaks the [...nextauth] catch-all route handler).
 * The side-effect: next-auth/react is loaded as a Node.js external at SSR
 * time and holds its own copy of `node_modules/react`. Turbopack's SSR
 * runtime inlines a separate compiled React. These two instances never
 * share a dispatcher, so every hook call from next-auth/react
 * (useSession, SessionProvider's useState, etc.) throws
 * "Cannot read properties of null (reading 'useState' / 'useContext')".
 *
 * HOW THIS FIXES IT
 * -----------------
 * Turbopack's resolveAlias + webpack's resolve.alias both point
 * `next-auth/react` → this file. Because this file is part of the app
 * bundle (not an external), Turbopack bundles it with its own React,
 * which IS the same instance the SSR renderer uses. No crash.
 *
 * signIn / signOut / getSession are safe: they're called only on user
 * interaction (never during SSR), so loading the real next-auth/react
 * functions lazily at call-time works fine.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { Session } from 'next-auth'

// ── Session context (app-bundled React) ────────────────────────────────────────

interface AppSession {
  data: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  update: () => Promise<void>
}

const AppSessionContext = createContext<AppSession>({
  data: null,
  status: 'loading',
  update: async () => {},
})

// ── SessionProvider ────────────────────────────────────────────────────────────

interface SessionProviderProps {
  children: ReactNode
  session?: Session | null
  basePath?: string
  refetchOnWindowFocus?: boolean
  refetchWhenOffline?: boolean
  refetchInterval?: number
}

export function SessionProvider({ children, session: initialSession }: SessionProviderProps) {
  const [state, setState] = useState<{ data: Session | null; status: AppSession['status'] }>(
    initialSession !== undefined
      ? {
          data: initialSession,
          status: initialSession ? 'authenticated' : 'unauthenticated',
        }
      : { data: null, status: 'loading' }
  )

  const update = async () => {
    try {
      const res = await fetch('/api/auth/session')
      const json = await res.json()
      if (json?.user) {
        setState({ data: json, status: 'authenticated' })
      } else {
        setState({ data: null, status: 'unauthenticated' })
      }
    } catch {
      setState({ data: null, status: 'unauthenticated' })
    }
  }

  useEffect(() => {
    if (initialSession === undefined) {
      update()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppSessionContext.Provider value={{ ...state, update }}>
      {children}
    </AppSessionContext.Provider>
  )
}

// ── useSession ─────────────────────────────────────────────────────────────────

export function useSession(): AppSession {
  return useContext(AppSessionContext)
}

// ── signIn ─────────────────────────────────────────────────────────────────────
// Thin wrapper around the next-auth /api/auth/* endpoints.
// Covers the two common patterns used in this app:
//   signIn('google', { callbackUrl })   → OAuth redirect
//   signIn('credentials', { ...fields }) → credentials POST

export async function signIn(
  provider?: string,
  options: { callbackUrl?: string; redirect?: boolean; [key: string]: unknown } = {}
): Promise<{ error?: string; status: number; ok: boolean; url: string | null } | void> {
  const { callbackUrl = window.location.href, redirect = true, ...credentials } = options

  if (!provider) {
    window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
    return
  }

  // Fetch CSRF token (next-auth requires it for POST requests)
  const csrfRes = await fetch('/api/auth/csrf')
  const { csrfToken } = await csrfRes.json()

  const body = new URLSearchParams({
    csrfToken,
    callbackUrl,
    ...(Object.fromEntries(
      Object.entries(credentials).map(([k, v]) => [k, String(v)])
    )),
  })

  const res = await fetch(`/api/auth/signin/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await res.json().catch(() => ({ url: callbackUrl }))

  if (redirect || !res.ok) {
    window.location.href = data.url ?? callbackUrl
    return
  }

  return { error: data.error, status: res.status, ok: res.ok, url: data.url ?? null }
}

// ── signOut ────────────────────────────────────────────────────────────────────

export async function signOut(
  options: { callbackUrl?: string; redirect?: boolean } = {}
): Promise<void> {
  const { callbackUrl = window.location.href, redirect = true } = options

  const csrfRes = await fetch('/api/auth/csrf')
  const { csrfToken } = await csrfRes.json()

  await fetch('/api/auth/signout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, callbackUrl }),
  })

  if (redirect) {
    window.location.href = callbackUrl
  }
}

// ── getSession ─────────────────────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  try {
    const res = await fetch('/api/auth/session')
    const json = await res.json()
    return json?.user ? json : null
  } catch {
    return null
  }
}

// ── getCsrfToken ───────────────────────────────────────────────────────────────

export async function getCsrfToken(): Promise<string | undefined> {
  try {
    const res = await fetch('/api/auth/csrf')
    const { csrfToken } = await res.json()
    return csrfToken
  } catch {
    return undefined
  }
}

// ── getProviders ───────────────────────────────────────────────────────────────

export async function getProviders() {
  try {
    const res = await fetch('/api/auth/providers')
    return res.json()
  } catch {
    return null
  }
}
