// components/APITestingPanel.tsx
// Interactive API testing playground for generated endpoints

'use client'

import { useState } from 'react'
import { Play, Copy, Check, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface APIEndpoint {
  id: string
  name: string
  path: string
  method: string
  description?: string
  requiresAuth: boolean
  code: string
}

interface TestResult {
  status: number
  statusText: string
  body: unknown
  headers: Record<string, string>
  duration: number
  timestamp: string
}

interface APITestingPanelProps {
  endpoint: APIEndpoint
  baseUrl?: string
}

export default function APITestingPanel({ endpoint, baseUrl = '' }: APITestingPanelProps) {
  const [testRequest, setTestRequest] = useState({
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
    } as Record<string, string>,
    body: endpoint.method !== 'GET' ? '{\n  \n}' : '',
  })

  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const runTest = async () => {
    setIsRunning(true)
    setError(null)
    const startTime = Date.now()

    try {
      // Parse body if it's a JSON string
      let parsedBody = null
      if (testRequest.body && testRequest.method !== 'GET') {
        try {
          parsedBody = JSON.parse(testRequest.body)
        } catch {
          setError('Invalid JSON in request body')
          setIsRunning(false)
          return
        }
      }

      // Make the request
      const response = await fetch(baseUrl + endpoint.path, {
        method: testRequest.method,
        headers: testRequest.headers,
        body: parsedBody ? JSON.stringify(parsedBody) : undefined,
      })

      const duration = Date.now() - startTime

      // Parse response
      let responseBody
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        responseBody = await response.json()
      } else {
        responseBody = await response.text()
      }

      // Extract response headers
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      setTestResult({
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
        headers: responseHeaders,
        duration,
        timestamp: new Date().toISOString(),
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsRunning(false)
    }
  }

  const copyCurlCommand = () => {
    const headers = Object.entries(testRequest.headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' \\\n  ')

    const bodyFlag = testRequest.body && testRequest.method !== 'GET'
      ? `-d '${testRequest.body}'`
      : ''

    const curl = `curl -X ${testRequest.method} \\\n  ${headers} \\\n  ${bodyFlag} \\\n  ${baseUrl}${endpoint.path}`

    navigator.clipboard.writeText(curl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400'
    if (status >= 400 && status < 500) return 'text-yellow-600 dark:text-yellow-400'
    if (status >= 500) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5" />
          Test {endpoint.name}
        </h3>
        <p className="text-blue-100 text-sm mt-1">
          {endpoint.method} {endpoint.path}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Request Configuration */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Request</h4>
          
          {/* Method & Path */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Method
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm">
                {testRequest.method}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Path
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm">
                {endpoint.path}
              </div>
            </div>
          </div>

          {/* Headers */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Headers
            </label>
            {Object.entries(testRequest.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={key}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setTestRequest({
                    ...testRequest,
                    headers: { ...testRequest.headers, [key]: e.target.value }
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            ))}
            <button
              onClick={() => setTestRequest({
                ...testRequest,
                headers: { ...testRequest.headers, [`Header-${Date.now()}`]: '' }
              })}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add Header
            </button>
          </div>

          {/* Body (if not GET) */}
          {testRequest.method !== 'GET' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Request Body (JSON)
              </label>
              <textarea
                value={testRequest.body}
                onChange={(e) => setTestRequest({ ...testRequest, body: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder='{\n  "key": "value"\n}'
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={runTest}
            disabled={isRunning}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Send Request
              </>
            )}
          </button>
          
          <button
            onClick={copyCurlCommand}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy as cURL
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-300">Request Failed</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Response */}
        {testResult && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">Response</h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {testResult.duration}ms
                </span>
                <span className={`font-bold ${getStatusColor(testResult.status)}`}>
                  {testResult.status} {testResult.statusText}
                </span>
              </div>
            </div>

            {/* Status Indicator */}
            {testResult.status >= 200 && testResult.status < 300 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-300 font-medium">
                  Request Successful
                </span>
              </div>
            )}

            {/* Response Headers */}
            <details className="mb-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Response Headers ({Object.keys(testResult.headers).length})
              </summary>
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {Object.entries(testResult.headers).map(([key, value]) => (
                  <div key={key} className="text-xs font-mono mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{key}:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Response Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Response Body
              </label>
              <div className="p-4 bg-gray-900 dark:bg-black rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-100 font-mono">
                  {typeof testResult.body === 'string' 
                    ? testResult.body 
                    : JSON.stringify(testResult.body, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Documentation Hint */}
        {endpoint.requiresAuth && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Authentication Required:</strong> This endpoint requires authentication. 
              Make sure to include valid credentials or session cookies.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
