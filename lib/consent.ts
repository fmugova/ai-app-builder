// lib/consent.ts
// Cookie consent utilities — read/write the user's tracking preference.
// Cookie name: bf_consent    Values: 'all' | 'essential'    Expiry: 365 days
// Uses a plain (non-httpOnly) cookie so client JS can read it without a round-trip.

export type ConsentLevel = 'all' | 'essential'

const COOKIE_NAME = 'bf_consent'

export function getConsentLevel(): ConsentLevel | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  const val = match?.[1]
  if (val === 'all' || val === 'essential') return val
  return null
}

export function setConsentLevel(level: ConsentLevel): void {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  document.cookie = `${COOKIE_NAME}=${level}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/** True only when the user has already made a choice (either way). */
export function hasConsented(): boolean {
  return getConsentLevel() !== null
}

/** True only when the user explicitly accepted all (non-essential) cookies. */
export function hasAnalyticsConsent(): boolean {
  return getConsentLevel() === 'all'
}
