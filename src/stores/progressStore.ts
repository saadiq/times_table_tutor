import { create } from 'zustand'
import type { FactProgress, Confidence, FactProgressSync, RecentAttempt, InputMethod } from '../types'
import { CONFIDENCE_THRESHOLDS, TIMES_TABLES, REWARDS } from '../lib/constants'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useGardenStore } from './gardenStore'
import { getMasteryReward } from '../lib/rewards'
import { getOperation, multiplyOperation, divideOperation } from '../lib/operations'
import type { CurriculumId } from '../lib/operations'
import { useCurriculumStore } from './curriculumStore'
import { calculateConfidence, migrateRecentAttempts, migrateFacts } from '../lib/factConfidence'

type RecordAttemptParams = {
  fact: string
  correct: boolean
  inputMethod: InputMethod
  responseTimeMs: number
  hintShown?: boolean
}

type ProgressState = {
  facts: Record<string, FactProgress>
  initialized: boolean
  /** Which curriculum the in-memory facts slice belongs to. */
  curriculum: CurriculumId
}

type ProgressActions = {
  initialize: () => void
  loadCurriculum: (id: CurriculumId) => void
  recordAttempt: (params: RecordAttemptParams) => void
  getFactProgress: (fact: string) => FactProgress | undefined
  getFactsByConfidence: (confidence: Confidence) => FactProgress[]
  getFactsAtOrAbove: (minLevel: Confidence) => FactProgress[]
  getMasteredTables: () => number[]
  setPreferredStrategy: (fact: string, strategy: string) => void
  loadFromServer: (facts: FactProgressSync[]) => void
  toSyncPayload: (fact: string) => FactProgressSync | null
}

function progressKeyFor(id: CurriculumId): 'progress' | 'progressDivide' {
  return id === 'divide' ? 'progressDivide' : 'progress'
}

type MatchesTable = (fact: FactProgress, table: number) => boolean

function checkTableMastery(
  facts: Record<string, FactProgress>,
  table: number,
  matchesTable: MatchesTable
): boolean {
  const tableFacts = Object.values(facts).filter((f) => matchesTable(f, table))
  return tableFacts.length > 0 && tableFacts.every((f) => f.confidence === 'mastered')
}

function getMasteredTablesFromFacts(
  facts: Record<string, FactProgress>,
  matchesTable: MatchesTable
): number[] {
  const mastered: number[] = []
  for (let table = TIMES_TABLES.min; table <= TIMES_TABLES.max; table++) {
    if (checkTableMastery(facts, table, matchesTable)) {
      mastered.push(table)
    }
  }
  return mastered
}

function getRandomPosition(): { x: number; y: number } {
  return {
    x: Math.random() * 200 + 50,
    y: Math.random() * 200 + 50,
  }
}

export const useProgressStore = create<ProgressState & ProgressActions>((set, get) => ({
  facts: {},
  initialized: false,
  curriculum: 'multiply',

  initialize: () => {
    get().loadCurriculum(useCurriculumStore.getState().active)
  },

  loadCurriculum: (id) => {
    const key = progressKeyFor(id)
    const saved = loadFromStorage<Record<string, FactProgress>>(key)
    if (saved) {
      const migrated = migrateFacts(saved)
      set({ facts: migrated, initialized: true, curriculum: id })
      saveToStorage(key, migrated)
    } else {
      const facts = getOperation(id).generateFacts()
      set({ facts, initialized: true, curriculum: id })
      saveToStorage(key, facts)
    }
  },

  recordAttempt: ({ fact, correct, inputMethod, responseTimeMs, hintShown }) => {
    set(state => {
      const current = state.facts[fact]
      if (!current) return state

      const now = new Date().toISOString()
      const newAttempt: RecentAttempt = {
        correct,
        inputMethod,
        responseTimeMs,
        timestamp: now,
        hintShown: hintShown ?? false,
      }
      const recentAttempts = [...current.recentAttempts, newAttempt]
        .slice(-CONFIDENCE_THRESHOLDS.recentAttemptsWindow)

      const updated: FactProgress = {
        ...current,
        correctCount: current.correctCount + (correct ? 1 : 0),
        incorrectCount: current.incorrectCount + (correct ? 0 : 1),
        lastSeen: now,
        lastCorrect: correct ? now : current.lastCorrect,
        recentAttempts,
        confidence: 'new', // Will be recalculated
      }
      updated.confidence = calculateConfidence(updated)

      const facts = { ...state.facts, [fact]: updated }
      saveToStorage(progressKeyFor(state.curriculum), facts)

      // Check if this attempt completes a table mastery (operation-defined membership)
      const operation = getOperation(state.curriculum)
      const candidateTables = [...new Set([current.a, current.b])].filter((t) =>
        operation.matchesTable(current, t)
      )
      const gardenStore = useGardenStore.getState()
      for (const table of candidateTables) {
        const wasMastered = checkTableMastery(state.facts, table, operation.matchesTable)
        const nowMastered = checkTableMastery(facts, table, operation.matchesTable)
        if (nowMastered && !wasMastered) {
          const totalMastered = getMasteredTablesFromFacts(facts, operation.matchesTable).length
          const reward = getMasteryReward(table, totalMastered)
          gardenStore.addCoins(REWARDS.masteredTable)
          gardenStore.addItem({
            type: reward.type,
            itemId: reward.itemId,
            position: getRandomPosition(),
            earnedFor: `mastered_${table}x`,
          })
        }
      }

      return { facts }
    })
  },

  getFactProgress: (fact) => get().facts[fact],

  getFactsByConfidence: (confidence) =>
    Object.values(get().facts).filter(f => f.confidence === confidence),

  getFactsAtOrAbove: (minLevel: Confidence) => {
    const order: Confidence[] = ['new', 'learning', 'confident', 'mastered']
    const minIdx = order.indexOf(minLevel)
    return Object.values(get().facts).filter(f => order.indexOf(f.confidence) >= minIdx)
  },

  getMasteredTables: () => {
    const { facts, curriculum } = get()
    return getMasteredTablesFromFacts(facts, getOperation(curriculum).matchesTable)
  },

  setPreferredStrategy: (fact, strategy) => {
    set(state => {
      const current = state.facts[fact]
      if (!current) return state

      const facts = {
        ...state.facts,
        [fact]: { ...current, preferredStrategy: strategy }
      }
      saveToStorage(progressKeyFor(state.curriculum), facts)

      return { facts }
    })
  },

  loadFromServer: (facts) => {
    // Start each slice from generated defaults and overlay the server rows.
    // Looking a row's fact key up in its curriculum's defaults (instead of
    // parsing the key) keeps corrupt or mis-tagged rows out of the slices.
    const slices: Record<CurriculumId, Record<string, FactProgress>> = {
      multiply: multiplyOperation.generateFacts(),
      divide: divideOperation.generateFacts(),
    }
    for (const f of facts) {
      const curriculum: CurriculumId = f.curriculum === 'divide' ? 'divide' : 'multiply'
      const defaults = slices[curriculum][f.fact]
      if (!defaults) continue
      const migratedAttempts = migrateRecentAttempts(f.recentAttempts as unknown[])
      const factData: FactProgress = {
        ...defaults,
        correctCount: f.correctCount,
        incorrectCount: f.incorrectCount,
        lastSeen: f.lastSeen ? new Date(f.lastSeen).toISOString() : null,
        lastCorrect: f.lastCorrect ? new Date(f.lastCorrect).toISOString() : null,
        recentAttempts: migratedAttempts,
        preferredStrategy: f.preferredStrategy,
      }
      factData.confidence = calculateConfidence(factData)
      slices[curriculum][f.fact] = factData
    }
    saveToStorage('progress', slices.multiply)
    saveToStorage('progressDivide', slices.divide)
    set({ facts: slices[get().curriculum], initialized: true })
  },

  toSyncPayload: (factKey) => {
    const fact = get().facts[factKey]
    if (!fact) return null
    return {
      fact: fact.fact,
      curriculum: get().curriculum,
      confidence: fact.confidence,
      correctCount: fact.correctCount,
      incorrectCount: fact.incorrectCount,
      lastSeen: fact.lastSeen ? new Date(fact.lastSeen).getTime() : null,
      lastCorrect: fact.lastCorrect ? new Date(fact.lastCorrect).getTime() : null,
      recentAttempts: fact.recentAttempts,
      preferredStrategy: fact.preferredStrategy,
    }
  },
}))
