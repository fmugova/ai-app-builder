'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface TableData {
  id: string
  name: string
  schema: {
    columns: Array<{
      name: string
      type: string
      primaryKey: boolean
    }>
  }
}

export default function DataManagementPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  
  const connectionId = params.connectionId as string
  const tableId = params.tableId as string
  
  const [table, setTable] = useState<TableData | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<any>({})
  const [editingRecord, setEditingRecord] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchTableData()
    }
  }, [status, tableId, router])

  const fetchTableData = async () => {
    try {
      // Fetch table schema
      const tableResponse = await fetch(`/api/database/tables?connectionId=${connectionId}`)
      const tableData = await tableResponse.json()
      const foundTable = tableData.tables?.find((t: TableData) => t.id === tableId)
      setTable(foundTable || null)

      // Fetch data
      const dataResponse = await fetch(`/api/database/data?tableId=${tableId}`)
      const data = await dataResponse.json()
      setData(data.data || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/database/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          data: currentRecord
        })
      })

      if (!response.ok) throw new Error('Failed to create record')

      setShowAddModal(false)
      setCurrentRecord({})
      fetchTableData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleEdit = async () => {
    try {
      const response = await fetch('/api/database/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          recordId: editingRecord.id,
          data: editingRecord
        })
      })

      if (!response.ok) throw new Error('Failed to update record')

      setShowEditModal(false)
      setEditingRecord(null)
      fetchTableData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('Delete this record? This cannot be undone.')) return

    try {
      const response = await fetch('/api/database/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          recordId
        })
      })

      if (!response.ok) throw new Error('Failed to delete record')

      fetchTableData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Table not found</p>
          <button
            onClick={() => router.push(`/dashboard/database/${connectionId}`)}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            ← Back to Tables
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{table.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {data.length} record{data.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              + Add Record
            </button>
            <button
              onClick={() => router.push(`/dashboard/database/${connectionId}`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {data.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No data yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first record to this table
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Add First Record
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {table.schema.columns.map((col) => (
                      <th
                        key={col.name}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col.name}
                        {col.primaryKey && ' 🔑'}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((record, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {table.schema.columns.map((col) => (
                        <td key={col.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof record[col.name] === 'object'
                            ? JSON.stringify(record[col.name])
                            : String(record[col.name] ?? '-')}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => {
                            setEditingRecord(record)
                            setShowEditModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Record</h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {table.schema.columns
                .filter(col => !col.primaryKey)
                .map((col) => (
                  <div key={col.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {col.name}
                    </label>
                    <input
                      type="text"
                      value={currentRecord[col.name] || ''}
                      onChange={(e) => setCurrentRecord({ ...currentRecord, [col.name]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setCurrentRecord({})
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Record</h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {table.schema.columns
                .filter(col => !col.primaryKey)
                .map((col) => (
                  <div key={col.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {col.name}
                    </label>
                    <input
                      type="text"
                      value={editingRecord[col.name] || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, [col.name]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingRecord(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}