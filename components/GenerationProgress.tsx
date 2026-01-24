'use client'

import { useMemo } from 'react'

export interface GenerationEstimate {
  min: number
  max: number
  complexity: 'simple' | 'medium' | 'complex'
  features: string[]
}

export interface GenerationProgressProps {
  status: 'idle' | 'initializing' | 'generating' | 'validating' | 'saving' | 'complete' | 'error'
  progress: number
  estimate?: GenerationEstimate
  elapsed: number
  error?: string
}

export function GenerationProgress({
  status,
  progress,
  estimate,
  elapsed,
  error
}: GenerationProgressProps) {
  // Calculate estimated remaining time using useMemo instead of useEffect + useState
  const estimatedRemaining = useMemo(() => {
    if (estimate && progress > 0 && progress < 100) {
      const progressRatio = progress / 100
      const estimatedTotal = elapsed / progressRatio
      const remaining = Math.max(0, estimatedTotal - elapsed)
      return Math.round(remaining)
    }
    return null
  }, [estimate, elapsed, progress])

  // Don't show anything if idle
  if (status === 'idle') {
    return null
  }

  // Show error state
  if (status === 'error' && error) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border-2 border-red-500 p-6 max-w-md z-50">
        <div className="flex items-start gap-3">
          <div className="text-3xl">❌</div>
          <div className="flex-1">
            <h3 className="font-bold text-red-600 mb-2">Generation Failed</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Show success state briefly
  if (status === 'complete') {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border-2 border-green-500 p-6 max-w-md z-50">
        <div className="flex items-center gap-3">
          <div className="text-3xl">✅</div>
          <div className="flex-1">
            <h3 className="font-bold text-green-600">Generation Complete!</h3>
            <p className="text-sm text-gray-600 mt-1">Your project is ready</p>
          </div>
        </div>
      </div>
    )
  }

  // Show progress state
  const statusText = {
    initializing: 'Initializing...',
    generating: 'Generating your project...',
    validating: 'Validating code...',
    saving: 'Saving to database...',
    complete: 'Complete!',
    error: 'Error',
    idle: ''
  }[status]

  const statusEmoji = {
    initializing: '🚀',
    generating: '⚡',
    validating: '🔍',
    saving: '💾',
    complete: '✅',
    error: '❌',
    idle: ''
  }[status]

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-md z-50">
      <div className="flex items-start gap-3 mb-4">
        <div className="text-3xl">{statusEmoji}</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{statusText}</h3>
          {estimate && (
            <p className="text-sm text-gray-600 mt-1">
              {estimate.complexity} • {estimate.features.slice(0, 2).join(', ')}
              {estimate.features.length > 2 && ` +${estimate.features.length - 2} more`}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{progress}%</span>
          {estimatedRemaining !== null && (
            <span>~{estimatedRemaining}s remaining</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time Info */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>Elapsed: {elapsed}s</span>
        {estimate && (
          <span>Est: {estimate.min}-{estimate.max}s</span>
        )}
      </div>
    </div>
  )
}