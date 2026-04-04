import { create } from 'zustand'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useProgressStore } from './progressStore'
import { useAttemptsStore } from './attemptsStore'
import type { SceneState, PendingReveals } from '../types/scene'

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


// Tier thresholds based on mastered fact count
const TIER_THRESHOLDS = [0, 12, 36, 72, 108] as const
const FOUNDATION_SESSIONS_TO_FULL = 25

export function computeTier(masteredCount: number): number {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (masteredCount >= TIER_THRESHOLDS[i]) return i
  }
  return 0
}

type ProgressViewState = {
  peakRevealedCount: number // High-water mark of learning+ facts (never decreases)
  lastRevealedCount: number // What user has seen (drives pending detection)
  revealedTables: number[] // Animals revealed (permanent set)
  peakTier: number // Highest tier reached (never decreases)
  sessionsCompleted: number // Total sessions (drives foundation warmth)
}

type ProgressViewActions = {
  initialize: () => void
  resync: () => void
  computeSceneState: () => SceneState
  getPendingReveals: () => PendingReveals
  markRevealed: (details: number, tables: number[], tier: number) => void
  incrementSessions: () => void
  reset: () => void
  resetForTesting: () => void
}

const initialState: ProgressViewState = {
  peakRevealedCount: 0,
  lastRevealedCount: 0,
  revealedTables: [],
  peakTier: 0,
  sessionsCompleted: 0,
}

const STORAGE_KEY = 'progressView'

// Old state shape for migration
type LegacyState = {
  lastRevealedFactCount: number
  revealedTables: number[]
  lastRevealedTier: number
}

function isLegacyState(saved: unknown): saved is LegacyState {
  return (
    saved !== null &&
    typeof saved === 'object' &&
    'lastRevealedFactCount' in saved &&
    !('peakRevealedCount' in saved)
  )
}

function migrateLegacy(legacy: LegacyState): ProgressViewState {
  return {
    peakRevealedCount: legacy.lastRevealedFactCount,
    lastRevealedCount: legacy.lastRevealedFactCount,
    revealedTables: legacy.revealedTables,
    peakTier: legacy.lastRevealedTier,
    sessionsCompleted: 0,
  }
}

export const useProgressViewStore = create<ProgressViewState & ProgressViewActions>(
  (set, get) => ({
    ...initialState,

    initialize: () => {
      const saved = loadFromStorage<ProgressViewState | LegacyState>(STORAGE_KEY)
      if (saved) {
        const state = isLegacyState(saved) ? migrateLegacy(saved) : saved

        // Recompute peak from actual learning+ count (may be higher than stored)
        const progressStore = useProgressStore.getState()
        const learningPlus = progressStore.getFactsAtOrAbove('learning').length
        state.peakRevealedCount = Math.max(state.peakRevealedCount, learningPlus)

        set(state)
        saveToStorage(STORAGE_KEY, state)
      } else {
        get().resync()
      }
    },

    resync: () => {
      const progressStore = useProgressStore.getState()
      const learningPlusCount = progressStore.getFactsAtOrAbove('learning').length
      const completedTables = progressStore.getMasteredTables()
      const masteredCount = progressStore.getFactsByConfidence('mastered').length
      const currentTier = computeTier(masteredCount)

      const current = get()
      const synced: ProgressViewState = {
        peakRevealedCount: Math.max(current.peakRevealedCount, learningPlusCount),
        lastRevealedCount: learningPlusCount,
        revealedTables: [...new Set([...current.revealedTables, ...completedTables])],
        peakTier: Math.max(current.peakTier, currentTier),
        sessionsCompleted: current.sessionsCompleted,
      }
      set(synced)
      saveToStorage(STORAGE_KEY, synced)
    },

    computeSceneState: (): SceneState => {
      const state = get()
      const progressStore = useProgressStore.getState()
      const attemptsStore = useAttemptsStore.getState()

      const learningPlusCount = progressStore.getFactsAtOrAbove('learning').length
      const confidentPlusMastered =
        progressStore.getFactsByConfidence('confident').length +
        progressStore.getFactsByConfidence('mastered').length

      const vibrancy =
        learningPlusCount > 0
          ? Math.max(0.3, confidentPlusMastered / learningPlusCount)
          : 0.3

      return {
        foundation: {
          warmth: Math.min(1, state.sessionsCompleted / FOUNDATION_SESSIONS_TO_FULL),
        },
        details: {
          revealedCount: Math.max(state.peakRevealedCount, learningPlusCount),
          vibrancy,
        },
        landmarks: {
          unlockedTables: state.revealedTables,
        },
        ambient: {
          streakDays: attemptsStore.getStreakDays(),
        },
        tier: state.peakTier,
      }
    },

    getPendingReveals: (): PendingReveals => {
      const state = get()
      const progressStore = useProgressStore.getState()

      const learningPlusCount = progressStore.getFactsAtOrAbove('learning').length
      const masteredCount = progressStore.getFactsByConfidence('mastered').length
      const completedTables = progressStore.getMasteredTables()
      const currentTier = computeTier(masteredCount)

      return {
        newDetails: Math.max(0, learningPlusCount - state.lastRevealedCount),
        newLandmarks: completedTables.filter((t) => !state.revealedTables.includes(t)),
        newTier: currentTier > state.peakTier ? currentTier : null,
      }
    },

    markRevealed: (detailCount, tables, tier) => {
      set((state) => {
        const newState: ProgressViewState = {
          peakRevealedCount: Math.max(state.peakRevealedCount, detailCount),
          lastRevealedCount: detailCount,
          revealedTables: [...new Set([...state.revealedTables, ...tables])],
          peakTier: Math.max(state.peakTier, tier),
          sessionsCompleted: state.sessionsCompleted,
        }
        saveToStorage(STORAGE_KEY, newState)
        return newState
      })
    },

    incrementSessions: () => {
      set((state) => {
        const newState = {
          ...state,
          sessionsCompleted: state.sessionsCompleted + 1,
        }
        saveToStorage(STORAGE_KEY, newState)
        return newState
      })
    },

    reset: () => {
      set(initialState)
      saveToStorage(STORAGE_KEY, initialState)
    },

    resetForTesting: () => {
      get().reset()
    },
  })
)
