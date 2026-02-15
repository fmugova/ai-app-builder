'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Activity,
  BarChart3, ArrowLeft, RefreshCw, ArrowUpRight, ArrowDownRight,
  Zap, ShoppingBag, Globe,
} from 'lucide-react'

interface Metrics {
  period: string
  generatedAt: string
  users: { total: number; newThisPeriod: number; growthPct: number; dau: number; wau: number; mau: number }
  revenue: { mrr: number; arr: number; thisPeriod: number; growthPct: number }
  subscriptions: {
    active: number; newThisPeriod: number; churned: number; churnRate: number
    planDistribution: { plan: string; count: number; percentage: number; revenue: number }[]
  }
  funnel: { step: string; count: number; rate: number }[]
  projects: { total: number; newThisPeriod: number; published: number }
  templates: { totalRevenue: number; totalPurchases: number }
  monthlyTrend: { month: string; newSubscribers: number; churned: number; signups: number; estimatedMrr: number }[]
}

type Period = '7d' | '30d' | '90d' | '1y'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtUSD(n: number) {
  return '$' + (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : fmt(n))
}

function StatCard({
  label, value, sub, icon: Icon, trend, trendLabel, color = 'blue',
}: {
  label: string; value: string; sub?: string; icon: React.ElementType
  trend?: number; trendLabel?: string; color?: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
  }
  const isUp = trend !== undefined && trend >= 0
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className={`p-2 rounded-lg ${colorMap[color] ?? colorMap.blue}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}% {trendLabel ?? 'vs prev period'}
        </div>
      )}
    </div>
  )
}

function MiniBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function MetricsDashboard() {
  const [data, setData] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')
  const { data: session, status } = useSession()
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/metrics?period=${period}`)
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch {
      // keep stale data
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetch('/api/admin/check').then(r => r.json()).then(d => {
      if (!d.isAdmin) router.push('/dashboard')
      else load()
    }).catch(() => router.push('/dashboard'))
  }, [session, status, load, router])

  useEffect(() => {
    if (data) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  if (status === 'loading' || (loading && !data)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading metrics…</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const maxMrr = Math.max(...data.monthlyTrend.map(m => m.estimatedMrr), 1)
  const maxSignups = Math.max(...data.monthlyTrend.map(m => m.signups), 1)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Business Metrics</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Last updated {new Date(data.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d', '1y'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}>
                {p}
              </button>
            ))}
            <button onClick={load}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors ml-1">
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Revenue row */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Revenue</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="MRR" value={fmtUSD(data.revenue.mrr)}
              sub="Monthly Recurring Revenue" icon={DollarSign} color="green" />
            <StatCard label="ARR" value={fmtUSD(data.revenue.arr)}
              sub="Annual Run Rate" icon={TrendingUp} color="green" />
            <StatCard label={`Revenue (${period})`} value={fmtUSD(data.revenue.thisPeriod)}
              icon={DollarSign} trend={data.revenue.growthPct} color="green" />
            <StatCard label="Active Subscribers" value={fmt(data.subscriptions.active)}
              sub={`${data.subscriptions.newThisPeriod} new this period`}
              icon={BarChart3} color="blue" />
          </div>
        </div>

        {/* Users row */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Users</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={fmt(data.users.total)}
              sub={`+${data.users.newThisPeriod} this period`}
              icon={Users} trend={data.users.growthPct} color="purple" />
            <StatCard label="DAU" value={fmt(data.users.dau)}
              sub="Daily Active Users" icon={Activity} color="purple" />
            <StatCard label="WAU" value={fmt(data.users.wau)}
              sub="Weekly Active Users" icon={Activity} color="purple" />
            <StatCard label="MAU" value={fmt(data.users.mau)}
              sub="Monthly Active Users" icon={Activity} color="purple" />
          </div>
        </div>

        {/* Projects + Churn row */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Activity & Health</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Projects" value={fmt(data.projects.total)}
              sub={`+${data.projects.newThisPeriod} this period`}
              icon={Zap} color="amber" />
            <StatCard label="Published Sites" value={fmt(data.projects.published)}
              icon={Globe} color="amber" />
            <StatCard label="Churn Rate" value={`${data.subscriptions.churnRate}%`}
              sub={`${data.subscriptions.churned} cancellations`}
              icon={TrendingDown} color="rose" />
            <StatCard label="Template Revenue" value={fmtUSD(data.templates.totalRevenue)}
              sub={`${data.templates.totalPurchases} purchases`}
              icon={ShoppingBag} color="blue" />
          </div>
        </div>

        {/* Conversion Funnel + Plan Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Funnel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-5">Conversion Funnel</h2>
            <div className="space-y-4">
              {data.funnel.map((step, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300">{step.step}</span>
                    <span className="text-white font-medium">
                      {fmt(step.count)}
                      <span className="text-gray-500 font-normal ml-2">({step.rate}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500"
                      style={{ width: `${step.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-4">Based on new users in selected period.</p>
          </div>

          {/* Plan distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-5">Plan Distribution</h2>
            {data.subscriptions.planDistribution.length === 0 ? (
              <p className="text-gray-500 text-sm">No active subscriptions yet.</p>
            ) : (
              <div className="space-y-3">
                {data.subscriptions.planDistribution
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 capitalize">{p.plan}</span>
                        <span className="text-white font-medium">
                          {p.count} users
                          <span className="text-gray-500 font-normal ml-2">
                            ({p.percentage}%) · {fmtUSD(p.revenue)}/mo
                          </span>
                        </span>
                      </div>
                      <MiniBar value={p.percentage} max={100}
                        color={p.plan === 'pro' ? 'bg-blue-500' : p.plan === 'free' ? 'bg-gray-600' : 'bg-purple-500'} />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-6">6-Month Trend</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">Month</th>
                  <th className="text-right pb-3 font-medium">Signups</th>
                  <th className="text-right pb-3 font-medium">New Paid</th>
                  <th className="text-right pb-3 font-medium">Churned</th>
                  <th className="text-right pb-3 font-medium">Est. MRR</th>
                  <th className="pb-3 pl-4 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {data.monthlyTrend.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 text-gray-300 font-medium">{m.month}</td>
                    <td className="py-3 text-right text-gray-400">{fmt(m.signups)}</td>
                    <td className="py-3 text-right text-green-400">{fmt(m.newSubscribers)}</td>
                    <td className="py-3 text-right text-red-400">{fmt(m.churned)}</td>
                    <td className="py-3 text-right text-white font-medium">{fmtUSD(m.estimatedMrr)}</td>
                    <td className="py-3 pl-4">
                      <MiniBar value={m.estimatedMrr} max={maxMrr} color="bg-blue-500" />
                      <MiniBar value={m.signups} max={maxSignups} color="bg-purple-500/60" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
