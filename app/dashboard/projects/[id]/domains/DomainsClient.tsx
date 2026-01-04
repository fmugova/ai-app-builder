'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CustomDomain {
  id: string
  domain: string
  status: string
  verificationKey: string | null
  verifiedAt: string | null
  sslStatus: string
  sslIssuedAt: string | null
  errorMessage: string | null
  createdAt: string
}

interface DomainsClientProps {
  projectId: string
  projectName: string
  initialDomains: CustomDomain[]
}

export default function DomainsClient({ projectId, projectName, initialDomains }: DomainsClientProps) {
  const router = useRouter()
  const [domains, setDomains] = useState<CustomDomain[]>(initialDomains)
  const [newDomain, setNewDomain] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<CustomDomain | null>(null)
  const [showDNSModal, setShowDNSModal] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a domain')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.toLowerCase().trim() })
      })

      const data = await res.json()

      if (res.ok) {
        setDomains([data.domain, ...domains])
        setNewDomain('')
        setShowAddModal(false)
        setSelectedDomain(data.domain)
        setShowDNSModal(true)
      } else {
        setError(data.error || 'Failed to add domain')
      }
    } catch (err) {
      setError('Failed to add domain')
    } finally {
      setIsAdding(false)
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    setVerifying(domainId)
    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${domainId}`, {
        method: 'POST'
      })

      const data = await res.json()

      if (res.ok) {
        setDomains(domains.map(d => 
          d.id === domainId ? data.domain : d
        ))
        
        if (data.domain.status === 'active') {
          alert('✅ Domain verified successfully!')
        } else {
          alert('⏳ Domain not yet verified. Please check your DNS settings and try again in a few minutes.')
        }
      } else {
        alert(data.error || 'Failed to verify domain')
      }
    } catch (err) {
      alert('Failed to verify domain')
    } finally {
      setVerifying(null)
    }
  }

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Remove ${domainName}?\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${domainId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDomains(domains.filter(d => d.id !== domainId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete domain')
      }
    } catch (err) {
      alert('Failed to delete domain')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Domains</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{projectName}</p>
            </div>
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition text-sm"
            >
              ← Back to Project
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                Connect Your Domain
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Add a custom domain to serve your site on your own domain. SSL certificates are automatically provisioned by Vercel.
              </p>
            </div>
          </div>
        </div>

        {/* Add Domain Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
          >
            + Add Custom Domain
          </button>
        </div>

        {/* Domains List */}
        {domains.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🌐</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No custom domains yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add a custom domain to serve your site on your own domain
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
              >
                Add Your First Domain
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {domain.domain}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(domain.status)}`}>
                        {domain.status}
                      </span>
                      {domain.sslStatus === 'active' && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                          🔒 SSL
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {domain.status === 'active' 
                        ? `Active since ${new Date(domain.verifiedAt!).toLocaleDateString()}`
                        : 'Awaiting DNS configuration'
                      }
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {domain.status !== 'active' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedDomain(domain)
                            setShowDNSModal(true)
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                        >
                          View DNS Setup
                        </button>
                        <button
                          onClick={() => handleVerifyDomain(domain.id)}
                          disabled={verifying === domain.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition text-sm font-medium"
                        >
                          {verifying === domain.id ? 'Checking...' : 'Verify'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {domain.errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {domain.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Add Custom Domain</h2>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com or subdomain.example.com"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Enter your domain without http:// or https://
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> You'll need to configure DNS records after adding your domain.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewDomain('')
                  setError(null)
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDomain}
                disabled={isAdding}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
              >
                {isAdding ? 'Adding...' : 'Add Domain'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DNS Configuration Modal */}
      {showDNSModal && selectedDomain && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">DNS Configuration</h2>
              <p className="text-gray-300 text-sm mt-1">{selectedDomain.domain}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    📋 Setup Instructions
                  </h3>
                  <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
                    <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                    <li>Find DNS settings or DNS management</li>
                    <li>Add the DNS records shown below</li>
                    <li>Wait 5-10 minutes for DNS propagation</li>
                    <li>Click "Verify" to check the configuration</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Add these DNS records:
                  </h3>

                  {/* A Record */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">A Record</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('76.76.21.21')
                          alert('IP copied to clipboard!')
                        }}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700"
                      >
                        Copy IP
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Type</span>
                        <p className="font-mono text-gray-900 dark:text-white">A</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Name</span>
                        <p className="font-mono text-gray-900 dark:text-white">@</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Value</span>
                        <p className="font-mono text-gray-900 dark:text-white">76.76.21.21</p>
                      </div>
                    </div>
                  </div>

                  {/* CNAME Record (for subdomains) */}
                  {selectedDomain.domain.includes('.') && selectedDomain.domain.split('.').length > 2 && (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">CNAME Record</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('cname.vercel-dns.com')
                            alert('Value copied to clipboard!')
                          }}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700"
                        >
                          Copy Value
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Type</span>
                          <p className="font-mono text-gray-900 dark:text-white">CNAME</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Name</span>
                          <p className="font-mono text-gray-900 dark:text-white">{selectedDomain.domain.split('.')[0]}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Value</span>
                          <p className="font-mono text-gray-900 dark:text-white">cname.vercel-dns.com</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    ⏱️ DNS Propagation
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    DNS changes can take anywhere from 5 minutes to 48 hours to propagate globally. Most changes are live within 10-30 minutes.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDNSModal(false)
                  setSelectedDomain(null)
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDNSModal(false)
                  if (selectedDomain) {
                    handleVerifyDomain(selectedDomain.id)
                  }
                }}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              >
                Verify Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}