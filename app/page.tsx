
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
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Build Beautiful Apps with{' '}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
                AI Power
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
              Describe your vision, get production-ready code instantly. No coding required. 
              Create landing pages, web apps, dashboards, and more in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/auth/signin"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold text-lg transition flex items-center gap-2"
              >
                Start Building Free
                <span>→</span>
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold text-lg transition"
              >
                View Pricing
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Free tier includes 3 generations per month. No credit card required.
            </p>
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