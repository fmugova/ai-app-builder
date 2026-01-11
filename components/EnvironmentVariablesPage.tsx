'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Download,
  Eye,
  EyeOff,
  Trash2,
  X,
  Key,
  Lock,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft
} from 'lucide-react'

interface EnvVariable {
  id: string
  key: string
  value: string
  description?: string
  environment: string
  createdAt: Date
  updatedAt: Date
}

interface Props {
  projectId: string
  projectName: string
}

export default function EnvironmentVariablesPage({ projectId, projectName }: Props) {
  const router = useRouter()
  const [variables, setVariables] = useState<EnvVariable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showValues, setShowValues] = useState<Set<string>>(new Set())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newEnvironment, setNewEnvironment] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchVariables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchVariables = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars`)
      const data = await response.json()
      setVariables(data.variables || [])
    } catch (error) {
      console.error('Failed to fetch variables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVariable = async () => {
    setError('')

    if (!newKey || !newValue) {
      setError('Key and value are required')
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey,
          value: newValue,
          description: newDescription,
          environment: newEnvironment
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add variable')
        return
      }

      // Reset form
      setNewKey('')
      setNewValue('')
      setNewDescription('')
      setNewEnvironment('all')
      setIsAddModalOpen(false)

      // Refresh list
      fetchVariables()
    } catch {
      setError('Failed to add variable')
    }
  }

  const handleDeleteVariable = async (id: string, key: string) => {
    if (!confirm(`Delete environment variable "${key}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchVariables()
      }
    } catch {
      alert('Failed to delete variable')
    }
  }

  const handleExport = async (format: 'env' | 'json' = 'env') => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/env-vars/export?format=${format}`
      )

      if (format === 'json') {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        })
        downloadBlob(blob, `${projectName}-env.json`)
      } else {
        const text = await response.text()
        const blob = new Blob([text], { type: 'text/plain' })
        downloadBlob(blob, `${projectName}.env`)
      }
    } catch {
      alert('Failed to export variables')
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleShowValue = (id: string) => {
    setShowValues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const copyValue = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const maskValue = (value: string): string => {
    if (value.length <= 8) {
      return '•'.repeat(value.length)
    }
    return `${value.substring(0, 4)}${'•'.repeat(value.length - 8)}${value.substring(
      value.length - 4
    )}`
  }

  const getEnvironmentBadge = (env: string) => {
    const styles = {
      all: 'bg-purple-100 text-purple-700',
      production: 'bg-red-100 text-red-700',
      development: 'bg-blue-100 text-blue-700',
      preview: 'bg-yellow-100 text-yellow-700'
    }

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          styles[env as keyof typeof styles] || styles.all
        }`}
      >
        {env}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Key className="w-8 h-8 text-green-600" />
                Environment Variables
              </h1>
              <p className="text-gray-500 mt-1">{projectName}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleExport('env')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export .env
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Variable
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Secure Storage
              </h3>
              <p className="text-sm text-blue-800">
                All environment variables are encrypted at rest using AES-256-GCM.
                Values are only decrypted when you view them or export your project.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Variables List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : variables.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No environment variables yet
            </h3>
            <p className="text-gray-500 mb-6">
              Add your first environment variable to store API keys, secrets, and
              configuration
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-5 h-5" />
              Add Variable
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {variables.map(variable => (
              <div
                key={variable.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono font-bold text-gray-900">
                        {variable.key}
                      </code>
                      {getEnvironmentBadge(variable.environment)}
                    </div>

                    {variable.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {variable.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <code className="px-3 py-2 bg-gray-100 rounded font-mono text-sm flex-1">
                        {showValues.has(variable.id)
                          ? variable.value
                          : maskValue(variable.value)}
                      </code>

                      <button
                        onClick={() => toggleShowValue(variable.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title={showValues.has(variable.id) ? 'Hide' : 'Show'}
                      >
                        {showValues.has(variable.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => copyValue(variable.value, variable.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Copy"
                      >
                        {copiedId === variable.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Updated {new Date(variable.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleDeleteVariable(variable.id, variable.key)
                    }
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Variable Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Add Environment Variable
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Key */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Variable Name
                  </label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value.toUpperCase())}
                    placeholder="API_KEY"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Uppercase letters, numbers, and underscores only
                  </p>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Value
                  </label>
                  <textarea
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    placeholder="your_secret_value_here"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="API key for payment processing"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Environment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Environment
                  </label>
                  <select
                    value={newEnvironment}
                    onChange={e => setNewEnvironment(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Environments</option>
                    <option value="production">Production Only</option>
                    <option value="development">Development Only</option>
                    <option value="preview">Preview Only</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVariable}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-medium"
                >
                  Add Variable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
