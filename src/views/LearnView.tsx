import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BookOpen, BarChart3 } from 'lucide-react'
import { useProgressStore } from '../stores'
import { useAttemptsStore } from '../stores/attemptsStore'
import { FactCard, VisualExplainer } from '../components/learn'
import {
  MasteryGrid,
  ActivityCalendar,
  FactDetailSheet,
  SyncStatusBadge,
} from '../components/progress'
import type { FactProgress } from '../types'
import { TIMES_TABLES } from '../lib/constants'

export function LearnView() {
  const { facts } = useProgressStore()
  const { getStreakDays } = useAttemptsStore()

  const [activeTab, setActiveTab] = useState<'learn' | 'progress'>('learn')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedFact, setSelectedFact] = useState<FactProgress | null>(null)
  const [detailFact, setDetailFact] = useState<FactProgress | null>(null)

  const streakDays = getStreakDays()

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
      {/* Tab header */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('learn')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'learn'
              ? 'text-garden-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Learn
          {activeTab === 'learn' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-garden-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'progress'
              ? 'text-garden-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Progress
          {streakDays > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-warm-100 text-warm-600 rounded-full">
              {streakDays}
            </span>
          )}
          {activeTab === 'progress' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-garden-500" />
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'learn' ? (
        <LearnTabContent
          tables={tables}
          selectedTable={selectedTable}
          setSelectedTable={setSelectedTable}
          getTableFacts={getTableFacts}
          getTableMastery={getTableMastery}
          setSelectedFact={setSelectedFact}
        />
      ) : (
        <ProgressTabContent onFactSelect={setDetailFact} />
      )}

      {/* Visual explainer modal (Learn tab) */}
      <AnimatePresence>
        {selectedFact && (
          <VisualExplainer
            fact={selectedFact}
            onClose={() => setSelectedFact(null)}
          />
        )}
      </AnimatePresence>

      {/* Fact detail sheet (Progress tab) */}
      <AnimatePresence>
        {detailFact && (
          <FactDetailSheet
            fact={detailFact}
            onClose={() => setDetailFact(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

type LearnTabContentProps = {
  tables: number[]
  selectedTable: number | null
  setSelectedTable: (table: number | null) => void
  getTableFacts: (table: number) => FactProgress[]
  getTableMastery: (table: number) => number
  setSelectedFact: (fact: FactProgress) => void
}

function LearnTabContent({
  tables,
  selectedTable,
  setSelectedTable,
  getTableFacts,
  getTableMastery,
  setSelectedFact,
}: LearnTabContentProps) {
  return (
    <>
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
          <div className="text-center text-gray-500 py-8">
            Select a times table above to see its facts
          </div>
        )}
      </div>
    </>
  )
}

type ProgressTabContentProps = {
  onFactSelect: (fact: FactProgress) => void
}

function ProgressTabContent({ onFactSelect }: ProgressTabContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Sync status in top right */}
      <div className="flex justify-end">
        <SyncStatusBadge />
      </div>

      {/* Mastery grid card */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Mastery Overview
        </h3>
        <MasteryGrid onFactSelect={onFactSelect} />
      </div>

      {/* Activity calendar card */}
      <ActivityCalendar />
    </div>
  )
}
