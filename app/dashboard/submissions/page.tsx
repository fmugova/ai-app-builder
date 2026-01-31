'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// ✅ FIXED INTERFACE - matches Prisma schema
interface Submission {
  id: string
  projectId: string      // ← Changed from siteId
  userId: string
  type: string          // ← Changed from formType
  data: any
  submittedAt: string   // ← Changed from createdAt
  read: boolean
  Project: {
    id: string
    name: string
  }
}

export default function SubmissionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchSubmissions()
    }
  }, [status])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/submissions')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setSubmissions(data.submissions || [])
    } catch (err: any) {
      console.error('Failed to fetch submissions:', err)
      setError(err.message || 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Submissions</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchSubmissions}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Form Submissions</h1>
            <p className="text-sm text-gray-600 mt-1">
              {submissions.length} total submission{submissions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No submissions yet</h3>
            <p className="text-gray-600 mb-6">
              Form submissions from your published sites will appear here
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {submission.Project?.name || 'Unknown Project'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {submission.type}
                  </span>
                </div>

                <div className="space-y-2">
                  {submission.data.name && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-sm text-gray-900">{submission.data.name}</span>
                    </div>
                  )}
                  {submission.data.email && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{submission.data.email}</span>
                    </div>
                  )}
                  {submission.data.message && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Message:</span>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 rounded p-3">
                        {submission.data.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
