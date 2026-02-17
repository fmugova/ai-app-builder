
import { Navigation } from '@/components/Navigation'
import NewsletterForm from '@/components/NewsletterForm'
import Link from 'next/link'
import Footer from './components/Footer'
import { Check } from 'lucide-react'

export default function Page() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        {/* Header */}
        <header className="border-b border-gray-800 sticky top-0 z-30 bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold">B</span>
                </div>
                <span className="text-xl font-bold text-white">BuildFlow</span>
              </Link>
              <Navigation variant="landing" />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-purple-300 text-sm font-medium">Now with multi-page app generation</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                <span className="text-white">Describe Your Idea.</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Get a Working App.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                BuildFlow turns plain-English descriptions into production-ready Next.js
                applications — complete with pages, API routes, and styling.
                No coding experience needed.
              </p>

              {/* Social Proof */}
              <div className="flex items-center justify-center gap-6 md:gap-8 mb-10 text-sm text-gray-500 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-purple-400 border-2 border-gray-950" />
                    <div className="w-7 h-7 rounded-full bg-blue-400 border-2 border-gray-950" />
                    <div className="w-7 h-7 rounded-full bg-pink-400 border-2 border-gray-950" />
                    <div className="w-7 h-7 rounded-full bg-green-400 border-2 border-gray-950" />
                  </div>
                  <span>1,000+ projects built</span>
                </div>
                <span className="hidden sm:inline">|</span>
                <span>30s average build time</span>
                <span className="hidden sm:inline">|</span>
                <span>Free tier forever</span>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signin"
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
                >
                  Start Building Free
                </Link>
                <Link
                  href="/templates"
                  className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-xl font-semibold text-lg transition-all"
                >
                  Browse Templates
                </Link>
              </div>

              <p className="mt-5 text-sm text-gray-600">
                No credit card required
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Three Steps to a Live App
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Go from idea to deployed application in minutes, not weeks.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative text-center">
                <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Describe Your App</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Tell the AI what you want in plain English.
                  &ldquo;Build me an e-commerce store with a product catalog and shopping cart.&rdquo;
                </p>
              </div>
              <div className="relative text-center">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Generates Code</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  BuildFlow creates multi-file Next.js projects with pages,
                  components, API routes, and Tailwind styling — all in ~30 seconds.
                </p>
              </div>
              <div className="relative text-center">
                <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Preview &amp; Deploy</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  See a live preview instantly. Iterate with the AI chat,
                  then publish to your custom domain with one click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything You Need to Ship Faster
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Professional-grade tooling without the learning curve.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: '✨',
                  color: 'purple',
                  title: 'AI-Powered Generation',
                  desc: 'Powered by Claude — generates complete multi-file Next.js projects from a single prompt.',
                },
                {
                  icon: '💬',
                  color: 'blue',
                  title: 'Chat-Based Iteration',
                  desc: 'Refine your app conversationally. "Change the header color" or "Add a contact form" — the AI updates your code.',
                },
                {
                  icon: '📄',
                  color: 'cyan',
                  title: 'Multi-Page Apps',
                  desc: 'Generate full websites with multiple pages, shared layouts, and navigation — not just single-page demos.',
                },
                {
                  icon: '🚀',
                  color: 'green',
                  title: 'One-Click Deploy',
                  desc: 'Publish to Vercel with a custom domain. Your app goes live in seconds with HTTPS included.',
                },
                {
                  icon: '📋',
                  color: 'orange',
                  title: 'Starter Templates',
                  desc: 'Jump-start with professionally designed templates for landing pages, dashboards, portfolios, and more.',
                },
                {
                  icon: '💻',
                  color: 'pink',
                  title: 'Clean, Exportable Code',
                  desc: 'React + Tailwind CSS output. Download the source, push to GitHub, or customize in your own IDE.',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-gray-900 rounded-2xl p-7 border border-gray-800 hover:border-gray-700 transition">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">{icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Comparison */}
        <section className="py-20 px-4 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Start free. Upgrade when you need more power.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Free */}
              <div className="bg-gray-900 rounded-2xl p-7 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-1">Free</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {['3 projects', 'Basic AI generation', 'Community support', 'HTML export'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-400 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signin"
                  className="block w-full py-3 text-center bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition"
                >
                  Get Started
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-gray-900 rounded-2xl p-7 border-2 border-purple-500 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Pro</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">$19</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    'Unlimited projects',
                    'Advanced AI (Claude)',
                    'Priority support',
                    'All templates',
                    'GitHub integration',
                    'Custom domains',
                    'Remove branding',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="block w-full py-3 text-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/20 transition-all"
                >
                  Upgrade to Pro
                </Link>
              </div>

              {/* Business */}
              <div className="bg-gray-900 rounded-2xl p-7 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-1">Business</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">$49</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    'Everything in Pro',
                    'Team collaboration',
                    'API access',
                    'White-label options',
                    'Dedicated support',
                    'SLA guarantee',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-400 text-sm">
                      <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="block w-full py-3 text-center bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
            <p className="text-center text-gray-600 text-sm mt-6">
              All plans include SSL, analytics, and pay-as-you-go credit top-ups.{' '}
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline">
                See full comparison
              </Link>
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Loved by Builders
              </h2>
              <p className="text-gray-400 text-lg">
                Hear from people who ship faster with BuildFlow.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'I described a dashboard and had a working prototype in 30 seconds. This is the future of building.',
                  name: 'Sarah K.',
                  role: 'Startup Founder',
                },
                {
                  quote: 'The multi-page generation is incredible. I built a full marketing site with 5 pages in one prompt.',
                  name: 'James L.',
                  role: 'Freelance Developer',
                },
                {
                  quote: 'Clean React + Tailwind output that I can actually maintain. Not just a demo — real production code.',
                  name: 'Priya M.',
                  role: 'Frontend Engineer',
                },
              ].map(({ quote, name, role }) => (
                <div key={name} className="bg-gray-900 rounded-2xl p-7 border border-gray-800">
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-5">&ldquo;{quote}&rdquo;</p>
                  <div>
                    <p className="text-white font-medium text-sm">{name}</p>
                    <p className="text-gray-500 text-xs">{role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent_50%)]" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Build Something?
                </h2>
                <p className="text-lg text-purple-100 mb-8 max-w-lg mx-auto">
                  Join thousands of developers and founders shipping apps faster with AI.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/auth/signin"
                    className="px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 rounded-xl font-semibold text-lg transition"
                  >
                    Start Building for Free
                  </Link>
                  <Link
                    href="/docs"
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-semibold text-lg transition"
                  >
                    Read the Docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 px-4 border-t border-gray-800/50">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Stay in the Loop</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Get product updates, tips, and new feature announcements.
            </p>
            <NewsletterForm />
            <p className="text-xs text-gray-600 mt-3">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
