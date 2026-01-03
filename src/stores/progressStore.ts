import { create } from 'zustand'
import type { FactProgress, Confidence } from '../types'
import { TIMES_TABLES } from '../lib/constants'
import { saveToStorage, loadFromStorage } from '../lib/storage'

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

      return { facts }
    })
  },

  getFactProgress: (fact) => get().facts[fact],

  getFactsByConfidence: (confidence) =>
    Object.values(get().facts).filter(f => f.confidence === confidence),

  getMasteredTables: () => {
    const facts = get().facts
    const mastered: number[] = []

    for (let table = TIMES_TABLES.min; table <= TIMES_TABLES.max; table++) {
      const tableFacts = Object.values(facts).filter(f => f.a === table || f.b === table)
      if (tableFacts.every(f => f.confidence === 'mastered')) {
        mastered.push(table)
      }
    }

    return mastered
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
