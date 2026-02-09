'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'
import { ArrowLeft, Database } from 'lucide-react'
import SupabaseConnectionForm from '@/components/SupabaseConnectionForm'

export default function NewDatabaseConnectionPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const handleSuccess = async (data: {
    name: string
    url: string
    anonKey: string
    serviceKey?: string
  }) => {
    setIsCreating(true)

    try {
      const response = await fetch('/api/database/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          provider: 'supabase',
          supabaseUrl: data.url,
          supabaseAnonKey: data.anonKey,
          supabaseServiceKey: data.serviceKey || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create connection')
      }

      toast.success('Connection created successfully! 🎉', {
        duration: 3000,
        position: 'top-center'
      })

      // Redirect to the new connection's tables page
      setTimeout(() => {
        router.push(`/dashboard/database/${result.connection.id}`)
      }, 1000)

    } catch (error) {
      console.error('Create connection error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to create connection',
        { duration: 4000 }
      )
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/database')
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/database')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Connections
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  New Supabase Connection
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Connect your Supabase project to BuildFlow AI
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            {isCreating ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Creating connection...</p>
              </div>
            ) : (
              <SupabaseConnectionForm
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}
          </div>

          {/* Help Section */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Need help getting started?
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>
                📚 <a 
                  href="/docs/SUPABASE_SETUP_GUIDE.md" 
                  target="_blank"
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Read the Supabase Setup Guide
                </a>
              </li>
              <li>
                🎥 <span className="text-gray-500 dark:text-gray-400">Video Tutorial (coming soon)</span>
              </li>
              <li>
                💬 <a 
                  href="mailto:support@buildflow.ai" 
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
