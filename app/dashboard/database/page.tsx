'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface DatabaseConnection {
  id: string
  name: string
  provider: string
  supabaseUrl: string
  status: string
  createdAt: string
  Project?: {
    id: string
    name: string
  }
  Tables: Array<{
    id: string
    name: string
  }>
}

export default function DatabasePage() {
  const router = useRouter()
  const { status } = useSession()
  
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newConnection, setNewConnection] = useState({
    name: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    projectId: ''
  })
  const [projects, setProjects] = useState<Array<{id: string, name: string}>>([])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchConnections()
      fetchProjects()
    }
  }, [status, router])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/database/connections')
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (err) {
      console.error('Failed to fetch connections:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.supabaseUrl || !newConnection.supabaseAnonKey) {
      setError('Please fill in all required fields')
      return
    }

    setAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/database/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConnection)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add connection')
      }

      setShowAddModal(false)
      setNewConnection({
        name: '',
        supabaseUrl: '',
        supabaseAnonKey: '',
        supabaseServiceKey: '',
        projectId: ''
      })
      fetchConnections()

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setAdding(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Connections</h1>
            <p className="text-sm text-gray-600 mt-1">
              {connections.length} connection{connections.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              + Add Database
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {connections.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🗄️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No databases yet</h3>
            <p className="text-gray-600 mb-6">
              Connect a Supabase database to add data persistence to your apps
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Connect Your First Database
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{conn.name}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {conn.status}
                      </span>
                    </div>
                    {conn.Project && (
                      <p className="text-sm text-gray-600">
                        Project: <span className="font-medium">{conn.Project.name}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{conn.supabaseUrl}</p>
                  </div>

                  <button
                    onClick={() => router.push(`/dashboard/database/${conn.id}`)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                  >
                    Manage Tables
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {conn.Tables.length} table{conn.Tables.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2 text-sm text-gray-600">
                      <span>Provider: Supabase</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Connect Supabase Database</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Name *
                </label>
                <input
                  type="text"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                  placeholder="My Database"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supabase URL *
                </label>
                <input
                  type="text"
                  value={newConnection.supabaseUrl}
                  onChange={(e) => setNewConnection({...newConnection, supabaseUrl: e.target.value})}
                  placeholder="https://xxxxx.supabase.co"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anon/Public Key *
                </label>
                <input
                  type="password"
                  value={newConnection.supabaseAnonKey}
                  onChange={(e) => setNewConnection({...newConnection, supabaseAnonKey: e.target.value})}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Key (Optional)
                </label>
                <input
                  type="password"
                  value={newConnection.supabaseServiceKey}
                  onChange={(e) => setNewConnection({...newConnection, supabaseServiceKey: e.target.value})}
                  placeholder="For admin operations"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for creating tables and admin operations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Project (Optional)
                </label>
                <select
                  value={newConnection.projectId}
                  onChange={(e) => setNewConnection({...newConnection, projectId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setError(null)
                  setNewConnection({
                    name: '',
                    supabaseUrl: '',
                    supabaseAnonKey: '',
                    supabaseServiceKey: '',
                    projectId: ''
                  })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConnection}
                disabled={adding}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {adding ? 'Connecting...' : 'Connect Database'}
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">How to get Supabase credentials:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Go to supabase.com and create a project</li>
                <li>Settings → API</li>
                <li>Copy &quot;Project URL&quot; and &quot;anon public&quot; key</li>
                <li>Copy &quot;service_role&quot; key for admin access</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}