'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Globe, 
  Plus, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  Loader2,
  Trash2,
  ArrowLeft,
  Shield,
  Clock
} from 'lucide-react'
import DNSSetupModal from '@/components/DNSSetupModal'

interface CustomDomain {
  id: string
  domain: string
  status: 'pending' | 'active' | 'failed'
  verificationKey: string | null
  verifiedAt: Date | null
  sslStatus: 'pending' | 'active' | 'failed'
  sslIssuedAt: Date | null
  createdAt: Date
}

interface CustomDomainsClientProps {
  projectId: string
  projectName: string
  initialDomains: CustomDomain[]
}

export default function CustomDomainsClient({
  projectId,
  projectName,
  initialDomains
}: CustomDomainsClientProps) {
  const router = useRouter()
  const [domains, setDomains] = useState<CustomDomain[]>(initialDomains)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [dnsModalDomain, setDnsModalDomain] = useState<CustomDomain | null>(null)
  const [verifyingDomains, setVerifyingDomains] = useState<Set<string>>(new Set())
  const [removingDomains, setRemovingDomains] = useState<Set<string>>(new Set())

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      alert('Please enter a domain')
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      // Add to list
      setDomains([...domains, data.domain])
      setIsAddModalOpen(false)
      setNewDomain('')
      
      // Show DNS setup modal
      setDnsModalDomain(data.domain)

      alert('✅ Domain added! Please configure DNS settings.')

    } catch (error: any) {
      alert(`Failed to add domain: ${error.message}`)
    } finally {
      setIsAdding(false)
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomains(prev => new Set(prev).add(domainId))
    try {
      const response = await fetch(
        `/api/projects/${projectId}/domains/${domainId}/verify`,
        { method: 'POST' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      if (data.verified) {
        // Update domain in list
        setDomains(domains.map(d => 
          d.id === domainId ? data.domain : d
        ))
        alert('✅ Domain verified successfully!')
        router.refresh()
      } else {
        alert(`❌ ${data.message}\n\nPlease check your DNS settings and try again.`)
      }

    } catch (error: any) {
      alert(`Verification failed: ${error.message}`)
    } finally {
      setVerifyingDomains(prev => {
        const next = new Set(prev)
        next.delete(domainId)
        return next
      })
    }
  }

  const handleRemoveDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Remove ${domainName}? This cannot be undone.`)) {
      return
    }

    setRemovingDomains(prev => new Set(prev).add(domainId))
    try {
      const response = await fetch(
        `/api/projects/${projectId}/domains/${domainId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove domain')
      }

      // Remove from list
      setDomains(domains.filter(d => d.id !== domainId))
      alert('✅ Domain removed successfully')

    } catch (error: any) {
      alert(`Failed to remove domain: ${error.message}`)
    } finally {
      setRemovingDomains(prev => {
        const next = new Set(prev)
        next.delete(domainId)
        return next
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      active: 'bg-green-100 text-green-700 border-green-300',
      failed: 'bg-red-100 text-red-700 border-red-300'
    }

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      active: <Check className="w-3 h-3" />,
      failed: <AlertCircle className="w-3 h-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {icons[status as keyof typeof icons] || icons.pending}
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Project
              </button>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Globe className="w-8 h-8 text-purple-600" />
                Custom Domains
              </h1>
              <p className="text-gray-500 mt-1">{projectName}</p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add Custom Domain
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Connect Your Domain
              </h3>
              <p className="text-sm text-blue-800">
                Add a custom domain to serve your site on your own domain. 
                SSL certificates are automatically provisioned by Vercel.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Domains List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {domains.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No custom domains yet
            </h3>
            <p className="text-gray-500 mb-6">
              Add your first custom domain to get started
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Custom Domain
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {domain.domain}
                      </h3>
                      {getStatusBadge(domain.status)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        SSL: {getStatusBadge(domain.sslStatus)}
                      </div>
                      {domain.verifiedAt && (
                        <div className="flex items-center gap-1">
                          <Check className="w-4 h-4 text-green-600" />
                          Verified {new Date(domain.verifiedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {domain.status === 'pending' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Action required:</strong> Configure your DNS settings and verify your domain.
                        </p>
                      </div>
                    )}

                    {domain.status === 'active' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          <strong>Live!</strong> Your domain is active and serving your site.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setDnsModalDomain(domain)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View DNS Setup
                  </button>

                  <button
                    onClick={() => handleVerifyDomain(domain.id)}
                    disabled={verifyingDomains.has(domain.id) || domain.status === 'active'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingDomains.has(domain.id) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Verify
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleRemoveDomain(domain.id, domain.domain)}
                    disabled={removingDomains.has(domain.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingDomains.has(domain.id) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white">
                Add Custom Domain
              </h2>
            </div>

            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Domain Name
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com or www.example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  After adding, you&apos;ll need to configure DNS settings at your domain provider.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setNewDomain('')
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDomain}
                  disabled={isAdding || !newDomain.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Domain'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DNS Setup Modal */}
      {dnsModalDomain && (
        <DNSSetupModal
          isOpen={!!dnsModalDomain}
          onClose={() => setDnsModalDomain(null)}
          domain={dnsModalDomain.domain}
          verificationKey={dnsModalDomain.verificationKey || ''}
        />
      )}
    </div>
  )
}
