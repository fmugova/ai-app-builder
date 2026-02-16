import Link from 'next/link'
import { BookOpen, Zap, Rocket, LayoutTemplate, Wrench, Code2, ChevronRight } from 'lucide-react'

const NAV = [
  {
    section: 'Getting Started',
    items: [
      { label: 'Overview', href: '/docs', icon: BookOpen },
      { label: 'Quick Start', href: '/docs/getting-started', icon: Zap },
      { label: 'Generate Your First Site', href: '/docs/generate', icon: Rocket },
    ],
  },
  {
    section: 'Guides',
    items: [
      { label: 'Using Templates', href: '/docs/templates', icon: LayoutTemplate },
      { label: 'Deploy to Vercel', href: '/docs/deploy', icon: Rocket },
      { label: 'Troubleshooting', href: '/docs/troubleshooting', icon: Wrench },
    ],
  },
  {
    section: 'Reference',
    items: [
      { label: 'API Reference', href: '/docs/api', icon: Code2 },
    ],
  },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">

        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            <div>
              <Link href="/docs" className="flex items-center gap-2 text-white font-semibold mb-4">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Documentation
              </Link>
            </div>
            {NAV.map((group) => (
              <div key={group.section}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {group.section}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile breadcrumb nav */}
        <div className="lg:hidden w-full mb-4">
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4 flex-wrap">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {NAV.flatMap(g => g.items).map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {children}
        </main>
      </div>
    </div>
  )
}
