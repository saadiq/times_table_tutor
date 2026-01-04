export type Confidence = 'new' | 'learning' | 'confident' | 'mastered'

export type FactProgress = {
  fact: string              // "7x8"
  a: number                 // 7
  b: number                 // 8
  answer: number            // 56
  confidence: Confidence
  correctCount: number
  incorrectCount: number
  lastSeen: string | null   // ISO date string
  lastCorrect: string | null
  recentAttempts: boolean[] // Last 5 attempts
  preferredStrategy: string | null
}

export type GardenItemType = 'flower' | 'tree' | 'decoration' | 'landmark'

export type GardenItem = {
  id: string
  type: GardenItemType
  itemId: string            // "sunflower", "oak_tree", "fountain"
  position: { x: number; y: number }
  earnedFor: string         // "mastered_6x" or "goal_complete"
  earnedAt: string          // ISO date string
}

export type GardenTheme = 'flower' | 'forest' | 'underwater' | 'space'

export type GardenState = {
  items: GardenItem[]
  coins: number
  unlockedThemes: GardenTheme[]
  currentTheme: GardenTheme
}

export type AppMode = 'learn' | 'practice' | 'garden'

export type Session = {
  goal: number
  progress: number
  currentFact: string | null
  mode: AppMode
  streakCount: number
}

export type Strategy =
  | 'break_apart'
  | 'use_neighbor'
  | 'tens_trick'
  | 'skip_counting'
  | 'visual_array'
  | 'doubles'
  | 'nines_trick'
  | 'fives_trick'
  | 'ones_zeros'

export type InputMethod = 'multiple_choice' | 'number_pad'

export type AttemptRecord = {
  id: string
  factKey: string         // "7x8"
  timestamp: string       // ISO date
  correct: boolean
  responseTimeMs: number
  inputMethod: InputMethod
  hintShown: boolean
  profileId?: string
}

export type DailySummary = {
  date: string            // "2026-01-04"
  attemptCount: number
  correctCount: number
  factsAttempted: string[]
  newMastered: string[]
}

export * from './api';
