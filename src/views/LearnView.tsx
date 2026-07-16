import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useProgressStore } from '../stores'
import { FactCard, VisualExplainer, LadderModal } from '../components/learn'
import type { FactProgress } from '../types'
import { TIMES_TABLES } from '../lib/constants'
import { LADDERS, type Ladder } from '../lib/ladders'
import { useActiveOperation } from '../hooks'

export function LearnView() {
  const { facts } = useProgressStore()
  const operation = useActiveOperation()

  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedFact, setSelectedFact] = useState<FactProgress | null>(null)
  const [selectedLadder, setSelectedLadder] = useState<Ladder | null>(null)

  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  const getTableFacts = (table: number) =>
    Object.values(facts).filter(f => operation.tableOf(f) === table)

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
          {operation.copy.tablePickerTitle}
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
        <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-3">Strategy Ladders</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {LADDERS.map(ladder => (
            <button
              key={ladder.id}
              onClick={() => setSelectedLadder(ladder)}
              className="flex-shrink-0 w-40 text-left bg-sky-50 hover:bg-sky-100 rounded-xl p-3 transition-colors"
            >
              <TrendingUp size={18} className="text-sky-600 mb-1" />
              <div className="font-semibold text-gray-800 text-sm">{ladder.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{ladder.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Facts grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedTable ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {operation.copy.tableLabel(selectedTable)}
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
          <div className="text-center text-gray-500 py-8">
            Pick a number above to see its facts
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
      <AnimatePresence>
        {selectedLadder && (
          <LadderModal ladder={selectedLadder} onClose={() => setSelectedLadder(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
