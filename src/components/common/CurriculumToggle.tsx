import { useCurriculumStore } from '../../stores/curriculumStore'
import { switchCurriculum } from '../../lib/switchCurriculum'
import { getOperation } from '../../lib/operations'
import type { CurriculumId } from '../../lib/operations'

const CURRICULA: CurriculumId[] = ['multiply', 'divide']

export function CurriculumToggle() {
  const active = useCurriculumStore((s) => s.active)

  return (
    <div
      role="group"
      aria-label="Choose what to practice"
      className="flex bg-gray-100 rounded-xl p-1"
    >
      {CURRICULA.map((id) => {
        const operation = getOperation(id)
        const isActive = id === active
        return (
          <button
            key={id}
            onClick={() => switchCurriculum(id)}
            aria-pressed={isActive}
            aria-label={operation.copy.label}
            className={`w-14 h-12 rounded-lg text-xl font-bold transition-colors ${
              isActive
                ? 'bg-white text-garden-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {operation.symbol}
          </button>
        )
      })}
    </div>
  )
}
