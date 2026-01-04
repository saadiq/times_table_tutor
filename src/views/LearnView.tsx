import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useProgressStore } from '../stores'
import { FactCard, VisualExplainer } from '../components/learn'
import type { FactProgress, Confidence } from '../types'
import { TIMES_TABLES } from '../lib/constants'

const confidenceLabels: Record<Confidence, string> = {
  new: 'New',
  learning: 'Learning',
  confident: 'Confident',
  mastered: 'Mastered',
}

export function LearnView() {
  const { facts, getFactsByConfidence } = useProgressStore()
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedFact, setSelectedFact] = useState<FactProgress | null>(null)

  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  const getTableFacts = (table: number) =>
    Object.values(facts).filter(f => f.a === table)

  const getTableMastery = (table: number) => {
    const tableFacts = getTableFacts(table)
    const mastered = tableFacts.filter(f => f.confidence === 'mastered').length
    return Math.round((mastered / tableFacts.length) * 100)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Table selector */}
      <div className="p-4 bg-white border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Choose a Times Table
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tables.map(table => {
            const mastery = getTableMastery(table)
            const isSelected = selectedTable === table
            return (
              <button
                key={table}
                onClick={() => setSelectedTable(isSelected ? null : table)}
                className={`flex-shrink-0 w-12 h-12 rounded-xl font-bold transition-colors ${
                  isSelected
                    ? 'bg-garden-500 text-white'
                    : mastery === 100
                    ? 'bg-warm-100 text-warm-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {table}
              </button>
            )
          })}
        </div>
      </div>

      {/* Facts grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedTable ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedTable} Times Table
              </h3>
              <span className="text-sm text-gray-500">
                {getTableMastery(selectedTable)}% mastered
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {getTableFacts(selectedTable).map(fact => (
                <FactCard
                  key={fact.fact}
                  fact={fact}
                  onClick={() => setSelectedFact(fact)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {(['learning', 'new', 'confident', 'mastered'] as Confidence[]).map(confidence => {
              const confidenceFacts = getFactsByConfidence(confidence)
              if (confidenceFacts.length === 0) return null

              return (
                <div key={confidence}>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {confidenceLabels[confidence]} ({confidenceFacts.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {confidenceFacts.slice(0, 8).map(fact => (
                      <FactCard
                        key={fact.fact}
                        fact={fact}
                        onClick={() => setSelectedFact(fact)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Visual explainer modal */}
      <AnimatePresence>
        {selectedFact && (
          <VisualExplainer
            fact={selectedFact}
            onClose={() => setSelectedFact(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
