export const dynamic = 'force-dynamic'

import Link from 'next/link'
import NewsletterForm from '@/components/NewsletterForm'
import { Sparkles, Code, Zap, Shield, Users, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

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

export default function Home() {
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

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                BuildFlow
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-gray-700 hover:text-purple-600 transition">
                Pricing
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-purple-600 transition">
                Contact
              </Link>
              <Link href="/auth/signin" className="text-gray-700 hover:text-purple-600 transition">
                Sign In
              </Link>
              <Link 
                href="/auth/signup"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Build Beautiful Apps with{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Power
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Describe your vision, get production-ready code instantly. No coding required.
            Create landing pages, web apps, dashboards, and more in seconds.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/auth/signup"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition flex items-center gap-2"
            >
              Start Building Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/pricing"
              className="bg-white text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-gray-300 hover:border-purple-600 transition"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Free tier includes 3 generations per month. No credit card required.
          </p>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Everything You Need to Build Faster
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Generation</h3>
              <p className="text-gray-600">
                Advanced AI creates beautiful, functional code from your descriptions. Get production-ready components instantly.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Refinements</h3>
              <p className="text-gray-600">
                Chat with AI to modify your code. Add features, change colors, or adjust layouts with simple requests.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Clean, Modern Code</h3>
              <p className="text-gray-600">
                Get React components with Tailwind CSS. Export and use anywhere. Fully customizable and maintainable.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Save & Organize</h3>
              <p className="text-gray-600">
                Save unlimited projects. Access your creations anytime. Build a library of reusable components.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Templates Library</h3>
              <p className="text-gray-600">
                Start with professional templates. SaaS pages, dashboards, portfolios, and more. Customize to your needs.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Export Anywhere</h3>
              <p className="text-gray-600">
                Download your code and deploy to Vercel, Netlify, or anywhere. You own everything you create.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Ready to Build Something Amazing?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of developers building faster with AI
            </p>
            <Link 
              href="/auth/signup"
              className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
            >
              Start Building for Free
            </Link>
          </div>
        </section>

        {/* Newsletter Signup Section */}
        <section className="py-20 px-6 bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <NewsletterForm />
          </div>
        </section>

        {/* DO NOT include footer here - it's in layout.tsx */}
      </div>
    </>
  )
}
