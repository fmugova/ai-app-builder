'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast, Toaster } from 'react-hot-toast'

interface Column {
  name: string
  type: string
  primaryKey: boolean
  nullable: boolean
  unique: boolean
  defaultValue?: string
  foreignKey?: {
    table: string
    column: string
  }
}

interface TableSchema {
  name: string
  columns: Column[]
  timestamps: boolean
  softDeletes: boolean
}

interface DatabaseTable {
  id: string
  name: string
  schema: TableSchema
  createdAt: string
}

interface DatabaseConnection {
  id: string
  name: string
  supabaseUrl: string
  status: string
}

export default function DatabaseTablesPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  
  const connectionId = params.connectionId as string
  
  const [connection, setConnection] = useState<DatabaseConnection | null>(null)
  const [tables, setTables] = useState<DatabaseTable[]>([])
  const [loading, setLoading] = useState(true)
  const [showTableBuilder, setShowTableBuilder] = useState(false)
  const [currentTable, setCurrentTable] = useState<TableSchema>({
    name: '',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, nullable: false, unique: true, defaultValue: 'gen_random_uuid()' }
    ],
    timestamps: true,
    softDeletes: false
  })
  const [generatedSQL, setGeneratedSQL] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchConnection()
      fetchTables()
    }
  }, [status, connectionId, router])

  const fetchConnection = async () => {
    try {
      const response = await fetch('/api/database/connections')
      const data = await response.json()
      const conn = data.connections?.find((c: DatabaseConnection) => c.id === connectionId)
      setConnection(conn || null)
    } catch (err) {
      console.error('Failed to fetch connection:', err)
    }
  }

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/database/tables?connectionId=${connectionId}`)
      const data = await response.json()
      setTables(data.tables || [])
    } catch (err) {
      console.error('Failed to fetch tables:', err)
    } finally {
      setLoading(false)
    }
  }

  const addColumn = () => {
    setCurrentTable({
      ...currentTable,
      columns: [
        ...currentTable.columns,
        { name: '', type: 'TEXT', primaryKey: false, nullable: true, unique: false }
      ]
    })
  }

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const newColumns = [...currentTable.columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setCurrentTable({ ...currentTable, columns: newColumns })
  }

  const removeColumn = (index: number) => {
    const newColumns = currentTable.columns.filter((_, i) => i !== index)
    setCurrentTable({ ...currentTable, columns: newColumns })
  }

  const generateSQL = () => {
    let sql = `-- Table: ${currentTable.name}\n`
    sql += `CREATE TABLE "${currentTable.name}" (\n`
    
    const columnDefs = currentTable.columns.map(col => {
      let def = `  "${col.name}" ${col.type}`
      if (col.primaryKey) def += ' PRIMARY KEY'
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`
      if (!col.nullable && !col.primaryKey) def += ' NOT NULL'
      if (col.unique && !col.primaryKey) def += ' UNIQUE'
      return def
    })
    
    sql += columnDefs.join(',\n')
    
    if (currentTable.timestamps) {
      sql += ',\n  "created_at" TIMESTAMPTZ DEFAULT NOW()'
      sql += ',\n  "updated_at" TIMESTAMPTZ DEFAULT NOW()'
    }
    
    if (currentTable.softDeletes) {
      sql += ',\n  "deleted_at" TIMESTAMPTZ'
    }
    
    sql += '\n);\n\n'
    
    // Add RLS
    sql += `-- Enable Row Level Security\n`
    sql += `ALTER TABLE "${currentTable.name}" ENABLE ROW LEVEL SECURITY;\n\n`
    
    // Add policies
    sql += `-- Create policies\n`
    sql += `CREATE POLICY "Enable read access for authenticated users"\n`
    sql += `  ON "${currentTable.name}" FOR SELECT\n`
    sql += `  USING (auth.role() = 'authenticated');\n\n`
    
    sql += `CREATE POLICY "Enable insert access for authenticated users"\n`
    sql += `  ON "${currentTable.name}" FOR INSERT\n`
    sql += `  WITH CHECK (auth.role() = 'authenticated');\n\n`
    
    // Add updated_at trigger
    if (currentTable.timestamps) {
      sql += `-- Updated at trigger\n`
      sql += `CREATE OR REPLACE FUNCTION update_${currentTable.name}_updated_at()\n`
      sql += `RETURNS TRIGGER AS $$\n`
      sql += `BEGIN\n`
      sql += `  NEW.updated_at = NOW();\n`
      sql += `  RETURN NEW;\n`
      sql += `END;\n`
      sql += `$$ LANGUAGE plpgsql;\n\n`
      
      sql += `CREATE TRIGGER update_${currentTable.name}_timestamp\n`
      sql += `BEFORE UPDATE ON "${currentTable.name}"\n`
      sql += `FOR EACH ROW\n`
      sql += `EXECUTE FUNCTION update_${currentTable.name}_updated_at();\n`
    }
    
    setGeneratedSQL(sql)
  }

  const handleCreateTable = async () => {
    if (!currentTable.name) {
      setError('Table name is required')
      return
    }

    if (currentTable.columns.length === 0) {
      setError('At least one column is required')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/database/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          name: currentTable.name,
          schema: currentTable
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // If API fails, show SQL for manual execution
        if (data.sql) {
          setGeneratedSQL(data.sql)
          setError(`${data.error || 'Failed to create table'}. Copy the SQL below and execute it manually in Supabase SQL Editor.`)
        } else {
          throw new Error(data.error || 'Failed to create table')
        }
        return
      }

      // Success - show confirmation and reset form
      toast.success(`Table "${currentTable.name}" created successfully! 🎉`, {
        duration: 4000,
        position: 'top-center',
      })
      
      setShowTableBuilder(false)
      setCurrentTable({
        name: '',
        columns: [
          { name: 'id', type: 'UUID', primaryKey: true, nullable: false, unique: true, defaultValue: 'gen_random_uuid()' }
        ],
        timestamps: true,
        softDeletes: false
      })
      setGeneratedSQL('')
      fetchTables()

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const copySQL = () => {
    navigator.clipboard.writeText(generatedSQL)
    toast.success('SQL copied to clipboard! 📋', {
      duration: 2000,
      position: 'top-center',
    })
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
      <Toaster />
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Tables</h1>
            {connection && (
              <p className="text-sm text-gray-600 mt-1">
                {connection.name} • {tables.length} table{tables.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTableBuilder(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              + Create Table
            </button>
            <button
              onClick={() => router.push('/dashboard/database')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {tables.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No tables yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first database table using the visual schema designer
            </p>
            <button
              onClick={() => setShowTableBuilder(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Create Your First Table
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{table.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {table.schema.columns.map((col, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {col.name}: {col.type}
                          {col.primaryKey && ' 🔑'}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      {table.schema.columns.length} column{table.schema.columns.length !== 1 ? 's' : ''}
                      {table.schema.timestamps && ' • Timestamps enabled'}
                      {table.schema.softDeletes && ' • Soft deletes enabled'}
                    </p>
                  </div>

                  <button
                    onClick={() => router.push(`/dashboard/database/${connectionId}/${table.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Manage Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Builder Modal */}
      {showTableBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Table Schema Designer</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Table Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Name *
              </label>
              <input
                type="text"
                value={currentTable.name}
                onChange={(e) => setCurrentTable({ ...currentTable, name: e.target.value })}
                placeholder="users, posts, products..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Columns */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Columns</label>
                <button
                  onClick={addColumn}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  + Add Column
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currentTable.columns.map((col, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                      placeholder="column_name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    
                    <select
                      value={col.type}
                      onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="TEXT">TEXT</option>
                      <option value="VARCHAR(255)">VARCHAR(255)</option>
                      <option value="INTEGER">INTEGER</option>
                      <option value="BIGINT">BIGINT</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="UUID">UUID</option>
                      <option value="TIMESTAMPTZ">TIMESTAMPTZ</option>
                      <option value="JSON">JSON</option>
                      <option value="JSONB">JSONB</option>
                    </select>

                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={col.primaryKey}
                          onChange={(e) => updateColumn(idx, 'primaryKey', e.target.checked)}
                        />
                        PK
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={!col.nullable}
                          onChange={(e) => updateColumn(idx, 'nullable', !e.target.checked)}
                        />
                        Required
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={col.unique}
                          onChange={(e) => updateColumn(idx, 'unique', e.target.checked)}
                        />
                        Unique
                      </label>
                    </div>

                    {!col.primaryKey && (
                      <button
                        onClick={() => removeColumn(idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="mb-6 flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentTable.timestamps}
                  onChange={(e) => setCurrentTable({ ...currentTable, timestamps: e.target.checked })}
                />
                <span className="text-sm">Add timestamps (created_at, updated_at)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentTable.softDeletes}
                  onChange={(e) => setCurrentTable({ ...currentTable, softDeletes: e.target.checked })}
                />
                <span className="text-sm">Soft deletes (deleted_at)</span>
              </label>
            </div>

            {/* Preview SQL */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Generated SQL</label>
                <div className="flex gap-2">
                  <button
                    onClick={generateSQL}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Generate SQL
                  </button>
                  {generatedSQL && (
                    <button
                      onClick={copySQL}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Copy SQL
                    </button>
                  )}
                </div>
              </div>
              {generatedSQL && (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-64">
                  {generatedSQL}
                </pre>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTableBuilder(false)
                  setError(null)
                  setGeneratedSQL('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Table'}
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">📝 Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Click "Generate SQL" to preview the schema</li>
                <li>Click "Create Table" to save the schema</li>
                <li>Copy the generated SQL and run it in Supabase SQL Editor</li>
                <li>Your table will be ready to use!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}