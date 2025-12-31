'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface CustomDomain {
  id: string
  domain: string
  status: string
  verificationKey: string | null
  verifiedAt: string | null
  sslStatus: string
  createdAt: string
  project: {
    id: string
    name: string
  }
}

export default function CustomDomainsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [projects, setProjects] = useState<Array<{id: string, name: string}>>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchDomains()
      fetchProjects()
    }
  }, [status, router])

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/domains')
      const data = await response.json()
      setDomains(data.domains || [])
    } catch (err) {
      console.error('Failed to fetch domains:', err)
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

  const handleAddDomain = async () => {
    if (!newDomain || !selectedProject) {
      setError('Please enter a domain and select a project')
      return
    }

    setAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain.trim().toLowerCase(),
          projectId: selectedProject
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      setShowAddModal(false)
      setNewDomain('')
      setSelectedProject('')
      fetchDomains()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleVerify = async (domainId: string) => {
    try {
      const response = await fetch(`/api/domains/${domainId}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.verified) {
        alert('✅ Domain verified successfully!')
      } else {
        alert('⏳ Domain verification in progress. Please wait a few minutes and try again.')
      }

      fetchDomains()

    } catch (err: any) {
      alert(`❌ Verification failed: ${err.message}`)
    }
  }

  const handleDelete = async (domainId: string, domain: string) => {
    if (!confirm(`Delete ${domain}? This cannot be undone.`)) return

    try {
      await fetch(`/api/domains/${domainId}`, {
        method: 'DELETE'
      })

      fetchDomains()

    } catch (err: any) {
      alert(`Failed to delete domain: ${err.message}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verifying: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    )
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
            <h1 className="text-2xl font-bold text-gray-900">Custom Domains</h1>
            <p className="text-sm text-gray-600 mt-1">
              {domains.length} domain{domains.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              + Add Domain
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
        {domains.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🌐</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No custom domains yet</h3>
            <p className="text-gray-600 mb-6">
              Add a custom domain to make your published sites accessible on your own domain
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Add Your First Domain
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{domain.domain}</h3>
                      {getStatusBadge(domain.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Project: <span className="font-medium">{domain.project.name}</span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {domain.status === 'pending' && (
                      <button
                        onClick={() => handleVerify(domain.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Verify Domain
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(domain.id, domain.domain)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {domain.status === 'pending' && domain.verificationKey && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">DNS Configuration Required:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-4">
                        <span className="font-medium w-20">Type:</span>
                        <span className="font-mono bg-white px-2 py-1 rounded">TXT</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="font-medium w-20">Name:</span>
                        <span className="font-mono bg-white px-2 py-1 rounded">_vercel</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="font-medium w-20">Value:</span>
                        <span className="font-mono bg-white px-2 py-1 rounded text-xs break-all">
                          {domain.verificationKey}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Add this TXT record to your domain DNS settings, then click Verify Domain
                    </p>
                  </div>
                )}

                {domain.status === 'active' && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Domain is active and serving traffic with SSL certificate
                    </p>
                    
                    <a
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-700 font-medium mt-2 inline-block"
                    >
                      Visit site →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Custom Domain</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your domain without http:// or www
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose a project...</option>
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
                  setNewDomain('')
                  setSelectedProject('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDomain}
                disabled={adding}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Domain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}