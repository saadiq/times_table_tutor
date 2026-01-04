import { create } from 'zustand'
import type { FactProgress, Confidence } from '../types'
import { TIMES_TABLES, REWARDS } from '../lib/constants'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useGardenStore } from './gardenStore'
import { getMasteryReward } from '../lib/rewards'

type ProgressState = {
  facts: Record<string, FactProgress>
  initialized: boolean
}

type ProgressActions = {
  initialize: () => void
  recordAttempt: (fact: string, correct: boolean) => void
  getFactProgress: (fact: string) => FactProgress | undefined
  getFactsByConfidence: (confidence: Confidence) => FactProgress[]
  getMasteredTables: () => number[]
  setPreferredStrategy: (fact: string, strategy: string) => void
}

function generateAllFacts(): Record<string, FactProgress> {
  const facts: Record<string, FactProgress> = {}

  for (let a = TIMES_TABLES.min; a <= TIMES_TABLES.max; a++) {
    for (let b = TIMES_TABLES.min; b <= TIMES_TABLES.max; b++) {
      const fact = `${a}x${b}`
      facts[fact] = {
        fact,
        a,
        b,
        answer: a * b,
        confidence: 'new',
        correctCount: 0,
        incorrectCount: 0,
        lastSeen: null,
        lastCorrect: null,
        recentAttempts: [],
        preferredStrategy: null,
      }
    }
  }

  return facts
}

function calculateConfidence(fact: FactProgress): Confidence {
  const recentCorrect = fact.recentAttempts.filter(Boolean).length
  const recentTotal = fact.recentAttempts.length

  if (fact.correctCount >= 5 && recentCorrect >= 3) {
    return 'mastered'
  }
  if (recentTotal >= 3 && recentCorrect >= 3) {
    return 'confident'
  }
  if (fact.correctCount > 0 || fact.incorrectCount > 0) {
    return 'learning'
  }
  return 'new'
}

function checkTableMastery(
  facts: Record<string, FactProgress>,
  tableNumber: number
): boolean {
  for (let i = TIMES_TABLES.min; i <= TIMES_TABLES.max; i++) {
    const fact1 = facts[`${tableNumber}x${i}`]
    const fact2 = facts[`${i}x${tableNumber}`]
    if (fact1?.confidence !== 'mastered' || fact2?.confidence !== 'mastered') {
      return false
    }
  }
  return true
}

function getMasteredTablesFromFacts(facts: Record<string, FactProgress>): number[] {
  const mastered: number[] = []
  for (let table = TIMES_TABLES.min; table <= TIMES_TABLES.max; table++) {
    if (checkTableMastery(facts, table)) {
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

  initialize: () => {
    const saved = loadFromStorage<Record<string, FactProgress>>('progress')
    if (saved) {
      set({ facts: saved, initialized: true })
    } else {
      const facts = generateAllFacts()
      set({ facts, initialized: true })
      saveToStorage('progress', facts)
    }
  },

  recordAttempt: (fact, correct) => {
    set(state => {
      const current = state.facts[fact]
      if (!current) return state

      const recentAttempts = [...current.recentAttempts, correct].slice(-5)
      const now = new Date().toISOString()

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
      saveToStorage('progress', facts)

      // Check if this completes a table mastery
      const tableA = current.a
      const tableB = current.b
      const gardenStore = useGardenStore.getState()
      const previousMastered = getMasteredTablesFromFacts(state.facts)

      const nowMasteredA = checkTableMastery(facts, tableA)
      const nowMasteredB = checkTableMastery(facts, tableB)
      const wasMasteredA = previousMastered.includes(tableA)
      const wasMasteredB = previousMastered.includes(tableB)

      // Award mastery reward for newly mastered tables
      if (nowMasteredA && !wasMasteredA) {
        const totalMastered = getMasteredTablesFromFacts(facts).length
        const reward = getMasteryReward(tableA, totalMastered)
        gardenStore.addCoins(REWARDS.masteredTable)
        gardenStore.addItem({
          type: reward.type,
          itemId: reward.itemId,
          position: getRandomPosition(),
          earnedFor: `mastered_${tableA}x`,
        })
      }

      if (tableA !== tableB && nowMasteredB && !wasMasteredB) {
        const totalMastered = getMasteredTablesFromFacts(facts).length
        const reward = getMasteryReward(tableB, totalMastered)
        gardenStore.addCoins(REWARDS.masteredTable)
        gardenStore.addItem({
          type: reward.type,
          itemId: reward.itemId,
          position: getRandomPosition(),
          earnedFor: `mastered_${tableB}x`,
        })
      }

      return { facts }
    })
  },

  getFactProgress: (fact) => get().facts[fact],

  getFactsByConfidence: (confidence) =>
    Object.values(get().facts).filter(f => f.confidence === confidence),

  getMasteredTables: () => {
    const facts = get().facts
    return getMasteredTablesFromFacts(facts)
  },

  setPreferredStrategy: (fact, strategy) => {
    set(state => {
      const current = state.facts[fact]
      if (!current) return state

      const facts = {
        ...state.facts,
        [fact]: { ...current, preferredStrategy: strategy }
      }
      saveToStorage('progress', facts)

      return { facts }
    })
  },
}))
