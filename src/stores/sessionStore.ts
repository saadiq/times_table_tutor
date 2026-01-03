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
}

const initialState: Session = {
  goal: SESSION_DEFAULTS.defaultGoal,
  progress: 0,
  currentFact: null,
  mode: 'practice',
  streakCount: 0,
}

export const useSessionStore = create<Session & SessionActions>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setGoal: (goal) => set({
    goal: Math.max(SESSION_DEFAULTS.minGoal, Math.min(SESSION_DEFAULTS.maxGoal, goal))
  }),

  incrementProgress: () => set(state => ({ progress: state.progress + 1 })),

  resetProgress: () => set({ progress: 0, streakCount: 0 }),

  setCurrentFact: (fact) => set({ currentFact: fact }),

  incrementStreak: () => set(state => ({ streakCount: state.streakCount + 1 })),

  resetStreak: () => set({ streakCount: 0 }),

  isGoalComplete: () => get().progress >= get().goal,
}))
