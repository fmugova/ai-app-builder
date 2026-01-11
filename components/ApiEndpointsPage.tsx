'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Code,
  Play,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  Zap,
  Database,
  Lock,
  Terminal,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { CreateEndpointModal, CodeViewModal } from './ApiEndpointsModals'

interface ApiEndpoint {
  id: string
  name: string
  path: string
  method: string
  description?: string
  code: string
  requiresAuth: boolean
  usesDatabase: boolean
  databaseTable?: string
  isActive: boolean
  testsPassed: boolean
  lastTested?: Date
  createdAt: Date
  updatedAt: Date
}

interface Props {
  projectId: string
  projectName: string
}

export default function ApiEndpointsPage({ projectId, projectName }: Props) {
  const router = useRouter()
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchEndpoints()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEndpoints = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/endpoints`)
      const data = await response.json()
      setEndpoints(data.endpoints || [])
    } catch {
      console.error('Failed to fetch endpoints')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEndpoint = async (id: string, name: string) => {
    if (!confirm(`Delete endpoint "${name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/endpoints/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchEndpoints()
      }
    } catch {
      alert('Failed to delete endpoint')
    }
  }

  const handleTestEndpoint = async (id: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/endpoints/${id}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testData: {} })
        }
      )

      const data = await response.json()

      if (data.testResult?.success) {
        alert('Test passed! ✅')
        fetchEndpoints()
      } else {
        alert('Test failed! ❌')
      }
    } catch {
      alert('Failed to test endpoint')
    }
  }

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-700 border-blue-300',
      POST: 'bg-green-100 text-green-700 border-green-300',
      PUT: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      DELETE: 'bg-red-100 text-red-700 border-red-300',
      PATCH: 'bg-purple-100 text-purple-700 border-purple-300'
    }
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <Terminal className="w-8 h-8 text-purple-600" />
                API Endpoints
              </h1>
              <p className="text-gray-500 mt-1">{projectName}</p>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-lg font-semibold transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Generate with AI
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-900 mb-1">
                AI-Powered Backend Generation
              </h3>
              <p className="text-sm text-purple-800">
                Describe what you need and AI will generate production-ready API endpoints
                with authentication, validation, and error handling.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <Terminal className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No API endpoints yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Generate your first API endpoint using AI. Just describe what you need!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Generate First Endpoint
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {endpoints.map(endpoint => (
              <div
                key={endpoint.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-bold border ${getMethodColor(
                            endpoint.method
                          )}`}
                        >
                          {endpoint.method}
                        </span>
                        <code className="text-lg font-mono font-semibold text-gray-900">
                          {endpoint.path}
                        </code>
                        {!endpoint.isActive && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            Inactive
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {endpoint.name}
                      </h3>

                      {endpoint.description && (
                        <p className="text-gray-600 mb-3">{endpoint.description}</p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3">
                        {endpoint.requiresAuth && (
                          <div className="flex items-center gap-1 text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-lg">
                            <Lock className="w-4 h-4" />
                            Auth Required
                          </div>
                        )}
                        {endpoint.usesDatabase && (
                          <div className="flex items-center gap-1 text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">
                            <Database className="w-4 h-4" />
                            {endpoint.databaseTable || 'Database'}
                          </div>
                        )}
                        {endpoint.testsPassed && (
                          <div className="flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                            Tests Passed
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTestEndpoint(endpoint.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Test endpoint"
                      >
                        <Play className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedEndpoint(endpoint)
                          setIsCodeModalOpen(true)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View code"
                      >
                        <Code className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => copyCode(endpoint.code, endpoint.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy code"
                      >
                        {copiedId === endpoint.id ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteEndpoint(endpoint.id, endpoint.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Code Preview */}
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100 font-mono">
                      {endpoint.code.split('\n').slice(0, 5).join('\n')}
                      {endpoint.code.split('\n').length > 5 && '\n...'}
                    </pre>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                    <span>
                      Created {new Date(endpoint.createdAt).toLocaleDateString()}
                    </span>
                    {endpoint.lastTested && (
                      <span>
                        Last tested {new Date(endpoint.lastTested).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Endpoint Modal */}
      {isCreateModalOpen && (
        <CreateEndpointModal
          projectId={projectId}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            fetchEndpoints()
          }}
        />
      )}

      {/* Code Modal */}
      {isCodeModalOpen && selectedEndpoint && (
        <CodeViewModal
          endpoint={selectedEndpoint}
          onClose={() => {
            setIsCodeModalOpen(false)
            setSelectedEndpoint(null)
          }}
        />
      )}
    </div>
  )
}
