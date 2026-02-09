// components/SupabaseConnectionForm.tsx
// Enhanced Supabase connection form with test connection button

'use client'

import { useState } from 'react'
import { ExternalLink, CheckCircle2, XCircle, Loader2, Info, Eye, EyeOff } from 'lucide-react'

interface SupabaseConnectionFormProps {
  onSuccess: (connection: { url: string; anonKey: string; serviceKey?: string; name: string }) => void
  onCancel: () => void
  initialValues?: {
    name?: string
    url?: string
    anonKey?: string
    serviceKey?: string
  }
}

export default function SupabaseConnectionForm({
  onSuccess,
  onCancel,
  initialValues
}: SupabaseConnectionFormProps) {
  const [name, setName] = useState(initialValues?.name || '')
  const [url, setUrl] = useState(initialValues?.url || '')
  const [anonKey, setAnonKey] = useState(initialValues?.anonKey || '')
  const [serviceKey, setServiceKey] = useState(initialValues?.serviceKey || '')
  
  const [showAnonKey, setShowAnonKey] = useState(false)
  const [showServiceKey, setShowServiceKey] = useState(false)
  
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const testConnection = async () => {
    // Validate inputs first
    if (!url || !anonKey) {
      setTestResult({
        success: false,
        message: 'Please provide both Supabase URL and Anon Key'
      })
      return
    }

    // Validate URL format
    if (!url.includes('supabase.co') && !url.includes('localhost')) {
      setTestResult({
        success: false,
        message: 'Invalid Supabase URL format. Should be https://[project].supabase.co'
      })
      return
    }

    // Validate key format
    if (anonKey.length < 20) {
      setTestResult({
        success: false,
        message: 'Anon key appears to be invalid. Please check again.'
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      // Call our Supabase test endpoint
      const response = await fetch('/api/database/test-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          anonKey,
          serviceKey: serviceKey || undefined
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Connection successful! ✓ Your credentials are valid.'
        })
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Connection failed. Please check your credentials.'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error. Please try again.'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!testResult?.success) {
      setTestResult({
        success: false,
        message: 'Please test the connection before saving'
      })
      return
    }

    onSuccess({ name, url, anonKey, serviceKey })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Instructions Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Where to find your Supabase credentials
            </h4>
            <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Supabase Dashboard</a></li>
              <li>Select your project</li>
              <li>Click on Settings → API</li>
              <li>Copy your Project URL and anon/public key</li>
              <li>Optionally, copy the service_role key (for admin operations)</li>
            </ol>
            <a 
              href="https://supabase.com/docs/guides/api/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-2"
            >
              Read documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Connection Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Connection Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Supabase Project"
          required
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Supabase URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Supabase Project URL *
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setTestResult(null) // Clear test result on change
          }}
          placeholder="https://your-project.supabase.co"
          required
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Format: https://[project-ref].supabase.co
        </p>
      </div>

      {/* Anon Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Anon / Public Key *
        </label>
        <div className="relative">
          <input
            type={showAnonKey ? 'text' : 'password'}
            value={anonKey}
            onChange={(e) => {
              setAnonKey(e.target.value)
              setTestResult(null) // Clear test result on change
            }}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            required
            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowAnonKey(!showAnonKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showAnonKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This key is safe to use in the browser (client-side)
        </p>
      </div>

      {/* Service Key (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Service Role Key (Optional)
        </label>
        <div className="relative">
          <input
            type={showServiceKey ? 'text' : 'password'}
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (optional)"
            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowServiceKey(!showServiceKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showServiceKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          For server-side admin operations (bypasses RLS). Keep this secret!
        </p>
      </div>

      {/* Test Connection Button */}
      <div>
        <button
          type="button"
          onClick={testConnection}
          disabled={testing || !url || !anonKey}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Test Connection
            </>
          )}
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-4 rounded-lg border ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${
              testResult.success
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
            }`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!testResult?.success}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Save Connection
        </button>
      </div>

      {!testResult?.success && url && anonKey && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Test your connection before saving to ensure credentials are valid
        </p>
      )}
    </form>
  )
}
