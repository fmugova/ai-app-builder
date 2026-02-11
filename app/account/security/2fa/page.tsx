'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Shield, ShieldCheck, ShieldAlert, Key, Download, Copy, Check, Loader2, ArrowLeft, AlertTriangle, Smartphone } from 'lucide-react'
import Link from 'next/link'

type Status = {
  twoFactorEnabled: boolean
  twoFactorRequired: boolean
  backupCodesRemaining: number
}

type SetupData = {
  qrCode: string
  secret: string
  backupCodes: string[]
}

export default function TwoFactorSetup() {
  const [status, setStatus] = useState<Status | null>(null)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [step, setStep] = useState<'status'|'setup'|'verify'|'done'|'disable'|'regenerate'>('status')
  const [token, setToken] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disableToken, setDisableToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [downloadedBackup, setDownloadedBackup] = useState(false)
  const [regenerateToken, setRegenerateToken] = useState('')
  const [regenerateError, setRegenerateError] = useState('')
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null)

  // Fetch current 2FA status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa/status')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error)
    }
  }

  useEffect(() => {
    // Fetch status on mount and when step changes
    (async () => {
      await fetchStatus()
    })()
  }, [step])

  async function startSetup() {
    setLoading(true)
    setVerifyError('')
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSetupData(data)
        setStep('verify')
      } else {
        setVerifyError(data.error || 'Failed to start setup')
      }
    } catch {
      setVerifyError('Network error. Please try again.')
    }
    setLoading(false)
  }

  async function verify2FA() {
    setLoading(true)
    setVerifyError('')
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const data = await res.json()
      if (res.ok) {
        setStep('done')
      } else {
        setVerifyError(data.error || 'Verification failed')
      }
    } catch {
      setVerifyError('Network error. Please try again.')
    }
    setLoading(false)
  }

  async function disable2FA() {
    setLoading(true)
    setDisableError('')
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableToken })
      })
      const data = await res.json()
      if (res.ok) {
        setStep('status')
        setDisableToken('')
      } else {
        setDisableError(data.error || 'Disable failed')
      }
    } catch {
      setDisableError('Network error. Please try again.')
    }
    setLoading(false)
  }

  async function regenerateBackupCodes() {
    setLoading(true)
    setRegenerateError('')
    try {
      const res = await fetch('/api/auth/2fa/regenerate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: regenerateToken })
      })
      const data = await res.json()
      if (res.ok) {
        setNewBackupCodes(data.backupCodes)
        setRegenerateToken('')
        fetchStatus() // Refresh status
      } else {
        setRegenerateError(data.error || 'Failed to regenerate codes')
      }
    } catch {
      setRegenerateError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const downloadRegeneratedCodes = () => {
    if (!newBackupCodes) return
    const content = `BuildFlow AI - Two-Factor Authentication Backup Codes\nRegenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: Store these codes in a secure location.\nEach code can only be used once.\nYour old backup codes are now invalid.\n\n${newBackupCodes.join('\n')}\n`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `buildflow-backup-codes-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (text: string, type: 'secret' | 'code') => {
    navigator.clipboard.writeText(text)
    if (type === 'secret') {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } else {
      setCopiedCode(text)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }

  const downloadBackupCodes = () => {
    if (!setupData) return
    const content = `BuildFlow AI - Two-Factor Authentication Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: Store these codes in a secure location.\nEach code can only be used once.\n\n${setupData.backupCodes.join('\n')}\n`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `buildflow-backup-codes-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloadedBackup(true)
  }

  if (!status) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (step === 'status') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Link 
          href="/account/security"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Security
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Two-Factor Authentication
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add an extra layer of security to your account
          </p>
        </div>

        {status.twoFactorEnabled ? (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                    2FA is Enabled
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Your account is protected with two-factor authentication
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold">Backup Codes</h3>
                </div>
                <button
                  onClick={() => setStep('regenerate')}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Regenerate Codes
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You have <span className="font-semibold text-gray-900 dark:text-white">{status.backupCodesRemaining}</span> backup codes remaining
              </p>
              {status.backupCodesRemaining < 3 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    You&apos;re running low on backup codes. Consider regenerating them soon.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Disable Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    This will make your account less secure. Only disable 2FA if you no longer have access to your authenticator app.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep('disable')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Protect Your Account
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    Two-factor authentication adds an extra layer of security by requiring both your password and a verification code from your phone to sign in.
                  </p>
                  <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <p className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      Protects against password theft
                    </p>
                    <p className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      Works with popular authenticator apps like Google Authenticator, Authy, or 1Password
                    </p>
                    <p className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      Includes backup codes for emergency access
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Enable Two-Factor Authentication
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (step === 'verify' && setupData) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => setStep('status')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel Setup
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Set Up Authenticator</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Follow these steps to enable two-factor authentication
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Scan QR Code */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
              <h3 className="font-semibold text-lg">Scan QR Code</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Open your authenticator app and scan this QR code:
            </p>
            <div className="flex justify-center bg-white p-6 rounded-lg border border-gray-200">
              <Image
                src={setupData.qrCode}
                alt="2FA QR Code"
                width={200}
                height={200}
                className="w-48 h-48"
                unoptimized
              />
            </div>
          </div>

          {/* Step 2: Manual Entry */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
              <h3 className="font-semibold text-lg">Or Enter Code Manually</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              If you can&apos;t scan the QR code, enter this code in your app:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm">
                {setupData.secret}
              </code>
              <button
                onClick={() => copyToClipboard(setupData.secret, 'secret')}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copiedSecret ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Verify */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
              <h3 className="font-semibold text-lg">Enter Verification Code</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter the 6-digit code from your authenticator app:
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                placeholder="000000"
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={verify2FA}
                disabled={loading || token.length !== 6}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </button>
            </div>
            {verifyError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{verifyError}</p>
              </div>
            )}
          </div>

          {/* Backup Codes */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <Key className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Save Your Backup Codes
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                  Store these codes in a secure location. You can use them to access your account if you lose your authenticator device.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {setupData.backupCodes.map((code: string) => (
                    <div key={code} className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700 rounded text-sm font-mono">
                        {code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(code, 'code')}
                        className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === code ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={downloadBackupCodes}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {downloadedBackup ? (
                    <>
                      <Check className="w-5 h-5" />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download Backup Codes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
            <ShieldCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">2FA Successfully Enabled!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Your account is now protected with two-factor authentication. You&apos;ll need to enter a code from your authenticator app when you sign in.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/account/security"
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Back to Security
            </Link>
            <button
              onClick={() => setStep('status')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View 2FA Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'disable') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => setStep('status')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>

        <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">Disable Two-Factor Authentication</h1>
              <p className="text-gray-600 dark:text-gray-400">
                This will make your account less secure. Are you sure you want to continue?
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Enter your current 2FA code to confirm:
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={disableToken}
                  onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  placeholder="000000"
                  className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={disable2FA}
                  disabled={loading || disableToken.length !== 6}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    'Disable 2FA'
                  )}
                </button>
              </div>
              {disableError && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{disableError}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setStep('status')}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Keep 2FA Enabled
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'regenerate') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => {
            setStep('status')
            setRegenerateToken('')
            setRegenerateError('')
            setNewBackupCodes(null)
          }}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>

        {!newBackupCodes ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <Key className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">Regenerate Backup Codes</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  This will invalidate all your existing backup codes and generate new ones. Make sure to save the new codes.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter your current 2FA code to confirm:
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={regenerateToken}
                    onChange={(e) => setRegenerateToken(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    placeholder="000000"
                    className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <button
                    onClick={regenerateBackupCodes}
                    disabled={loading || regenerateToken.length !== 6}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Regenerate Codes'
                    )}
                  </button>
                </div>
                {regenerateError && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{regenerateError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">New Backup Codes Generated!</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your old backup codes have been invalidated. Save these new codes in a secure location.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {newBackupCodes.map((code: string) => (
                  <div key={code} className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700 rounded text-sm font-mono">
                      {code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(code, 'code')}
                      className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded transition-colors"
                      title="Copy code"
                    >
                      {copiedCode === code ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={downloadRegeneratedCodes}
                className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Backup Codes
              </button>
            </div>

            <button
              onClick={() => {
                setStep('status')
                setNewBackupCodes(null)
              }}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}
