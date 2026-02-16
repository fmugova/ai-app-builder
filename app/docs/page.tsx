import Link from 'next/link'
import { Zap, Rocket, LayoutTemplate, Wrench, Code2, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Documentation — BuildFlow AI' }

const cards = [
  {
    icon: Zap,
    title: 'Quick Start',
    description: 'Create your first site in under 2 minutes.',
    href: '/docs/getting-started',
    color: 'text-yellow-400',
  },
  {
    icon: Rocket,
    title: 'Generate Your First Site',
    description: 'Learn how to write effective prompts and get great results.',
    href: '/docs/generate',
    color: 'text-blue-400',
  },
  {
    icon: LayoutTemplate,
    title: 'Using Templates',
    description: 'Jump-start your project with a professionally designed template.',
    href: '/docs/templates',
    color: 'text-purple-400',
  },
  {
    icon: Rocket,
    title: 'Deploy to Vercel',
    description: 'Publish your site live with a custom domain in one click.',
    href: '/docs/deploy',
    color: 'text-green-400',
  },
  {
    icon: Wrench,
    title: 'Troubleshooting',
    description: 'Fix common issues with generation, deployment, and billing.',
    href: '/docs/troubleshooting',
    color: 'text-orange-400',
  },
  {
    icon: Code2,
    title: 'API Reference',
    description: 'Integrate BuildFlow into your own tools and workflows.',
    href: '/docs/api',
    color: 'text-pink-400',
  },
]

export default function DocsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-3">BuildFlow AI Documentation</h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Everything you need to build, deploy, and manage websites with AI.
          No coding experience required.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map(({ icon: Icon, title, description, href, color }) => (
          <Link
            key={href}
            href={href}
            className="group bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
            <h3 className="text-white font-semibold mb-1">{title}</h3>
            <p className="text-gray-500 text-sm">{description}</p>
          </Link>
        ))}
      </div>

      <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-2">Need help?</h2>
        <p className="text-gray-400 text-sm mb-4">
          Can&apos;t find what you&apos;re looking for? Our support team is here to help.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Contact Support
          </Link>
          <Link
            href="/chatbuilder"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            Open BuildFlow →
          </Link>
        </div>
      </div>
    </div>
  )
}
