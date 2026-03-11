'use client'

import { Sparkles, CheckCircle, Loader2, XCircle, Clock, ChevronRight, Zap, SkipForward } from 'lucide-react'
import type { DecompositionPhase, DecompositionResult } from '@/lib/generation/prompt-decomposition'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PhaseStatus = 'pending' | 'generating' | 'done' | 'error'

const SCAFFOLD_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  dashboard:  { label: 'Dashboard App',    emoji: '📊', color: 'bg-indigo-100 text-indigo-700' },
  ecommerce:  { label: 'E-commerce Store', emoji: '🛒', color: 'bg-green-100 text-green-700' },
  blog:       { label: 'Blog / CMS',       emoji: '✍️', color: 'bg-yellow-100 text-yellow-700' },
  social:     { label: 'Social Network',   emoji: '💬', color: 'bg-pink-100 text-pink-700' },
  portfolio:  { label: 'Portfolio',        emoji: '🎨', color: 'bg-purple-100 text-purple-700' },
  landing:    { label: 'Landing Page',     emoji: '🚀', color: 'bg-blue-100 text-blue-700' },
  marketing:  { label: 'Marketing Site',   emoji: '📣', color: 'bg-orange-100 text-orange-700' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GenerationWizardProps {
  decomposition: DecompositionResult
  scaffoldType: string
  phaseStatuses: Map<number, PhaseStatus>
  /** Index (0-based) of the next pending phase — controls which "Generate" button is active */
  currentPhaseIndex: number
  /** Called when user clicks "Generate Phase N" */
  onGeneratePhase: (phase: DecompositionPhase) => void
  /** Called when user clicks "Generate All Phases" */
  onGenerateAll: () => void
  /** Called when user clicks "Generate Without Phases" */
  onDismiss: () => void
  /** Disable all action buttons while a phase is running */
  isRunning?: boolean
  /** Set once all phases are done */
  savedProjectId?: string | null
  /** Error message if save failed */
  saveError?: string | null
  /** Called when user clicks "Retry Save" after a save failure */
  onRetrySave?: () => void
  /** Called when user clicks "Open in Builder" after all phases complete */
  onOpenInBuilder?: () => void
}

// ── Phase status icon ─────────────────────────────────────────────────────────

function PhaseIcon({ status }: { status: PhaseStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
    case 'generating':
      return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500 shrink-0" />
    default:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
      )
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GenerationWizard({
  decomposition,
  scaffoldType,
  phaseStatuses,
  currentPhaseIndex,
  onGeneratePhase,
  onGenerateAll,
  onDismiss,
  isRunning = false,
  savedProjectId,
  saveError,
  onRetrySave,
  onOpenInBuilder,
}: GenerationWizardProps) {
  const scaffold = SCAFFOLD_LABELS[scaffoldType] ?? SCAFFOLD_LABELS.marketing
  const allDone = decomposition.phases.every(
    (_, i) => phaseStatuses.get(i) === 'done'
  )
  const hasError = decomposition.phases.some(
    (_, i) => phaseStatuses.get(i) === 'error'
  )
  const nextPhase = decomposition.phases[currentPhaseIndex]
  const donePhasesCount = decomposition.phases.filter(
    (_, i) => phaseStatuses.get(i) === 'done'
  ).length

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-6 h-6" />
          <h2 className="text-lg font-bold">Complex Project Detected</h2>
        </div>
        <p className="text-sm text-indigo-100 leading-relaxed">
          This project has {decomposition.totalPhases} phases. Generate each phase
          individually for higher quality, or generate all at once.
        </p>

        {/* Scaffold badge + estimate */}
        <div className="flex items-center gap-3 mt-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${scaffold.color} bg-opacity-90`}
          >
            <span>{scaffold.emoji}</span>
            {scaffold.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-indigo-200">
            <Clock className="w-3.5 h-3.5" />
            ~{decomposition.estimatedTime}
          </span>
        </div>
      </div>

      {/* Phase list */}
      <div className="px-6 py-4 space-y-3 max-h-72 overflow-y-auto">
        {decomposition.phases.map((phase, i) => {
          const status: PhaseStatus = phaseStatuses.get(i) ?? 'pending'
          const isNext = i === currentPhaseIndex && !allDone

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                status === 'generating'
                  ? 'bg-indigo-50 border border-indigo-200'
                  : status === 'done'
                  ? 'bg-green-50 border border-green-100'
                  : status === 'error'
                  ? 'bg-red-50 border border-red-100'
                  : isNext
                  ? 'bg-gray-50 border border-gray-200'
                  : 'bg-white border border-gray-100'
              }`}
            >
              <PhaseIcon status={status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Phase {phase.phaseNumber}
                  </span>
                  {status === 'generating' && (
                    <span className="text-xs text-indigo-600 font-medium">Generating…</span>
                  )}
                  {status === 'done' && (
                    <span className="text-xs text-green-600 font-medium">Done</span>
                  )}
                  {status === 'error' && (
                    <span className="text-xs text-red-600 font-medium">Failed</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{phase.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{phase.description}</p>
                {phase.files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {phase.files.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono"
                      >
                        {f.split('/').pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress bar when running */}
      {isRunning && (
        <div className="px-6">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${(donePhasesCount / decomposition.totalPhases) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 mb-2 text-center">
            {donePhasesCount}/{decomposition.totalPhases} phases complete
          </p>
        </div>
      )}

      {/* All done state */}
      {allDone && savedProjectId && (
        <div className="px-6 pb-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-800">All phases complete!</p>
            <div className="flex flex-col gap-2 mt-3">
              {onOpenInBuilder && (
                <button
                  onClick={onOpenInBuilder}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Open in Builder
                </button>
              )}
              <a
                href={`/projects/${savedProjectId}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                View Project Page →
              </a>
            </div>
          </div>
        </div>
      )}

      {allDone && !savedProjectId && saveError && (
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800 mb-1">Save failed</p>
            <p className="text-xs text-red-600 mb-3">{saveError}</p>
            {onRetrySave && (
              <button
                onClick={onRetrySave}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Retry Save
              </button>
            )}
          </div>
        </div>
      )}

      {allDone && !savedProjectId && !saveError && (
        <div className="px-6 pb-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-green-500 shrink-0 animate-spin" />
            <p className="text-sm font-medium text-green-800">All phases complete! Saving your project…</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!allDone && (
        <div className="px-6 pb-5 pt-2 space-y-2.5 border-t border-gray-100">
          {/* Generate next phase */}
          {nextPhase && (
            <button
              onClick={() => onGeneratePhase(nextPhase)}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Phase {nextPhase.phaseNumber}…
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Generate Phase {nextPhase.phaseNumber}: {nextPhase.title}
                </>
              )}
            </button>
          )}

          {/* Generate all */}
          <button
            onClick={onGenerateAll}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors text-sm"
          >
            <Zap className="w-4 h-4" />
            Generate All {decomposition.totalPhases} Phases Automatically
          </button>

          {/* Error retry hint */}
          {hasError && (
            <p className="text-xs text-red-500 text-center">
              One or more phases failed. Click the phase button above to retry.
            </p>
          )}

          {/* Escape hatch */}
          <div className="text-center">
            <button
              onClick={onDismiss}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
            >
              <SkipForward className="w-3 h-3" />
              Generate without phases (single shot)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
