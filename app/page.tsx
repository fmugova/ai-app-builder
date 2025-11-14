import Link from 'next/link'
import { Sparkles, Code, Zap, Shield, Users, ArrowRight, GraduationCap, BarChart3, BookOpen } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI App Builder
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-gray-700 hover:text-purple-600 transition">
              Pricing
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

      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-12 text-white mb-12">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="w-12 h-12 mr-4" />
            <h2 className="text-4xl font-bold">Teacher's Digital Planner</h2>
          </div>
          <p className="text-xl mb-8 opacity-90 text-center max-w-3xl mx-auto">
            A comprehensive productivity and student data analysis platform for UK secondary school teachers.
            Track student progress, generate AI-powered lesson plans, analyze GCSE/A-Level data, and plan interventions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <BarChart3 className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-2">Data Analysis & KPIs</h3>
              <p className="text-sm opacity-90">Track progress, identify at-risk students, analyze performance gaps</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <BookOpen className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-2">AI Lesson Planning</h3>
              <p className="text-sm opacity-90">Generate curriculum-aligned lesson plans with differentiation</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <Sparkles className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-2">Intervention Planning</h3>
              <p className="text-sm opacity-90">AI-powered intervention strategies and effectiveness tracking</p>
            </div>
          </div>
          <div className="text-center">
            <Link
              href="/teacher"
              className="inline-block bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
            >
              Access Teacher Dashboard
            </Link>
          </div>
        </div>

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

      <footer className="container mx-auto px-4 py-8 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>© 2025 AI App Builder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
