import { CheckCircle2, Circle } from 'lucide-react'
import { getMasteryProgress } from '../../lib/factConfidence'
import { CONFIDENCE_THRESHOLDS } from '../../lib/constants'
import { formatResponseTime } from '../../lib/formatTime'
import type { FactProgress } from '../../types'

type MasteryPathCardProps = {
  fact: FactProgress
}

function CriterionRow({ met, label, value }: { met: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {met ? (
        <CheckCircle2 className="w-4 h-4 text-garden-600 shrink-0" aria-hidden="true" />
      ) : (
        <Circle className="w-4 h-4 text-gray-300 shrink-0" aria-hidden="true" />
      )}
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  )
}

/**
 * Shows where a fact stands against the real advancement criteria, from the
 * same math the engine uses — so what the card promises is what the app does.
 */
export function MasteryPathCard({ fact }: MasteryPathCardProps) {
  const progress = getMasteryProgress(fact)

  if (progress.nextLevel === null) {
    return (
      <div className="bg-garden-100 rounded-xl p-4 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-garden-600 shrink-0" aria-hidden="true" />
        <p className="text-sm text-garden-800">Mastered — quick reviews keep it fresh.</p>
      </div>
    )
  }

  const levelLabel = progress.nextLevel === 'mastered' ? 'Mastered' : 'Confident'
  const targetSeconds = progress.targetTimeMs / 1000
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Path to {levelLabel}
      </h3>
      <p className="text-xs text-gray-400 mb-2">
        Counting typed answers with no hints, from the last{' '}
        {CONFIDENCE_THRESHOLDS.recentAttemptsWindow} tries
      </p>
      <CriterionRow
        met={progress.unaidedCorrect >= progress.neededCorrect}
        label="Typed correct, no hints"
        value={`${progress.unaidedCorrect} of ${progress.neededCorrect}`}
      />
      <CriterionRow
        met={progress.typicalTimeMs !== null && progress.typicalTimeMs < progress.targetTimeMs}
        label={`Typical speed (under ${targetSeconds}s)`}
        value={
          progress.typicalTimeMs !== null
            ? formatResponseTime(progress.typicalTimeMs)
            : 'No typed answers yet'
        }
      />
      <CriterionRow
        met={progress.accuracy !== null && progress.accuracy >= progress.targetAccuracy}
        label={`Typing accuracy (${Math.round(progress.targetAccuracy * 100)}%+)`}
        value={progress.accuracy !== null ? `${Math.round(progress.accuracy * 100)}%` : '--'}
      />
    </div>
  )
}
