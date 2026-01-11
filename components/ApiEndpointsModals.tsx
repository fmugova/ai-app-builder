// components/ApiEndpointsModals.tsx
// Modal components for API endpoint management

'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2, AlertCircle, CheckCircle2, Code } from 'lucide-react'

// Validation result interface
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

// ============================================================================
// CREATE ENDPOINT MODAL
// ============================================================================

interface CreateEndpointModalProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateEndpointModal({
  projectId,
  onClose,
  onSuccess
}: CreateEndpointModalProps) {
  const [step, setStep] = useState(1) // 1 = describe, 2 = configure, 3 = review
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/api/')
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [usesDatabase, setUsesDatabase] = useState(false)
  const [databaseTable, setDatabaseTable] = useState('')

  // Generated code
  const [generatedCode, setGeneratedCode] = useState('')
  const [validation, setValidation] = useState<ValidationResult | null>(null)

  const handleGenerate = async () => {
    setError('')
    setIsGenerating(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/endpoints/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          method,
          path,
          requiresAuth,
          usesDatabase,
          databaseTable: usesDatabase ? databaseTable : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate')
      }

      setGeneratedCode(data.code)
      setValidation(data.validation)
      setStep(3)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to generate')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreate = async () => {
    setError('')
    setIsGenerating(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          method,
          path,
          requiresAuth,
          usesDatabase,
          databaseTable: usesDatabase ? databaseTable : undefined,
          useAI: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create')
      }

      onSuccess()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to create')
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Generate API Endpoint</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Steps Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {[1, 2, 3].map(stepNum => (
                <div key={stepNum} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step >= stepNum
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        step > stepNum ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step 1: Describe */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Describe your endpoint
                </h3>
                <p className="text-gray-600 mb-4">
                  Tell AI what you need in plain English. Be as detailed as possible.
                </p>

                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Example: Create an endpoint that accepts user registration with name, email, and password. Validate the email format, hash the password with bcrypt, save to database, and send a welcome email."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Endpoint Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="User Registration"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    HTTP Method
                  </label>
                  <select
                    value={method}
                    onChange={e => setMethod(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Path
                </label>
                <input
                  type="text"
                  value={path}
                  onChange={e => setPath(e.target.value)}
                  placeholder="/api/users/register"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!description || !name || !path}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Configure
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Configure endpoint
                </h3>
                <p className="text-gray-600 mb-4">
                  Select additional features for your endpoint
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={requiresAuth}
                    onChange={e => setRequiresAuth(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      Require Authentication
                    </div>
                    <div className="text-sm text-gray-600">
                      Only authenticated users can access this endpoint
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={usesDatabase}
                    onChange={e => setUsesDatabase(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Use Database</div>
                    <div className="text-sm text-gray-600 mb-2">
                      This endpoint will read/write to database
                    </div>
                    {usesDatabase && (
                      <input
                        type="text"
                        value={databaseTable}
                        onChange={e => setDatabaseTable(e.target.value)}
                        placeholder="Table name (e.g., users, posts)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    )}
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Review generated code
                </h3>
                <p className="text-gray-600 mb-4">
                  AI has generated your endpoint. Review and create!
                </p>
              </div>

              {/* Validation Status */}
              {validation && (
                <div className="space-y-2">
                  {validation.valid ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Code validated successfully!</span>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-700 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Validation errors:</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {validation.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validation.warnings && validation.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Suggestions:</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-yellow-700">
                        {validation.warnings.map((warn: string, i: number) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Code Preview */}
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96">
                <pre className="text-sm text-gray-100 font-mono">{generatedCode}</pre>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isGenerating || !validation?.valid}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Create Endpoint</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CODE VIEW MODAL
// ============================================================================

interface EndpointData {
  id: string
  name: string
  method: string
  path: string
  code: string
  description?: string
}

interface CodeViewModalProps {
  endpoint: EndpointData
  onClose: () => void
}

export function CodeViewModal({ endpoint, onClose }: CodeViewModalProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    await navigator.clipboard.writeText(endpoint.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">{endpoint.name}</h2>
              <p className="text-sm text-gray-400">{endpoint.path}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Code */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] bg-gray-900">
          <pre className="text-sm text-gray-100 font-mono">{endpoint.code}</pre>
        </div>
      </div>
    </div>
  )
}
