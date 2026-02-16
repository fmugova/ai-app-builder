'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsageData {
  tier: string
  status: string
  currentPeriodEnd: string
  daysRemaining: number
  projectsUsed: number
  projectsLimit: number
  generationsUsed: number
  generationsLimit: number
  extraCreditsPurchased: number
  usage: {
    projects:    { used: number; limit: number; percentage: number }
    generations: { used: number; limit: number; percentage: number }
  }
}

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  pricePerCredit: number
  description: string
  popular: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise',
}

const TIER_COLORS: Record<string, string> = {
  free: 'text-gray-400', pro: 'text-green-400', business: 'text-blue-400', enterprise: 'text-purple-400',
}

function barColor(pct: number) {
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-yellow-500'
  return 'bg-purple-500'
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UsageClient({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const creditsBought = searchParams.get('credits_added')

  const [data, setData] = useState<UsageData | null>(null)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buying, setBuying] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(!!creditsBought)

  useEffect(() => {
    Promise.all([loadUsage(), loadPackages()])
  }, [])

  useEffect(() => {
    if (showSuccess) {
      const t = setTimeout(() => setShowSuccess(false), 6000)
      return () => clearTimeout(t)
    }
  }, [showSuccess])

  async function loadUsage() {
    try {
      const res = await fetch('/api/billing')
      if (!res.ok) throw new Error('Failed to load usage')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading usage')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadPackages() {
    try {
      const res = await fetch('/api/stripe/credits')
      if (res.ok) setPackages(await res.json())
    } catch {
      // non-fatal
    }
  }

  async function buyCredits(packageId: string) {
    setBuying(packageId)
    try {
      const res = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const json = await res.json()
      if (json.url) router.push(json.url)
      else alert(json.error || 'Failed to start checkout')
    } catch {
      alert('Failed to start checkout. Please try again.')
    } finally {
      setBuying(null)
    }
  }

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading usage data…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load usage data</p>
          <button onClick={loadUsage} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Retry</button>
        </div>
      </div>
    )
  }

  const { tier, daysRemaining, currentPeriodEnd,
          generationsUsed, generationsLimit,
          projectsUsed, projectsLimit,
          extraCreditsPurchased } = data

  const isUnlimited     = generationsLimit === -1
  const genPct          = isUnlimited ? 0 : Math.min(100, Math.round((generationsUsed / Math.max(generationsLimit, 1)) * 100))
  const projPct         = projectsLimit === -1 ? 0 : Math.min(100, Math.round((projectsUsed / Math.max(projectsLimit, 1)) * 100))
  const genRemaining    = isUnlimited ? null : generationsLimit - generationsUsed
  const projRemaining   = projectsLimit === -1 ? null : projectsLimit - projectsUsed

  // Warning banners
  const genWarn  = !isUnlimited && genPct >= 80
  const projWarn = projectsLimit !== -1 && projPct >= 80

  return (
    <div className="min-h-screen bg-gray-900">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition">← Dashboard</Link>
            <span className="text-gray-700">|</span>
            <h1 className="text-white font-semibold">Usage & Credits</h1>
          </div>
          <Link href="/billing" className="text-sm text-purple-400 hover:text-purple-300 transition">
            Billing →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">

        {/* ── Credits purchased toast ──────────────────────────────────────── */}
        {showSuccess && creditsBought && (
          <div className="flex items-center gap-3 bg-green-900/40 border border-green-700 text-green-300 rounded-xl px-5 py-3 text-sm">
            <span className="text-green-400 text-base">✓</span>
            <span><strong>{creditsBought} credits</strong> have been added to your account.</span>
            <button onClick={() => setShowSuccess(false)} className="ml-auto text-green-500 hover:text-green-300">✕</button>
          </div>
        )}

        {/* ── Plan summary ─────────────────────────────────────────────────── */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-semibold uppercase tracking-wide ${TIER_COLORS[tier] || 'text-gray-400'}`}>
                  {TIER_LABELS[tier] || tier} Plan
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {isUnlimited
                  ? 'Unlimited AI generations'
                  : `${generationsRemaining(genRemaining, generationsLimit)} generations remaining this period`}
              </p>
              {!isUnlimited && (
                <p className="text-gray-500 text-xs mt-1">
                  Resets on {fmt(currentPeriodEnd)} · {daysRemaining} days left
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {tier === 'free' && (
                <Link href="/pricing" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition">
                  Upgrade Plan
                </Link>
              )}
              <Link href="/billing" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition">
                Manage Billing
              </Link>
            </div>
          </div>
        </div>

        {/* ── Usage cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* AI Generations */}
          <div className={`bg-gray-800 border rounded-2xl p-6 ${genWarn ? 'border-yellow-600/60' : 'border-gray-700'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-900/40 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">AI Generations</p>
                  <p className="text-xl font-bold text-white">
                    {isUnlimited ? '∞' : `${generationsUsed} / ${generationsLimit}`}
                  </p>
                </div>
              </div>
              {genWarn && <span className="text-xs font-medium bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full">Low</span>}
            </div>

            {!isUnlimited && (
              <>
                <div className="w-full bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${barColor(genPct)}`}
                    style={{ width: `${genPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-3">
                  <span>{genPct}% used</span>
                  <span className={genWarn ? 'text-yellow-400 font-medium' : ''}>
                    {genRemaining} remaining
                  </span>
                </div>
              </>
            )}

            {extraCreditsPurchased > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-900/20 rounded-lg px-3 py-1.5">
                <span>+</span>
                <span>{extraCreditsPurchased} extra credits purchased this period</span>
              </div>
            )}

            {isUnlimited && (
              <p className="text-xs text-green-400 bg-green-900/20 rounded-lg px-3 py-1.5">
                ✓ Unlimited generations included in your plan
              </p>
            )}
          </div>

          {/* Projects */}
          <div className={`bg-gray-800 border rounded-2xl p-6 ${projWarn ? 'border-yellow-600/60' : 'border-gray-700'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Projects This Month</p>
                  <p className="text-xl font-bold text-white">
                    {projectsLimit === -1 ? '∞' : `${projectsUsed} / ${projectsLimit}`}
                  </p>
                </div>
              </div>
              {projWarn && <span className="text-xs font-medium bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full">Low</span>}
            </div>

            {projectsLimit !== -1 && (
              <>
                <div className="w-full bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${barColor(projPct)}`}
                    style={{ width: `${projPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{projPct}% used</span>
                  <span className={projWarn ? 'text-yellow-400 font-medium' : ''}>
                    {projRemaining} remaining
                  </span>
                </div>
              </>
            )}

            {projectsLimit === -1 && (
              <p className="text-xs text-green-400 bg-green-900/20 rounded-lg px-3 py-1.5">
                ✓ Unlimited projects included in your plan
              </p>
            )}

            <p className="text-xs text-gray-500 mt-3">
              Project count resets {daysRemaining === 0 ? 'today' : `in ${daysRemaining} days`} · {fmt(currentPeriodEnd)}
            </p>
          </div>
        </div>

        {/* ── Buy Extra Credits ─────────────────────────────────────────────── */}
        {!isUnlimited && packages.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-1">Buy Extra AI Credits</h2>
              <p className="text-sm text-gray-400">
                Top up your generations without changing your plan. Credits are added instantly after payment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => {
                const savings = pkg.credits > 10
                  ? Math.round((1 - pkg.pricePerCredit / 0.50) * 100)
                  : 0
                return (
                  <div
                    key={pkg.id}
                    className={`relative border rounded-xl p-5 flex flex-col transition-all ${
                      pkg.popular
                        ? 'border-purple-500 bg-purple-900/20 shadow-lg shadow-purple-900/20'
                        : 'border-gray-700 bg-gray-900/60 hover:border-gray-600'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-0.5 rounded-full shadow">
                        Best Value
                      </span>
                    )}

                    <div className="mb-auto">
                      <p className="font-semibold text-white mb-1">{pkg.name}</p>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-bold text-white">${pkg.price}</span>
                      </div>
                      <p className="text-sm text-gray-300 font-medium mb-0.5">{pkg.credits} credits</p>
                      <p className="text-xs text-gray-500 mb-1">${pkg.pricePerCredit.toFixed(2)} per credit</p>
                      {savings > 0 && (
                        <p className="text-xs text-green-400 font-medium mb-2">Save {savings}% vs. base rate</p>
                      )}
                      <p className="text-xs text-gray-500 mb-5">{pkg.description}</p>
                    </div>

                    <button
                      onClick={() => buyCredits(pkg.id)}
                      disabled={buying === pkg.id}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
                        pkg.popular
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {buying === pkg.id
                        ? <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Loading…
                          </span>
                        : `Buy ${pkg.credits} Credits`}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 pt-5 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
              <p>Secure payments via Stripe · Credits added instantly</p>
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300 transition font-medium">
                Or upgrade for more monthly credits →
              </Link>
            </div>
          </div>
        )}

        {/* ── Free tier upgrade CTA ─────────────────────────────────────────── */}
        {tier === 'free' && (
          <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-700/50 rounded-2xl p-7 text-center">
            <p className="text-lg font-semibold text-white mb-2">Need more generations?</p>
            <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">
              Upgrade to Pro for 100 generations/month, custom domains, and analytics — or buy a one-time credit pack to top up now.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/pricing"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition"
              >
                View Plans
              </Link>
              <button
                onClick={() => document.getElementById('credits-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition"
              >
                Buy Credits
              </button>
            </div>
          </div>
        )}

        {/* ── Usage tips ───────────────────────────────────────────────────── */}
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Usage Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
            <div className="flex gap-2">
              <span className="text-purple-400 mt-0.5 shrink-0">💡</span>
              <p>Each AI generation creates or edits the full HTML of your project.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-purple-400 mt-0.5 shrink-0">🔄</span>
              <p>Your monthly generation limit resets on {fmt(currentPeriodEnd)}.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-purple-400 mt-0.5 shrink-0">🎯</span>
              <p>Extra credits you buy extend your limit for the current billing period.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Tiny helper ──────────────────────────────────────────────────────────────

function generationsRemaining(remaining: number | null, limit: number): string {
  if (remaining === null) return 'unlimited'
  if (remaining <= 0) return `0 of ${limit}`
  return `${remaining} of ${limit}`
}
