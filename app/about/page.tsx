import { Navigation } from '@/components/Navigation'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
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

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About BuildFlow</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-gray-300 mb-8">
            BuildFlow is an AI-powered no-code platform that helps you create beautiful, production-ready web applications instantly.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Our Mission</h2>
          <p className="text-gray-300 mb-6">
            We believe everyone should be able to bring their ideas to life without needing to write code. BuildFlow democratizes web development by making it accessible to everyone.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">What We Offer</h2>
          <ul className="text-gray-300 space-y-2 mb-6">
            <li>• AI-powered code generation using Claude Sonnet 4</li>
            <li>• Production-ready HTML/CSS/JavaScript output</li>
            <li>• Responsive designs that work on all devices</li>
            <li>• Easy export and deployment options</li>
            <li>• Real-time preview and editing</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Get Started</h2>
          <p className="text-gray-300 mb-6">
            Ready to start building? Sign up for free and create your first project today.
          </p>
          
          <Link 
            href="/auth/signin"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition"
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  )
}