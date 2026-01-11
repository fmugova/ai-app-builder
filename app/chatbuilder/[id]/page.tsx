'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatBuilderIdPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to chatbuilder with project query parameter
    router.replace(`/chatbuilder?project=${params.id}`)
  }, [params.id, router])
  
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading Chat Builder...</p>
      </div>
    </div>
  )
}
