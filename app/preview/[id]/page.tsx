import { Suspense } from 'react'
import PreviewClient from './PreviewClient'
import { Loader2 } from 'lucide-react'

export default function PreviewPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Preview...</p>
        </div>
      </div>
    }>
      <PreviewClient projectId={params.id} />
    </Suspense>
  )
}