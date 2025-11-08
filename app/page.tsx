import Link from 'next/link'
import { Sparkles, Code, Zap, Shield, Users, ArrowRight, Rocket, Star } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <header className="container mx-auto px-4 py-6 backdrop-blur-lg bg-white/50 sticky top-0 z-50">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-gradient">
              BuildFlow
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-gray-700 hover:text-primary-600 transition font-medium">
              Pricing
            </Link>
            <Link href="/auth/signin" className="text-gray-700 hover:text-primary-600 transition font-medium">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="gradient-primary text-white px-6 py-2 rounded-xl hover:opacity-90 transition shadow-lg font-semibold"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 px-4 py-2 rounded-full mb-6 animate-fade-in">
          <Star className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-primary-700">AI-Powered Development</span>
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-6 animate-slide-up">
          Build Beautiful Apps with{' '}
          <span className="text-gradient">
            AI Power
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Describe your vision, get production-ready code instantly. No coding required.
          Create landing pages, web apps, dashboards, and more in seconds.
        </p>
        <div className="flex gap-4 justify-center mb-6">
          <Link
            href="/auth/signup"
            className="gradient-primary text-white px-10 py-5 rounded-xl text-lg font-bold hover:opacity-90 transition flex items-center gap-2 shadow-2xl transform hover:scale-105"
          >
            Start Building Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pricing"
            className="bg-white text-gray-800 px-10 py-5 rounded-xl text-lg font-bold border-2 border-gray-200 hover:border-primary-500 transition shadow-lg transform hover:scale-105"
          >
            View Pricing
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4 font-medium">
          ✨ Free tier includes 3 generations per month. No credit card required.
        </p>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Build Faster
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to accelerate your development workflow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1">
            <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Generation</h3>
            <p className="text-gray-600 leading-relaxed">
              Advanced AI creates beautiful, functional code from your descriptions. Get production-ready components instantly.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1">
            <div className="w-14 h-14 gradient-secondary rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Refinements</h3>
            <p className="text-gray-600 leading-relaxed">
              Chat with AI to modify your code. Add features, change colors, or adjust layouts with simple requests.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Code className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Clean, Modern Code</h3>
            <p className="text-gray-600 leading-relaxed">
              Get React components with Tailwind CSS. Export and use anywhere. Fully customizable and maintainable.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1">
            <div className="w-14 h-14 gradient-accent rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Save & Organize</h3>
            <p className="text-gray-600 leading-relaxed">
              Save unlimited projects. Access your creations anytime. Build a library of reusable components.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Templates Library</h3>
            <p className="text-gray-600 leading-relaxed">
              Start with professional templates. SaaS pages, dashboards, portfolios, and more. Customize to your needs.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 hover:border-primary-200 transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Export Anywhere</h3>
            <p className="text-gray-600 leading-relaxed">
              Download your code and deploy to Vercel, Netlify, or anywhere. You own everything you create.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="gradient-primary rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -ml-48 -mb-48" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Build Something Amazing?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of developers building faster with AI-powered code generation
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-white text-primary-600 px-10 py-5 rounded-xl text-lg font-bold hover:bg-gray-100 transition shadow-2xl transform hover:scale-105"
            >
              <Sparkles className="w-6 h-6" />
              Start Building for Free
            </Link>
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-12 border-t border-gray-200 bg-white/50 backdrop-blur-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" />
            <span className="text-lg font-bold text-gradient">BuildFlow</span>
          </div>
          <div className="text-center text-gray-600">
            <p className="font-medium">© 2025 BuildFlow. All rights reserved.</p>
            <p className="text-sm text-gray-500 mt-1">Powered by AI, designed for developers</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-gray-600 hover:text-primary-600 transition font-medium">
              Pricing
            </Link>
            <Link href="/auth/signin" className="text-gray-600 hover:text-primary-600 transition font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
