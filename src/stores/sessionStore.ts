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
}

export const useSessionStore = create<Session & SessionActions>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setGoal: (goal) => set({
    goal: Math.max(SESSION_DEFAULTS.minGoal, Math.min(SESSION_DEFAULTS.maxGoal, goal))
  }),

  incrementProgress: () => set(state => ({ progress: state.progress + 1 })),

  resetProgress: () => set({ progress: 0, streakCount: 0, newFactsIntroduced: 0, recentResults: [] }),

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
}))
