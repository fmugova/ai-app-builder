export const dynamic = 'force-dynamic'

import Link from 'next/link'
import NewsletterForm from '@/components/NewsletterForm'
import { Sparkles, Code, Zap, Shield, Users, ArrowRight } from 'lucide-react'
import { MobileMenu } from '@/components/MobileMenu'
import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your projects and build with AI',
  robots: {
    index: false, // Don't index dashboard (private)
    follow: false,
  },
  alternates: {
    // Main canonical URL
    canonical: 'https://buildflow-ai.app',
    
    // Language variants
    languages: {
      'en-US': 'https://buildflow-ai.app',
      'en-GB': 'https://buildflow-ai.app/en-gb',
      'es-ES': 'https://buildflow-ai.app/es',
      'fr-FR': 'https://buildflow-ai.app/fr',
      'de-DE': 'https://buildflow-ai.app/de',
      'x-default': 'https://buildflow-ai.app', // Fallback
    },
    
    // Media variants (mobile/desktop)
    media: {
      'only screen and (max-width: 600px)': 'https://m.buildflow-ai.app',
    },
    
    // Content types
    types: {
      'application/rss+xml': 'https://buildflow-ai.app/rss.xml',
      'application/atom+xml': 'https://buildflow-ai.app/atom.xml',
    },
  },
}

export default function LandingPage() {
  // ✅ JSON-LD Structured Data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BuildFlow - AI App Builder',
    description: 'AI-Powered code generation platform. Build beautiful apps, landing pages, and dashboards instantly with AI. No coding required.',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      priceValidUntil: '2025-12-31',
      availability: 'https://schema.org/InStock',
      description: 'Free tier with 3 AI generations per month'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      bestRating: '5',
      worstRating: '1'
    },
    featureList: [
      'AI-Powered Code Generation',
      'Real-time Chat Refinements',
      'React & Tailwind CSS',
      'Template Library',
      'Export to Any Platform',
      'Unlimited Projects'
    ],
    screenshot: '/og-image.png',
    url: 'https://buildflow-ai.app',
    author: {
      '@type': 'Organization',
      name: 'BuildFlow Team',
      url: 'https://buildflow-ai.app'
    },
    datePublished: '2025-01-01',
    softwareVersion: '1.0.0',
    browserRequirements: 'Requires JavaScript. Modern web browser required.',
    permissions: 'No special permissions required'
  }

  return (
    <>
      {/* ✅ JSON-LD Script for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-white">BuildFlow</h1>
              <Navigation variant="landing" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main>
          {/* Your landing page content */}
        </main>

        {/* Footer - Add this */}
        <footer className="bg-gray-900 text-white py-12 mt-16 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-xl mb-4">BuildFlow</h3>
                <p className="text-gray-400 text-sm">Build amazing apps with AI</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="/pricing" className="hover:text-white transition">Pricing</a></li>
                  <li><a href="/builder" className="hover:text-white transition">Builder</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="/about" className="hover:text-white transition">About</a></li>
                  <li><a href="/contact" className="hover:text-white transition">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="/terms" className="hover:text-white transition">Terms</a></li>
                  <li><a href="/privacy" className="hover:text-white transition">Privacy</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-400">© 2024 BuildFlow. All rights reserved.</p>
                <div className="flex gap-6 text-sm">
                  <a href="https://twitter.com/buildflow" className="text-gray-400 hover:text-white transition">Twitter</a>
                  <a href="https://github.com/buildflow" className="text-gray-400 hover:text-white transition">GitHub</a>
                  <a href="mailto:hello@buildflow.ai" className="text-gray-400 hover:text-white transition">Email</a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
