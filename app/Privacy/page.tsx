'use client'

import { Navigation } from '@/components/Navigation'
import Link from 'next/link'
export default function PrivacyPage() {
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
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none text-gray-300">
          <p className="text-sm text-gray-500 mb-8">Last updated: December 2024</p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Introduction</h2>
          <p className="mb-6">
            BuildFlow ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Information We Collect</h2>
          <p className="mb-4">We collect information that you provide directly to us, including:</p>
          <ul className="space-y-2 mb-6">
            <li>• Account information (name, email, password)</li>
            <li>• Project data and code you create</li>
            <li>• Usage data and analytics</li>
            <li>• Payment information (processed securely through Stripe)</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">How We Use Your Information</h2>
          <p className="mb-4">We use your information to:</p>
          <ul className="space-y-2 mb-6">
            <li>• Provide and improve our services</li>
            <li>• Process your payments</li>
            <li>• Send you updates and notifications</li>
            <li>• Respond to your requests and support needs</li>
            <li>• Ensure security and prevent fraud</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Data Security</h2>
          <p className="mb-6">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="space-y-2 mb-6">
            <li>• Access your personal data</li>
            <li>• Correct inaccurate data</li>
            <li>• Request deletion of your data</li>
            <li>• Export your data</li>
            <li>• Opt-out of marketing communications</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Contact Us</h2>
          <p className="mb-6">
            If you have questions about this Privacy Policy, please contact us at:{' '}
            <a href="mailto:privacy@buildflow-ai.app" className="text-purple-400 hover:text-purple-300">
              privacy@buildflow-ai.app
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
