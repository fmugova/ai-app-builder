'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import posthog from 'posthog-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string
  amount: number
  status: string
  date: string
  period: string
  url: string | null
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

interface BillingData {
  tier: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  daysRemaining: number
  projectsUsed: number
  projectsLimit: number
  generationsUsed: number
  generationsLimit: number
  extraCreditsPurchased: number
  invoices: Invoice[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_META: Record<string, { price: number; gradient: string; label: string }> = {
  enterprise: { price: 99,  gradient: 'from-purple-500 to-pink-500',  label: 'Enterprise' },
  business:   { price: 49,  gradient: 'from-blue-500 to-cyan-500',    label: 'Business'   },
  pro:        { price: 19,  gradient: 'from-green-500 to-emerald-500', label: 'Pro'        },
  free:       { price: 0,   gradient: 'from-gray-500 to-gray-600',    label: 'Free'       },
}

const PLAN_FEATURES: Record<string, { projects: string; generations: string; perks: string[] }> = {
  enterprise: {
    projects: 'Unlimited', generations: 'Unlimited',
    perks: ['Unlimited projects & generations', 'Priority support', 'Custom domains', 'White-label branding', 'API access', 'Dedicated account manager'],
  },
  business: {
    projects: '200', generations: '500',
    perks: ['200 projects/month', '500 AI generations', 'Custom domains', 'Advanced analytics', 'Priority support', 'API access'],
  },
  pro: {
    projects: '50', generations: '100',
    perks: ['50 projects/month', '100 AI generations', 'Custom domains', 'Analytics dashboard', 'Email support'],
  },
  free: {
    projects: '3', generations: '10',
    perks: ['3 projects/month', '10 AI generations', 'Community support'],
  },
}

const UPGRADE_PLANS = ['pro', 'business', 'enterprise'] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingClient({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [buyingPackage, setBuyingPackage] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchBillingData(), fetchCreditPackages()])
  }, [])

  async function fetchBillingData() {
    try {
      const res = await fetch('/api/billing')
      if (!res.ok) throw new Error('Failed to fetch billing data')
      setBillingData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchCreditPackages() {
    try {
      const res = await fetch('/api/stripe/credits')
      if (res.ok) setCreditPackages(await res.json())
    } catch {
      // non-fatal
    }
  }

  async function openStripePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } catch {
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  async function buyCredits(packageId: string) {
    setBuyingPackage(packageId)
    posthog.capture('credits_purchase_started', { package_id: packageId })
    try {
      const res = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
      else alert(data.error || 'Failed to start checkout')
    } catch (err) {
      posthog.captureException(err)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setBuyingPackage(null)
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function usageBar(used: number, limit: number) {
    if (limit === -1) return { pct: 0, color: 'bg-green-500', label: 'Unlimited' }
    const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
    const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'
    return { pct, color, label: `${pct}%` }
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // ─── Render states ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading billing info…</p>
        </div>
      </div>
    )
  }

  if (error || !billingData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Failed to load billing information</p>
          <button
            onClick={fetchBillingData}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { tier, status, daysRemaining, cancelAtPeriodEnd, invoices,
          projectsUsed, projectsLimit, generationsUsed, generationsLimit,
          extraCreditsPurchased } = billingData

  const meta     = TIER_META[tier]    || TIER_META.free
  const features = PLAN_FEATURES[tier] || PLAN_FEATURES.free
  const genBar   = usageBar(generationsUsed, generationsLimit)
  const projBar  = usageBar(projectsUsed, projectsLimit)
  const isUnlimited = generationsLimit === -1

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition">
              ← Dashboard
            </Link>
            <span className="text-gray-700">|</span>
            <h1 className="text-white font-semibold">Billing & Subscription</h1>
          </div>
          <Link href="/usage" className="text-sm text-purple-400 hover:text-purple-300 transition">
            View Usage Details →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">

        {/* ── Current Plan Hero ─────────────────────────────────────────────── */}
        <div className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-7`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-white">{meta.label} Plan</h2>
                {status === 'active' && (
                  <span className="text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded-full">Active</span>
                )}
                {status === 'trialing' && (
                  <span className="text-xs font-medium bg-yellow-400/30 text-yellow-200 px-2 py-0.5 rounded-full">Trial</span>
                )}
              </div>
              <p className="text-white/80 text-sm mb-3">
                {tier === 'free' ? 'Free forever' : `$${meta.price}/month`}
                {tier !== 'free' && ` · ${daysRemaining} days left in billing period`}
              </p>
              <p className="text-white/60 text-xs">{userEmail}</p>
            </div>
            <div className="flex gap-2">
              {tier === 'free' ? (
                <Link
                  href="/pricing"
                  onClick={() => posthog.capture('upgrade_clicked', { current_tier: tier, source: 'billing_page' })}
                  className="px-5 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold text-sm transition"
                >
                  Upgrade Plan
                </Link>
              ) : (
                <button
                  onClick={openStripePortal}
                  disabled={portalLoading}
                  className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold text-sm transition disabled:opacity-60"
                >
                  {portalLoading ? 'Opening…' : 'Manage Subscription'}
                </button>
              )}
            </div>
          </div>

          {tier !== 'free' && (
            <div className="mt-4 bg-black/20 rounded-xl p-4 text-sm text-white/80 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Billing period: <strong className="text-white">{fmt(billingData.currentPeriodStart)} – {fmt(billingData.currentPeriodEnd)}</strong>
              </span>
              {cancelAtPeriodEnd && (
                <span className="text-yellow-300">⚠ Cancels at end of period</span>
              )}
            </div>
          )}
        </div>

        {/* ── Usage Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* AI Generations */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-900/40 rounded-xl flex items-center justify-center text-xl">✨</div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">AI Generations</p>
                <p className="text-2xl font-bold text-white">
                  {isUnlimited ? '∞' : `${generationsUsed} / ${generationsLimit}`}
                </p>
              </div>
            </div>
            {!isUnlimited && (
              <>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full transition-all ${genBar.color}`} style={{ width: `${genBar.pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{genBar.pct}% used</span>
                  <span>{generationsLimit - generationsUsed} remaining</span>
                </div>
                {extraCreditsPurchased > 0 && (
                  <p className="mt-2 text-xs text-purple-400">
                    +{extraCreditsPurchased} extra credits purchased
                  </p>
                )}
              </>
            )}
            {isUnlimited && <p className="text-xs text-green-400">Unlimited generations included</p>}
          </div>

          {/* Projects */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-900/40 rounded-xl flex items-center justify-center text-xl">📁</div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Projects This Month</p>
                <p className="text-2xl font-bold text-white">
                  {projectsLimit === -1 ? '∞' : `${projectsUsed} / ${projectsLimit}`}
                </p>
              </div>
            </div>
            {projectsLimit !== -1 && (
              <>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full transition-all ${projBar.color}`} style={{ width: `${projBar.pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{projBar.pct}% used</span>
                  <span>{projectsLimit - projectsUsed} remaining</span>
                </div>
              </>
            )}
            {projectsLimit === -1 && <p className="text-xs text-green-400">Unlimited projects included</p>}
          </div>
        </div>

        {/* ── Plan Features ─────────────────────────────────────────────────── */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Plan Includes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-green-400 shrink-0">✓</span>
                <span className="text-gray-300">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Buy Extra Credits ─────────────────────────────────────────────── */}
        {!isUnlimited && creditPackages.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Buy Extra AI Credits</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Credits add to your monthly limit and never expire within the billing period.
                </p>
              </div>
              <Link href="/usage" className="text-xs text-purple-400 hover:text-purple-300 transition shrink-0">
                View usage →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative border rounded-xl p-4 flex flex-col ${
                    pkg.popular
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-700 bg-gray-900/50'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-purple-500 text-white px-2.5 py-0.5 rounded-full">
                      Best Value
                    </span>
                  )}
                  <p className="font-semibold text-white text-sm mb-1">{pkg.name}</p>
                  <p className="text-2xl font-bold text-white mb-0.5">${pkg.price}</p>
                  <p className="text-xs text-gray-400 mb-3">
                    {pkg.credits} credits · ${pkg.pricePerCredit}/each
                  </p>
                  <p className="text-xs text-gray-500 mb-4 flex-1">{pkg.description}</p>
                  <button
                    onClick={() => buyCredits(pkg.id)}
                    disabled={buyingPackage === pkg.id}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                      pkg.popular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    } disabled:opacity-60`}
                  >
                    {buyingPackage === pkg.id ? 'Loading…' : 'Buy Now'}
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              Or <Link href="/pricing" className="text-purple-400 hover:underline">upgrade your plan</Link> for more included generations every month.
            </p>
          </div>
        )}

        {/* ── Available Plans ───────────────────────────────────────────────── */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Available Plans</h3>
            <Link href="/pricing" className="text-sm text-purple-400 hover:text-purple-300 transition">
              Full comparison →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {UPGRADE_PLANS.map((t) => {
              const m = TIER_META[t]
              const f = PLAN_FEATURES[t]
              const isCurrent = tier === t
              return (
                <div
                  key={t}
                  className={`border rounded-xl p-5 ${
                    isCurrent ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-900/50'
                  }`}
                >
                  <div className="mb-3">
                    <h4 className="font-semibold text-white capitalize mb-1">{m.label}</h4>
                    <p className="text-2xl font-bold text-white">
                      ${m.price}<span className="text-sm font-normal text-gray-400">/mo</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{f.projects} projects/mo</p>
                  <p className="text-xs text-gray-400 mb-4">{f.generations} generations</p>
                  {isCurrent ? (
                    <div className="w-full py-2 bg-gray-700 text-gray-400 rounded-lg text-center text-sm cursor-default">
                      Current Plan
                    </div>
                  ) : (
                    <Link
                      href="/pricing"
                      onClick={() => posthog.capture('upgrade_clicked', { current_tier: tier, target_tier: t, source: 'billing_plans' })}
                      className="block w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center text-sm font-medium transition"
                    >
                      {tier === 'free' || UPGRADE_PLANS.indexOf(t) > UPGRADE_PLANS.indexOf(tier as typeof UPGRADE_PLANS[number]) ? 'Upgrade' : 'Downgrade'}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Billing History ───────────────────────────────────────────────── */}
        {invoices.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Billing History</h3>
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-700/60"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{inv.period}</p>
                    <p className="text-xs text-gray-400">{fmt(inv.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-white font-semibold text-sm">${inv.amount.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                      inv.status === 'paid' ? 'bg-green-900/40 text-green-400' :
                      inv.status === 'open' ? 'bg-yellow-900/40 text-yellow-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {inv.status}
                    </span>
                    {inv.url && (
                      <a
                        href={inv.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 transition"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Manage Subscription ───────────────────────────────────────────── */}
        {tier !== 'free' && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Manage Subscription</h3>
            <p className="text-sm text-gray-400 mb-4">
              Update your payment method, download invoices, or cancel your subscription via the Stripe billing portal.
            </p>
            <button
              onClick={openStripePortal}
              disabled={portalLoading}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
            >
              {portalLoading ? 'Opening portal…' : 'Open Billing Portal'}
            </button>
            {cancelAtPeriodEnd && (
              <p className="mt-3 text-sm text-yellow-400">
                ⚠ Your subscription is set to cancel on {fmt(billingData.currentPeriodEnd)}. Reactivate in the portal to continue.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
