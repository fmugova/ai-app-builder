'use client'

import { useState, useEffect } from 'react'
import { Shield, Copy, Check, Download, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function TwoFactorAuthPage() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetch2FAStatus()
  }, [])

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/status')
      const data = await response.json()
      
      if (response.ok) {
        setIsEnabled(data.twoFactorEnabled || false)
      }
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleSetup2FA = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed')
      }

      setQrCode(data.qrCode)
      setSecret(data.secret)
      setBackupCodes(data.backupCodes)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      setSuccess('2FA enabled successfully!')
      setIsEnabled(true)
      setToken('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) return

    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable')
      }

      setSuccess('2FA disabled successfully')
      setIsEnabled(false)
      setQrCode('')
      setSecret('')
      setBackupCodes([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disable')
    } finally {
      setIsLoading(false)
    }
  }

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const downloadBackupCodes = () => {
    const content = `BuildFlow AI - Backup Codes
Generated: ${new Date().toLocaleString()}

${backupCodes.join('\n')}

⚠️ Store these codes securely!
Each code can only be used once.`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'buildflow-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isCheckingStatus) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Two-Factor Authentication
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
            {success}
          </div>
        )}

        {!qrCode && !isEnabled && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-6">
              Add an extra layer of security to your account with 2FA
            </p>
            <button
              onClick={handleSetup2FA}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Setting up...' : 'Setup 2FA'}
            </button>
          </div>
        )}

        {qrCode && !isEnabled && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>
              <p className="text-gray-600 mb-4">
                Scan this QR code with Google Authenticator or Authy
              </p>
              <div className="inline-block p-4 bg-white border rounded-lg">
                <Image 
                  src={qrCode} 
                  alt="2FA QR Code" 
                  width={256}
                  height={256}
                />
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
                <code className="text-lg font-mono">{secret}</code>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold mb-4">Backup Codes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Save these codes securely. Each can be used once if you lose access to your authenticator.
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map(code => (
                  <div key={code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <code className="font-mono">{code}</code>
                    <button
                      onClick={() => copyCode(code)}
                      className="ml-2 text-gray-600 hover:text-gray-900"
                    >
                      {copiedCode === code ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={downloadBackupCodes}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Download Backup Codes
              </button>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold mb-4">Verify Setup</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code from your authenticator app:
              </p>
              
              <div className="flex gap-4">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="flex-1 px-4 py-3 border rounded-lg text-center text-2xl font-mono tracking-widest"
                />
                <button
                  onClick={handleVerify2FA}
                  disabled={token.length !== 6 || isLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Verify & Enable
                </button>
              </div>
            </div>
          </div>
        )}

        {isEnabled && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">2FA is Enabled</h2>
            <p className="text-gray-600 mb-6">
              Your account is protected with two-factor authentication
            </p>
            
            <div className="space-y-4">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter code to disable"
                maxLength={6}
                className="px-4 py-3 border rounded-lg text-center text-2xl font-mono tracking-widest"
              />
              <button
                onClick={handleDisable2FA}
                disabled={token.length !== 6 || isLoading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
