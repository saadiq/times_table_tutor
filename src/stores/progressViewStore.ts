import { create } from 'zustand'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useProgressStore } from './progressStore'

// Character data for each times table
export const TABLE_CHARACTERS = [
  { table: 1, name: 'Ladybug', position: { top: '88%', left: '8%', width: '12%', height: '10%' } },
  { table: 2, name: 'Butterfly', position: { top: '68%', left: '42%', width: '10%', height: '10%' } },
  { table: 3, name: 'Robin', position: { top: '35%', left: '73%', width: '12%', height: '10%' } },
  { table: 4, name: 'Squirrel', position: { top: '42%', left: '38%', width: '12%', height: '14%' } },
  { table: 5, name: 'Rabbit', position: { top: '68%', left: '68%', width: '15%', height: '15%' } },
  { table: 6, name: 'Fox', position: { top: '62%', left: '5%', width: '16%', height: '14%' } },
  { table: 7, name: 'Owl', position: { top: '26%', left: '34%', width: '12%', height: '12%' } },
  { table: 8, name: 'Deer', position: { top: '52%', left: '75%', width: '18%', height: '22%' } },
  { table: 9, name: 'Hedgehog', position: { top: '75%', left: '38%', width: '14%', height: '10%' } },
  { table: 10, name: 'Bluebird', position: { top: '16%', left: '6%', width: '12%', height: '12%' } },
  { table: 11, name: 'Badger', position: { top: '52%', left: '5%', width: '18%', height: '14%' } },
  { table: 12, name: 'Cat', position: { top: '18%', left: '38%', width: '16%', height: '12%' } },
] as const

export type PendingReveals = {
  newFacts: number
  newTables: number[]
  newTier: number | null
}

// Shared type for reveal animation steps
export type RevealStep =
  | { type: 'facts'; count: number }
  | { type: 'character'; table: number; name: string }
  | { type: 'tier'; tier: number }

type ProgressViewState = {
  lastRevealedFactCount: number
  revealedTables: number[]
  lastRevealedTier: number // 0-4
}

type ProgressViewActions = {
  initialize: () => void
  getPendingReveals: () => PendingReveals
  markRevealed: (facts: number, tables: number[], tier: number) => void
  resetForTesting: () => void
}

const initialState: ProgressViewState = {
  lastRevealedFactCount: 0,
  revealedTables: [],
  lastRevealedTier: 0,
}

const STORAGE_KEY = 'progressView'

export const useProgressViewStore = create<ProgressViewState & ProgressViewActions>(
  (set, get) => ({
    ...initialState,

    initialize: () => {
      const saved = loadFromStorage<ProgressViewState>(STORAGE_KEY)
      if (saved) {
        set(saved)
      } else {
        // Bootstrap from current progress so tree shows existing progress
        const progressStore = useProgressStore.getState()
        const confidentFacts = progressStore.getFactsByConfidence('confident')
        const masteredFacts = progressStore.getFactsByConfidence('mastered')
        const currentCount = confidentFacts.length + masteredFacts.length
        const completedTables = progressStore.getMasteredTables()
        const currentTier = Math.min(4, Math.floor(currentCount / 36))

        const bootstrapped = {
          lastRevealedFactCount: currentCount,
          revealedTables: completedTables,
          lastRevealedTier: currentTier,
        }
        set(bootstrapped)
        saveToStorage(STORAGE_KEY, bootstrapped)
      }
    },

    getPendingReveals: () => {
      const { lastRevealedFactCount, revealedTables, lastRevealedTier } = get()
      const progressStore = useProgressStore.getState()

      // Count confident + mastered facts for scene progress
      // (don't require full mastery to see the scene come alive)
      const confidentFacts = progressStore.getFactsByConfidence('confident')
      const masteredFacts = progressStore.getFactsByConfidence('mastered')
      const currentProgressCount = confidentFacts.length + masteredFacts.length

      // Get completed tables (still requires full mastery for character unlocks)
      const completedTables = progressStore.getMasteredTables()

      // Calculate current tier (0-4 based on 36-fact increments)
      const currentTier = Math.min(4, Math.floor(currentProgressCount / 36))

      return {
        newFacts: currentProgressCount - lastRevealedFactCount,
        newTables: completedTables.filter((t) => !revealedTables.includes(t)),
        newTier: currentTier > lastRevealedTier ? currentTier : null,
      }
    },

    markRevealed: (facts, tables, tier) => {
      set((state) => {
        const newState = {
          lastRevealedFactCount: facts,
          revealedTables: [...new Set([...state.revealedTables, ...tables])],
          lastRevealedTier: Math.max(state.lastRevealedTier, tier),
        }
        saveToStorage(STORAGE_KEY, newState)
        return newState
      })
    },

    resetForTesting: () => {
      set(initialState)
      saveToStorage(STORAGE_KEY, initialState)
    },
  })
)
