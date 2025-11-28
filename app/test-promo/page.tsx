'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function TestPromo() {
  const { data: session } = useSession()
  const [code, setCode] = useState('TEST50')
  const [plan, setPlan] = useState('pro')
  const [result, setResult] = useState<any>(null)

  const testPromo = async () => {
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, plan }),
    })
    const data = await res.json()
    setResult({ status: res.status, data })
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Promo Validation</h1>
      
      <div className="mb-4">
        <p>Session: {session ? '✅ Logged in' : '❌ Not logged in'}</p>
        <p>Email: {session?.user?.email || 'N/A'}</p>
      </div>

      <div className="space-y-4 max-w-md">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo code"
          className="w-full p-2 border rounded"
        />
        
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <button
          onClick={testPromo}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Test Promo
        </button>
      </div>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}