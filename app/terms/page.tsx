import { Navigation } from '@/components/Navigation'
import Link from 'next/link'

export default function TermsPage() {
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
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Terms of Service</h1>
        <div className="prose prose-invert max-w-none text-gray-300">
          <p className="text-sm text-gray-500 mb-8">Last updated: December 2024</p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Agreement to Terms</h2>
          <p className="mb-6">
            By accessing or using BuildFlow, you agree to be bound by these Terms of Service and all applicable laws and regulations.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Use License</h2>
          <p className="mb-6">
            We grant you a limited, non-exclusive, non-transferable license to use BuildFlow for creating and managing your projects. You retain all rights to the code you generate using our platform.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">User Responsibilities</h2>
          <p className="mb-4">You agree to:</p>
          <ul className="space-y-2 mb-6">
            <li>• Provide accurate account information</li>
            <li>• Keep your password secure</li>
            <li>• Not use the service for illegal purposes</li>
            <li>• Not attempt to hack or disrupt the service</li>
            <li>• Respect intellectual property rights</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Payment Terms</h2>
          <p className="mb-6">
            Paid subscriptions are billed monthly or annually. You can cancel at any time. Refunds are provided according to our refund policy.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Limitation of Liability</h2>
          <p className="mb-6">
            BuildFlow is provided "as is" without warranties. We are not liable for any damages arising from your use of the service.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Contact</h2>
          <p className="mb-6">
            Questions about these terms? Contact us at:{' '}
            <a href="mailto:legal@buildflow-ai.app" className="text-purple-400 hover:text-purple-300">
              legal@buildflow-ai.app
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}