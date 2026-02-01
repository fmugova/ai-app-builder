
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

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
  const [step, setStep] = useState<'status'|'setup'|'verify'|'done'|'disable'>('status')
  const [token, setToken] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disableToken, setDisableToken] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/2fa/status').then(r => r.json()).then(setStatus)
  }, [step])

  async function startSetup() {
    setLoading(true)
    setVerifyError('')
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
    const data = await res.json()
    setSetupData(data)
    setStep('verify')
    setLoading(false)
  }

  async function verify2FA() {
    setLoading(true)
    setVerifyError('')
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    if (res.ok) {
      setStep('done')
    } else {
      const err = await res.json()
      setVerifyError(err.error || 'Verification failed')
    }
    setLoading(false)
  }

  async function disable2FA() {
    setLoading(true)
    setDisableError('')
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: disableToken })
    })
    if (res.ok) {
      setStep('status')
      setDisableToken('')
    } else {
      const err = await res.json()
      setDisableError(err.error || 'Disable failed')
    }
    setLoading(false)
  }

  if (!status) return <div>Loading...</div>

  if (step === 'status') {
    return (
      <div style={{ maxWidth: 400, margin: 'auto', padding: 32 }}>
        <h1>Two-Factor Authentication</h1>
        {status.twoFactorEnabled ? (
          <>
            <p>2FA is <b>enabled</b> on your account.</p>
            <p>Backup codes remaining: <b>{status.backupCodesRemaining}</b></p>
            <button onClick={() => setStep('disable')}>Disable 2FA</button>
          </>
        ) : (
          <>
            <p>2FA is <b>not enabled</b> on your account.</p>
            <button onClick={startSetup} disabled={loading}>{loading ? 'Loading...' : 'Set Up 2FA'}</button>
          </>
        )}
      </div>
    )
  }

  if (step === 'verify' && setupData) {
    return (
      <div style={{ maxWidth: 400, margin: 'auto', padding: 32 }}>
        <h1>Set Up Two-Factor Authentication</h1>
        <p>Scan this QR code with your authenticator app:</p>
        <Image
          src={setupData.qrCode}
          alt="2FA QR Code"
          width={200}
          height={200}
          style={{ width: 200, height: 200 }}
          unoptimized
        />
        <p>Or enter this code manually: <b>{setupData.secret}</b></p>
        <p>Enter the 6-digit code from your app:</p>
        <input value={token} onChange={e => setToken(e.target.value)} maxLength={6} style={{ fontSize: 24, letterSpacing: 8, width: 120 }} />
        <button onClick={verify2FA} disabled={loading || token.length !== 6} style={{ marginLeft: 8 }}>{loading ? 'Verifying...' : 'Verify & Enable'}</button>
        {verifyError && <p style={{ color: 'red' }}>{verifyError}</p>}
        <h3>Backup Codes</h3>
        <ul>
          {setupData.backupCodes.map((code: string) => <li key={code}><code>{code}</code></li>)}
        </ul>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div style={{ maxWidth: 400, margin: 'auto', padding: 32 }}>
        <h1>2FA Enabled!</h1>
        <p>Two-factor authentication is now active on your account.</p>
        <button onClick={() => setStep('status')}>Back to Security</button>
      </div>
    )
  }

  if (step === 'disable') {
    return (
      <div style={{ maxWidth: 400, margin: 'auto', padding: 32 }}>
        <h1>Disable Two-Factor Authentication</h1>
        <p>Enter a valid 2FA code to disable:</p>
        <input value={disableToken} onChange={e => setDisableToken(e.target.value)} maxLength={6} style={{ fontSize: 24, letterSpacing: 8, width: 120 }} />
        <button onClick={disable2FA} disabled={loading || disableToken.length !== 6} style={{ marginLeft: 8 }}>{loading ? 'Disabling...' : 'Disable 2FA'}</button>
        {disableError && <p style={{ color: 'red' }}>{disableError}</p>}
        <button onClick={() => setStep('status')} style={{ marginTop: 16 }}>Cancel</button>
      </div>
    )
  }

  return null
}
