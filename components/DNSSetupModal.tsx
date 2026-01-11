'use client'

import { X, Copy, Check, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface DNSSetupModalProps {
  isOpen: boolean
  onClose: () => void
  domain: string
  verificationKey: string
}

export default function DNSSetupModal({
  isOpen,
  onClose,
  domain,
  verificationKey
}: DNSSetupModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!isOpen) return null

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const dnsRecords = [
    {
      type: 'CNAME',
      name: domain.startsWith('www.') ? 'www' : '@',
      value: 'cname.vercel-dns.com',
      ttl: '3600',
      description: 'Points your domain to Vercel servers'
    },
    {
      type: 'TXT',
      name: `_buildflow-verify`,
      value: verificationKey,
      ttl: '3600',
      description: 'Verifies domain ownership (optional but recommended)'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              DNS Setup Instructions
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Configure your domain: {domain}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Step 1: Overview */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Go to Your Domain Provider
                </h3>
                <p className="text-gray-600 mb-3">
                  Log in to where you purchased your domain (e.g., GoDaddy, Namecheap, Cloudflare, Google Domains)
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>Popular providers:</strong> GoDaddy, Namecheap, Cloudflare, Google Domains, 
                      Domain.com, Hover, Porkbun
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Find DNS Settings */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Navigate to DNS Settings
                </h3>
                <p className="text-gray-600 mb-3">
                  Look for one of these sections:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    DNS Management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    DNS Settings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Domain Settings → DNS Records
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Advanced DNS
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3: Add DNS Records */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Add These DNS Records
                </h3>
                <p className="text-gray-600 mb-4">
                  Copy the values below and add them as new DNS records
                </p>

                <div className="space-y-4">
                  {dnsRecords.map((record, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded">
                            {record.type}
                          </span>
                          <span className="text-sm text-gray-600">
                            {record.description}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Type */}
                        <div className="grid grid-cols-4 gap-3 items-center">
                          <label className="text-sm font-medium text-gray-700">
                            Type:
                          </label>
                          <div className="col-span-3 flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono">
                              {record.type}
                            </code>
                          </div>
                        </div>

                        {/* Name */}
                        <div className="grid grid-cols-4 gap-3 items-center">
                          <label className="text-sm font-medium text-gray-700">
                            Name:
                          </label>
                          <div className="col-span-3 flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono">
                              {record.name}
                            </code>
                            <button
                              onClick={() => copyToClipboard(record.name, `name-${index}`)}
                              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              {copiedField === `name-${index}` ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Value */}
                        <div className="grid grid-cols-4 gap-3 items-center">
                          <label className="text-sm font-medium text-gray-700">
                            Value:
                          </label>
                          <div className="col-span-3 flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono break-all">
                              {record.value}
                            </code>
                            <button
                              onClick={() => copyToClipboard(record.value, `value-${index}`)}
                              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              {copiedField === `value-${index}` ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* TTL */}
                        <div className="grid grid-cols-4 gap-3 items-center">
                          <label className="text-sm font-medium text-gray-700">
                            TTL:
                          </label>
                          <div className="col-span-3 flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono">
                              {record.ttl} (or Automatic)
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Wait & Verify */}
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Save & Wait for DNS Propagation
                </h3>
                <p className="text-gray-600 mb-3">
                  After adding the records, it may take 5-60 minutes for DNS changes to propagate globally.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <strong>Important:</strong> DNS propagation typically takes 5-60 minutes, but can 
                      take up to 48 hours in rare cases. Come back and click &quot;Verify&quot; once configured.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              Troubleshooting
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• If you have an existing CNAME or A record for this domain, remove it first</li>
              <li>• Make sure there are no typos in the DNS values</li>
              <li>• Some providers use &quot;@&quot; instead of leaving the name field blank for root domains</li>
              <li>• For www subdomains, use &quot;www&quot; as the name</li>
              <li>• Check your DNS with tools like{' '}
                <a
                  href={`https://dnschecker.org/#CNAME/${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  DNSChecker.org
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  )
}
