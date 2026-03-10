// lib/scaffold/dashboard-scaffold.ts
// Dashboard scaffold: extends the base Next.js scaffold with pre-built UI components
// (Sidebar, DataTable, LineChart, StatCard) that Claude can compose rather than recreate.

import { getScaffoldFiles } from './nextjs-scaffold'

// ── Pre-built components ────────────────────────────────────────────────────────

const SIDEBAR_COMPONENT = `'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarLink {
  href: string
  label: string
  icon?: string
}

interface SidebarProps {
  links: SidebarLink[]
  brandName?: string
}

export function Sidebar({ links, brandName = 'Dashboard' }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-700 shrink-0">
        <span className="text-lg font-bold tracking-tight">{brandName}</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
          return (
            <Link
              key={link.href}
              href={link.href}
              className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }\`}
            >
              {link.icon && <span className="text-base">{link.icon}</span>}
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
`

const DATA_TABLE_COMPONENT = `'use client'
import { useState } from 'react'

export interface Column<T> {
  key: keyof T
  header: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  searchKey?: keyof T
  pageSize?: number
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchKey,
  pageSize = 10,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered =
    searchKey && query
      ? data.filter((row) =>
          String(row[searchKey]).toLowerCase().includes(query.toLowerCase())
        )
      : data

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-3">
      {searchKey && (
        <input
          type="text"
          placeholder="Search…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 font-semibold text-gray-700"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-gray-900">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
`

const CHART_COMPONENT = `'use client'

interface DataPoint {
  [key: string]: string | number
}

interface LineChartProps {
  data: DataPoint[]
  xKey: string
  yKey: string
  color?: string
  height?: number
  label?: string
}

export function LineChart({
  data,
  xKey,
  yKey,
  color = '#6366f1',
  height = 220,
  label,
}: LineChartProps) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        No data
      </div>
    )
  }

  const values = data.map((d) => Number(d[yKey]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 460
  const H = height
  const pad = { top: 16, right: 16, bottom: 32, left: 52 }
  const cW = W - pad.left - pad.right
  const cH = H - pad.top - pad.bottom

  const pts = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * cW,
    y: pad.top + (1 - (Number(d[yKey]) - min) / range) * cH,
    xLabel: String(d[xKey]),
    yVal: Number(d[yKey]),
  }))

  const linePath = pts.map((p, i) => \`\${i === 0 ? 'M' : 'L'} \${p.x} \${p.y}\`).join(' ')
  const areaPath = \`\${linePath} L \${pts[pts.length - 1].x} \${pad.top + cH} L \${pad.left} \${pad.top + cH} Z\`

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const xStep = Math.ceil(data.length / 6)
  const xLabelPts = pts.filter((_, i) => i % xStep === 0 || i === pts.length - 1)

  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <svg viewBox={\`0 0 \${W} \${H}\`} className="w-full" style={{ height }}>
        {yTicks.map((t) => {
          const y = pad.top + (1 - t) * cH
          const v = min + t * range
          return (
            <g key={t}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + cW}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={pad.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {v >= 1000 ? \`\${(v / 1000).toFixed(1)}k\` : Math.round(v)}
              </text>
            </g>
          )
        })}
        <path d={areaPath} fill={color} fillOpacity="0.08" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
        {xLabelPts.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={H - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#9ca3af"
          >
            {p.xLabel}
          </text>
        ))}
      </svg>
    </div>
  )
}

export default LineChart
`

const STAT_CARD_COMPONENT = `interface StatCardProps {
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  icon?: string
  color?: 'indigo' | 'green' | 'blue' | 'purple' | 'orange' | 'red'
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
}

export function StatCard({
  label,
  value,
  trend,
  trendUp,
  icon,
  color = 'indigo',
}: StatCardProps) {
  const isPositive = trendUp ?? (typeof trend === 'string' && trend.startsWith('+'))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {icon && (
          <span
            className={\`w-9 h-9 rounded-lg flex items-center justify-center text-base \${
              COLOR_MAP[color] ?? COLOR_MAP.indigo
            }\`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trend && (
        <div
          className={\`flex items-center gap-1 text-xs font-medium \${
            isPositive ? 'text-green-600' : 'text-red-500'
          }\`}
        >
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{trend} vs last period</span>
        </div>
      )}
    </div>
  )
}

export default StatCard
`

// ── Scaffold factory ───────────────────────────────────────────────────────────

export function getDashboardScaffoldFiles(): Record<string, string> {
  return {
    ...getScaffoldFiles(),
    'components/ui/sidebar.tsx': SIDEBAR_COMPONENT,
    'components/ui/data-table.tsx': DATA_TABLE_COMPONENT,
    'components/ui/chart.tsx': CHART_COMPONENT,
    'components/ui/stat-card.tsx': STAT_CARD_COMPONENT,
  }
}

// ── System prompt addon ────────────────────────────────────────────────────────
// Appended to NEXTJS_SYSTEM_PROMPT for dashboard projects.
// Tells Claude to USE the pre-built components rather than recreating them.

export const DASHBOARD_SYSTEM_PROMPT_ADDON = `

## Pre-built Dashboard Components (USE THESE — do not recreate)

The scaffold already includes these production-ready UI components.
Import and compose them instead of writing new ones:

### Sidebar — components/ui/sidebar.tsx
\`\`\`tsx
import { Sidebar } from '@/components/ui/sidebar'
<Sidebar
  brandName="MyApp"
  links={[
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/contacts', label: 'Contacts', icon: '👥' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ]}
/>
\`\`\`

### DataTable — components/ui/data-table.tsx
\`\`\`tsx
import { DataTable } from '@/components/ui/data-table'
<DataTable
  columns={[
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status', render: (v) => <Badge>{v}</Badge> },
    { key: 'date', header: 'Date' },
  ]}
  data={rows}
  searchKey="name"
/>
\`\`\`

### LineChart — components/ui/chart.tsx
\`\`\`tsx
import { LineChart } from '@/components/ui/chart'
<LineChart
  data={[{ month: 'Jan', revenue: 4200 }, { month: 'Feb', revenue: 5800 }]}
  xKey="month"
  yKey="revenue"
  color="#6366f1"
  label="Monthly Revenue"
/>
\`\`\`

### StatCard — components/ui/stat-card.tsx
\`\`\`tsx
import { StatCard } from '@/components/ui/stat-card'
<StatCard label="Total Users" value="1,234" trend="+12%" icon="👥" color="indigo" />
\`\`\`

Place stat cards in a responsive grid:
\`\`\`tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard label="Revenue" value="$48,295" trend="+8.2%" icon="💰" color="green" />
  <StatCard label="Users" value="2,847" trend="+14%" icon="👥" color="indigo" />
  <StatCard label="Orders" value="384" trend="+3.1%" icon="📦" color="blue" />
  <StatCard label="Churn" value="2.4%" trend="-0.5%" trendUp={false} icon="📉" color="red" />
</div>
\`\`\`
`
