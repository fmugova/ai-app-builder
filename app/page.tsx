
import { Navigation } from '@/components/Navigation'
import NewsletterSubscribeForm from '@/components/NewsletterSubscribeForm'
import Link from 'next/link'
import Footer from './components/Footer'

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
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              {/* Headline */}
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Build Websites
                </span>
                <br />
                <span className="text-gray-900 dark:text-white">
                  In Seconds, Not Hours
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Describe your idea in plain English. Our AI generates a complete, 
                production-ready website instantly.
              </p>

              {/* Social Proof */}
              <div className="flex items-center justify-center gap-8 mb-10 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-purple-200 border-2 border-white dark:border-gray-800" />
                    <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-white dark:border-gray-800" />
                    <div className="w-8 h-8 rounded-full bg-pink-200 border-2 border-white dark:border-gray-800" />
                  </div>
                  <span>1,000+ projects created</span>
                </div>
                <span>⚡ Average build time: 30s</span>
                <span>✨ No code required</span>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signin"
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold text-lg hover:shadow-xl transition"
                >
                  Start Building Free →
                </Link>
                <Link
                  href="/templates"
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-lg hover:shadow-lg transition"
                >
                  View Templates
                </Link>
              </div>

              {/* Trust Badge */}
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                No credit card required • Free tier forever
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-12">
              Everything You Need to Build Faster
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">✨</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI-Powered Generation</h3>
                <p className="text-gray-400">
                  Advanced AI creates beautiful, functional code from your descriptions. 
                  Get production-ready components instantly.
                </p>
              </div>

              <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Instant Refinements</h3>
                <p className="text-gray-400">
                  Chat with AI to modify your code. Add features, change colors, 
                  or adjust layouts with simple requests.
                </p>
              </div>

              <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">💻</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Clean, Modern Code</h3>
                <p className="text-gray-400">
                  Get React components with Tailwind CSS. Export and use anywhere. 
                  Fully customizable and maintainable.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to Build Something Amazing?
              </h2>
              <p className="text-xl text-purple-100 mb-8">
                Join thousands of developers building faster with AI
              </p>
              <Link
                href="/auth/signin"
                className="inline-block px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-semibold text-lg transition"
              >
                Start Building for Free
              </Link>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-3xl">📬</span>
                <h2 className="text-3xl font-bold text-white">Stay Updated</h2>
              </div>
              <p className="text-purple-100 mb-8">
                Get the latest features, tips, and updates delivered to your inbox
              </p>
              <NewsletterSubscribeForm />
              <p className="text-sm text-purple-200 mt-4">
                No spam. Unsubscribe anytime. We respect your privacy.
              </p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}