import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import VercelConnectButton from '@/components/VercelConnectButton'
import Link from 'next/link'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
        
        {/* Deployment Integrations */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Deployment Integrations
          </h2>
          <VercelConnectButton />
        </section>
      </div>
    </div>
  )
}