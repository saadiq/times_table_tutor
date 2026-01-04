import { motion } from 'framer-motion'
import { useProgressStore } from '../../stores/progressStore'
import type { Confidence, FactProgress } from '../../types'
import { TIMES_TABLES } from '../../lib/constants'

type MasteryGridProps = {
  onFactSelect: (fact: FactProgress) => void
}

const confidenceColors: Record<Confidence, string> = {
  new: 'bg-gray-200',
  learning: 'bg-warm-300',
  confident: 'bg-garden-300',
  mastered: 'bg-garden-600',
}

const confidenceLabels: Record<Confidence, string> = {
  new: 'New',
  learning: 'Learning',
  confident: 'Confident',
  mastered: 'Mastered',
}

export function MasteryGrid({ onFactSelect }: MasteryGridProps) {
  const facts = useProgressStore(state => state.facts)

  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  // Calculate summary stats
  const allFacts = Object.values(facts)
  const counts: Record<Confidence, number> = {
    new: 0,
    learning: 0,
    confident: 0,
    mastered: 0,
  }
  for (const fact of allFacts) {
    counts[fact.confidence]++
  }
  const total = allFacts.length
  const masteryPercent = total > 0 ? Math.round((counts.mastered / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="text-center">
        <div className="text-2xl font-bold text-garden-600">{masteryPercent}% Mastered</div>
        <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600">
          <span>{counts.mastered} mastered</span>
          <span>{counts.confident} confident</span>
          <span>{counts.learning} learning</span>
          <span>{counts.new} new</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Column labels */}
          <div className="flex">
            <div className="w-8 h-8" /> {/* Empty corner cell */}
            {tables.map(col => (
              <div
                key={`col-${col}`}
                className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500"
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {tables.map(row => (
            <div key={`row-${row}`} className="flex">
              {/* Row label */}
              <div className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                {row}
              </div>
              {/* Fact cells */}
              {tables.map(col => {
                const factKey = `${row}x${col}`
                const fact = facts[factKey]
                if (!fact) return null

                return (
                  <motion.button
                    key={factKey}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFactSelect(fact)}
                    aria-label={`${row} times ${col} equals ${fact.answer}, ${confidenceLabels[fact.confidence]}`}
                    className={`w-8 h-8 m-0.5 rounded-md ${confidenceColors[fact.confidence]}
                      hover:ring-2 hover:ring-garden-500 hover:ring-offset-1
                      focus:outline-none focus:ring-2 focus:ring-garden-500 focus:ring-offset-1
                      transition-all`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 pt-2">
        {(['new', 'learning', 'confident', 'mastered'] as Confidence[]).map(level => (
          <div key={level} className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded ${confidenceColors[level]}`} />
            <span className="text-xs text-gray-600">{confidenceLabels[level]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
