import { create } from 'zustand'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useProgressStore } from './progressStore'
import { useAttemptsStore } from './attemptsStore'
import type { SceneState, PendingReveals } from '../types/scene'
import type { SessionCounts } from '../types/api'
import type { CurriculumId } from '../lib/operations'
import { useCurriculumStore } from './curriculumStore'

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
  curriculum: CurriculumId // Which curriculum this reveal state belongs to
}

type ProgressViewActions = {
  initialize: () => void
  loadCurriculum: (id: CurriculumId) => void
  resync: (serverSessions?: SessionCounts) => void
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
  curriculum: 'multiply' as CurriculumId,
}

function progressViewKeyFor(id: CurriculumId): 'progressView' | 'progressViewDivide' {
  return id === 'divide' ? 'progressViewDivide' : 'progressView'
}

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

function migrateLegacy(legacy: LegacyState): Omit<ProgressViewState, 'curriculum'> {
  return {
    peakRevealedCount: legacy.lastRevealedFactCount,
    lastRevealedCount: legacy.lastRevealedFactCount,
    revealedTables: legacy.revealedTables,
    peakTier: legacy.lastRevealedTier,
    sessionsCompleted: 0,
  }
}

/** Load one curriculum's stored slice, migrating legacy shapes; null if none saved. */
function loadSlice(id: CurriculumId): ProgressViewState | null {
  const saved = loadFromStorage<ProgressViewState | LegacyState>(progressViewKeyFor(id))
  if (!saved) return null
  return { ...(isLegacyState(saved) ? migrateLegacy(saved) : saved), curriculum: id }
}

/**
 * Fold the server's counts for the curricula this device isn't showing into
 * their stored slices, so switching to one later doesn't start from zero. The
 * counts stay separate: a multiply session must never warm the divide scene.
 */
function mergeStoredSessions(sessions: SessionCounts, active: CurriculumId): void {
  for (const [id, count] of Object.entries(sessions) as [CurriculumId, number][]) {
    if (id === active || !count) continue

    const base = loadSlice(id) ?? { ...initialState, curriculum: id }
    if (base.sessionsCompleted >= count) continue
    saveToStorage(progressViewKeyFor(id), { ...base, sessionsCompleted: count })
  }
}

export const useProgressViewStore = create<ProgressViewState & ProgressViewActions>(
  (set, get) => ({
    ...initialState,

    initialize: () => {
      get().loadCurriculum(useCurriculumStore.getState().active)
    },

    loadCurriculum: (id) => {
      const state = loadSlice(id)
      if (state) {
        // Recompute peak from actual learning+ count (may be higher than stored)
        const progressStore = useProgressStore.getState()
        const learningPlus = progressStore.getFactsAtOrAbove('learning').length
        state.peakRevealedCount = Math.max(state.peakRevealedCount, learningPlus)

        set(state)
        saveToStorage(progressViewKeyFor(id), state)
      } else {
        set({ ...initialState, curriculum: id })
        get().resync()
      }
    },

    // serverSessions comes from verify, keyed by curriculum; take the higher of
    // the two so a fresh device inherits the scene's warmth without ever
    // rolling this one back.
    resync: (serverSessions) => {
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
        sessionsCompleted: Math.max(
          current.sessionsCompleted,
          serverSessions?.[current.curriculum] ?? 0
        ),
        curriculum: current.curriculum,
      }
      set(synced)
      saveToStorage(progressViewKeyFor(current.curriculum), synced)
      if (serverSessions) mergeStoredSessions(serverSessions, current.curriculum)
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
          curriculum: state.curriculum,
        }
        saveToStorage(progressViewKeyFor(state.curriculum), newState)
        return newState
      })
    },

    incrementSessions: () => {
      set((state) => {
        const newState = {
          ...state,
          sessionsCompleted: state.sessionsCompleted + 1,
        }
        saveToStorage(progressViewKeyFor(state.curriculum), newState)
        return newState
      })
    },

    reset: () => {
      set(state => {
        const fresh = { ...initialState, curriculum: state.curriculum }
        saveToStorage(progressViewKeyFor(state.curriculum), fresh)
        return fresh
      })
    },

    resetForTesting: () => {
      get().reset()
    },
  })
)
