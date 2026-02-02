'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast, Toaster } from 'react-hot-toast'
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, Eye } from 'lucide-react'

interface Table {
  id: string
  name: string
  schema: Record<string, unknown>
  createdAt: string
}

interface DatabaseConnection {
  id: string
  name: string
  provider: string
  tables: Table[]
}

export default function DatabasePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set())
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    loadConnections()
  }, [session, status])

  const loadConnections = async () => {
    try {
      const res = await fetch('/api/database/connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])
      } else {
        toast.error('Failed to load database connections')
      }
    } catch (error) {
      console.error('Load connections error:', error)
      toast.error('Error loading connections')
    } finally {
      setLoading(false)
    }
  }

  const toggleConnection = (connectionId: string) => {
    const newExpanded = new Set(expandedConnections)
    if (newExpanded.has(connectionId)) {
      newExpanded.delete(connectionId)
    } else {
      newExpanded.add(connectionId)
    }
    setExpandedConnections(newExpanded)
  }

  const handleViewTable = (table: Table) => {
    setSelectedTable(table)
    setShowTableModal(true)
  }

  const handleDeleteTable = async (tableId: string, tableName: string) => {
    if (!confirm(`Delete table "${tableName}"? This cannot be undone.`)) return

    try {
      toast.loading('Deleting table...', { id: 'delete-table' })
      const res = await fetch(`/api/database/tables/${tableId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadConnections()
        toast.success('✅ Table deleted', { id: 'delete-table', duration: 2000 })
      } else {
        toast.error('❌ Failed to delete table', { id: 'delete-table' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('❌ Error deleting table', { id: 'delete-table' })
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading database connections...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gray-900 text-white p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Database Connections</h1>
              <p className="text-gray-400">Manage your database connections and tables</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Connections List */}
        <div className="max-w-7xl mx-auto space-y-4">
          {connections.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 text-center">
              <div className="text-6xl mb-4">🗄️</div>
              <h3 className="text-xl font-semibold mb-2">No database connections</h3>
              <p className="text-gray-400 mb-6">Create your first database connection to get started</p>
              <button
                onClick={() => router.push('/dashboard/database/new')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition font-medium"
              >
                + Create Connection
              </button>
            </div>
          ) : (
            connections.map((connection) => (
              <div key={connection.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                {/* Connection Header */}
                <div
                  onClick={() => toggleConnection(connection.id)}
                  className="p-6 cursor-pointer hover:bg-gray-750 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {expandedConnections.has(connection.id) ? (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    )}
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-2xl">
                      🗄️
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{connection.name}</h3>
                      <p className="text-sm text-gray-400">{connection.provider} • {connection.tables.length} tables</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/database/${connection.id}/new-table`)
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Table
                    </button>
                  </div>
                </div>

                {/* Expanded Tables List */}
                {expandedConnections.has(connection.id) && (
                  <div className="border-t border-gray-700 bg-gray-900/50">
                    {connection.tables.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-400 mb-4">No tables in this connection</p>
                        <button
                          onClick={() => router.push(`/dashboard/database/${connection.id}/new-table`)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-sm"
                        >
                          + Create First Table
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-700">
                        {connection.tables.map((table) => (
                          <div key={table.id} className="p-4 hover:bg-gray-800 transition flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-xl">
                                📊
                              </div>
                              <div>
                                <h4 className="font-semibold">{table.name}</h4>
                                <p className="text-xs text-gray-400">
                                  {Object.keys(table.schema).length} columns • Created {new Date(table.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewTable(table)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                                title="View schema"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => router.push(`/dashboard/database/tables/${table.id}/edit`)}
                                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                                title="Edit table"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTable(table.id, table.name)}
                                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                                title="Delete table"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Connection Button (if connections exist) */}
        {connections.length > 0 && (
          <div className="max-w-7xl mx-auto mt-6">
            <button
              onClick={() => router.push('/dashboard/database/new')}
              className="w-full p-6 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 rounded-2xl transition flex items-center justify-center gap-3 text-gray-400 hover:text-white"
            >
              <Plus className="w-6 h-6" />
              <span className="font-medium">Add New Database Connection</span>
            </button>
          </div>
        )}
      </div>

      {/* Table Schema Modal */}
      {showTableModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">Table: {selectedTable.name}</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">SCHEMA</h4>
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(selectedTable.schema, null, 2)}</pre>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">DETAILS</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Columns</p>
                    <p className="text-lg font-semibold">{Object.keys(selectedTable.schema).length}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Created</p>
                    <p className="text-lg font-semibold">{new Date(selectedTable.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTableModal(false)
                setSelectedTable(null)
              }}
              className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
