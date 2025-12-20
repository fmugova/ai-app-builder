import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import PreviewClient from './PreviewClient'

export const dynamic = 'force-dynamic'

function PreviewLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-400">Loading preview...</p>
      </div>
    </div>
  )
}

export default function PreviewPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<PreviewLoading />}>
      <PreviewClient projectId={params.id} />
    </Suspense>
  )
}