'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CheckoutContent() {
  const searchParams = useSearchParams()
  // ... your checkout logic
  
  return (
    <div>
      {/* Your checkout UI */}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
