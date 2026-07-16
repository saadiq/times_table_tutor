import { create } from 'zustand'
import type { Session, AppMode } from '../types'
import { SESSION_DEFAULTS } from '../lib/constants'

type SessionActions = {
  setMode: (mode: AppMode) => void
  setGoal: (goal: number) => void
  incrementProgress: () => void
  resetProgress: () => void
  setCurrentFact: (fact: string | null) => void
  incrementStreak: () => void
  resetStreak: () => void
  isGoalComplete: () => boolean
  incrementNewFacts: () => void
  recordResult: (correct: boolean) => void
  getSessionAccuracy: () => number
  recordSkip: (fact: string) => void
  setPendingFollowUp: (fact: string | null) => void
  tickComebackDelay: () => void
  clearComeback: () => void
  canSkip: () => boolean
}

const ACCURACY_WINDOW = 20
const TARGET_ACCURACY = 0.85 // Nature Communications 2019: optimal learning at ~85% success

const initialState: Session = {
  goal: SESSION_DEFAULTS.defaultGoal,
  progress: 0,
  currentFact: null,
  mode: 'practice',
  streakCount: 0,
  newFactsIntroduced: 0,
  recentResults: [],
  skipsUsed: 0,
  pendingComeback: null,
  pendingFollowUp: null,
  comebackDelay: 0,
}

export const useSessionStore = create<Session & SessionActions>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setGoal: (goal) => set({
    goal: Math.max(SESSION_DEFAULTS.minGoal, Math.min(SESSION_DEFAULTS.maxGoal, goal))
  }),

  incrementProgress: () => set(state => ({ progress: state.progress + 1 })),

  resetProgress: () => set({
    progress: 0, streakCount: 0, newFactsIntroduced: 0, recentResults: [],
    skipsUsed: 0, pendingComeback: null, pendingFollowUp: null, comebackDelay: 0,
  }),

  setCurrentFact: (fact) => set({ currentFact: fact }),

  incrementStreak: () => set(state => ({ streakCount: state.streakCount + 1 })),

  resetStreak: () => set({ streakCount: 0 }),

  isGoalComplete: () => get().progress >= get().goal,

  incrementNewFacts: () => set(state => ({ newFactsIntroduced: state.newFactsIntroduced + 1 })),

  recordResult: (correct) => set(state => ({
    recentResults: [...state.recentResults, correct].slice(-ACCURACY_WINDOW),
  })),

  getSessionAccuracy: () => {
    const results = get().recentResults
    if (results.length < 3) return TARGET_ACCURACY
    return results.filter(Boolean).length / results.length
  },

  recordSkip: (fact) => set(state => ({
    skipsUsed: state.skipsUsed + 1,
    pendingComeback: fact,
    comebackDelay: SESSION_DEFAULTS.comebackDelay,
  })),

  setPendingFollowUp: (fact) => set({ pendingFollowUp: fact }),

  tickComebackDelay: () => set(state => ({
    comebackDelay: Math.max(0, state.comebackDelay - 1),
  })),

  clearComeback: () => set({ pendingComeback: null, comebackDelay: 0 }),

  canSkip: () => get().skipsUsed < SESSION_DEFAULTS.skipsPerBlock,
}))
