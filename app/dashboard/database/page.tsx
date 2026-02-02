// app/dashboard/database/page.tsx
// FIXED: Add null checks to prevent "Cannot read properties of undefined" error

'use client'

import { useEffect, useState } from 'react'

export default function DatabasePage() {
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchConnections()
  }, [])

  async function fetchConnections() {
    try {
      setLoading(true)
      const res = await fetch('/api/database/connections')
      
      if (!res.ok) {
        throw new Error('Failed to fetch connections')
      }

      const data = await res.json()
      
      // ✅ Add null check - ensure data.connections is an array
      setConnections(Array.isArray(data?.connections) ? data.connections : [])
      
    } catch (err: any) {
      console.error('Failed to fetch connections:', err)
      setError(err.message || 'Failed to load database connections')
      setConnections([]) // ✅ Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Database Connections</h1>
      
      {/* ✅ Safe to use .length now - connections is always an array */}
      {connections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No database connections yet</p>
          <button
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            onClick={() => {/* Add connection handler */}}
          >
            Add Connection
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold">{conn.name}</h3>
              <p className="text-sm text-gray-600">{conn.provider}</p>
              {/* ✅ Add null check for tables array */}
              <p className="text-xs text-gray-500 mt-2">
                {Array.isArray(conn.tables) ? conn.tables.length : 0} tables
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
