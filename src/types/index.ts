export type Confidence = 'new' | 'learning' | 'confident' | 'mastered'

export type InputMethod = 'multiple_choice' | 'number_pad'

// Rich attempt data for smarter confidence calculation
export type RecentAttempt = {
  correct: boolean
  inputMethod: InputMethod
  responseTimeMs: number
  timestamp: string
  /** True when the hint panel was open before answering. Absent = unaided legacy data. */
  hintShown?: boolean
  /** Time to the first digit tap; equals responseTimeMs on multiple choice. Absent = legacy data. */
  firstInputMs?: number
}

export type FactProgress = {
  fact: string              // "7x8"
  a: number                 // 7
  b: number                 // 8
  answer: number            // 56
  confidence: Confidence
  correctCount: number
  incorrectCount: number
  /** Times the learner skipped this fact in Practice. Absent = 0 (legacy data). */
  skippedCount?: number
  lastSeen: string | null   // ISO date string
  lastCorrect: string | null
  recentAttempts: RecentAttempt[] // Last 8 attempts with rich data
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
  newFactsIntroduced: number       // Count of "new" confidence facts shown this session
  recentResults: boolean[]          // Rolling window of correct/incorrect for accuracy targeting
  skipsUsed: number
  pendingComeback: string | null
  pendingFollowUp: string | null    // Commuted fact queued after a correct answer
  comebackDelay: number
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
  | 'known_anchor'
  | 'inverse_multiplication'
  | 'fact_family'
  | 'halving'

export type AttemptRecord = {
  id: string
  factKey: string         // "7x8"
  timestamp: string       // ISO date
  correct: boolean
  responseTimeMs: number
  inputMethod: InputMethod
  hintShown: boolean
  /** Time to the first digit tap; equals responseTimeMs on multiple choice. Absent = legacy data. */
  firstInputMs?: number
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
