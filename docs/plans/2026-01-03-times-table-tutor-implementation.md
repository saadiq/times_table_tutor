# Times Table Tutor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an anxiety-free times table learning app with adaptive learning and garden-based progression.

**Architecture:** React SPA with Zustand stores for state, local storage for persistence. Three main views (Learn, Practice, Garden) with shared components. Adaptive algorithm selects problems based on confidence levels and spaced repetition.

**Tech Stack:** Bun, Vite, React 18, TypeScript, Tailwind CSS, Framer Motion, Zustand, Lucide React, Vite PWA plugin

---

## Parallelization Map

```
Phase 1: Foundation (sequential)
├── Task 1: Project setup

Phase 2: Core Systems (PARALLEL - 3 streams)
├── Stream A: Data Layer
│   ├── Task 2: Types & constants
│   ├── Task 3: Storage utilities
│   └── Task 4: Zustand stores
│
├── Stream B: Learning Engine
│   ├── Task 5: Adaptive algorithm
│   └── Task 6: Strategy hints system
│
└── Stream C: Garden Logic
    └── Task 7: Garden items & rewards

Phase 3: UI Components (PARALLEL - 3 streams)
├── Stream A: Common Components
│   ├── Task 8: Layout & navigation
│   └── Task 9: Button, ProgressBar, Modal
│
├── Stream B: Practice Components
│   ├── Task 10: ProblemDisplay
│   ├── Task 11: AnswerInput (multi-choice + keypad)
│   └── Task 12: HintPanel
│
└── Stream C: Learn & Garden Components
    ├── Task 13: VisualExplainer (Learn mode)
    └── Task 14: GardenView & GardenItem

Phase 4: Integration (sequential)
├── Task 15: Practice mode integration
├── Task 16: Learn mode integration
├── Task 17: Garden mode integration
└── Task 18: Session flow & goals

Phase 5: Polish (PARALLEL)
├── Stream A: Task 19: Animations & celebrations
├── Stream B: Task 20: Sound effects
└── Stream C: Task 21: PWA setup

Phase 6: Final
└── Task 22: Mobile testing & fixes
```

---

## Phase 1: Foundation

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

**Step 1: Initialize project with Vite + React + TypeScript**

```bash
cd /Users/saadiq/dev/times_table_tutor
bun create vite . --template react-ts
```

Select: Ignore files and continue

**Step 2: Install dependencies**

```bash
bun add zustand framer-motion lucide-react
bun add -d tailwindcss postcss autoprefixer @types/node
bunx tailwindcss init -p
```

**Step 3: Configure Tailwind**

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        garden: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warm: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

**Step 4: Setup base CSS**

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }

  body {
    @apply bg-garden-50 text-gray-800 min-h-screen;
  }
}

@layer components {
  .btn-primary {
    @apply bg-garden-500 hover:bg-garden-600 text-white font-medium
           py-3 px-6 rounded-2xl transition-colors
           active:scale-95 transform;
  }

  .btn-secondary {
    @apply bg-warm-100 hover:bg-warm-200 text-gray-800 font-medium
           py-3 px-6 rounded-2xl transition-colors
           active:scale-95 transform;
  }

  .card {
    @apply bg-white rounded-3xl shadow-sm p-6;
  }
}
```

**Step 5: Create placeholder App**

Update `src/App.tsx`:
```tsx
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card text-center">
        <h1 className="text-2xl font-bold text-garden-600">
          Times Table Tutor
        </h1>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    </div>
  )
}

export default App
```

**Step 6: Verify setup**

```bash
bun run dev
```

Expected: App runs at localhost:5173, shows "Times Table Tutor" card with green styling.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize project with Vite, React, TypeScript, Tailwind"
```

---

## Phase 2: Core Systems

> **PARALLEL EXECUTION:** Tasks 2-4 (Stream A), Tasks 5-6 (Stream B), and Task 7 (Stream C) can run simultaneously.

### Task 2: Types & Constants (Stream A)

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/constants.ts`

**Step 1: Define core types**

Create `src/types/index.ts`:
```typescript
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
```

**Step 2: Define constants**

Create `src/lib/constants.ts`:
```typescript
import type { GardenItemType } from '../types'

export const TIMES_TABLES = {
  min: 1,
  max: 12,
} as const

export const CONFIDENCE_THRESHOLDS = {
  learningToConfident: 3,    // Correct in a row to advance
  confidentToMastered: 5,    // Total correct across sessions
  reviewInterval: 3,         // Days before reviewing mastered facts
} as const

export const SESSION_DEFAULTS = {
  defaultGoal: 5,
  minGoal: 3,
  maxGoal: 20,
} as const

export const REWARDS = {
  correctAnswer: 1,          // Coins per correct
  goalComplete: 5,           // Bonus coins
  streakBonus: 2,            // Extra per 5-streak
  masteredTable: 50,         // Coins for mastering a full table
} as const

export const GARDEN_ITEMS: Record<string, {
  name: string
  type: GardenItemType
  cost: number
  unlockRequirement?: string
}> = {
  // Flowers (cheap, common rewards)
  daisy: { name: 'Daisy', type: 'flower', cost: 0 },
  tulip: { name: 'Tulip', type: 'flower', cost: 0 },
  sunflower: { name: 'Sunflower', type: 'flower', cost: 0 },
  rose: { name: 'Rose', type: 'flower', cost: 0 },
  lavender: { name: 'Lavender', type: 'flower', cost: 0 },

  // Trees (goal completion rewards)
  oak: { name: 'Oak Tree', type: 'tree', cost: 0 },
  cherry: { name: 'Cherry Blossom', type: 'tree', cost: 0 },
  pine: { name: 'Pine Tree', type: 'tree', cost: 0 },

  // Decorations (purchasable with coins)
  bench: { name: 'Bench', type: 'decoration', cost: 10 },
  birdhouse: { name: 'Birdhouse', type: 'decoration', cost: 15 },
  butterfly: { name: 'Butterfly', type: 'decoration', cost: 5 },
  pond: { name: 'Small Pond', type: 'decoration', cost: 25 },

  // Landmarks (mastery rewards)
  fountain: { name: 'Fountain', type: 'landmark', cost: 0, unlockRequirement: 'master_any' },
  treehouse: { name: 'Treehouse', type: 'landmark', cost: 0, unlockRequirement: 'master_3' },
  gazebo: { name: 'Gazebo', type: 'landmark', cost: 0, unlockRequirement: 'master_6' },
  castle: { name: 'Mini Castle', type: 'landmark', cost: 0, unlockRequirement: 'master_all' },
}

export const FLOWER_REWARDS = ['daisy', 'tulip', 'sunflower', 'rose', 'lavender']
export const TREE_REWARDS = ['oak', 'cherry', 'pine']
```

**Step 3: Commit**

```bash
git add src/types src/lib/constants.ts
git commit -m "feat: add core types and constants"
```

---

### Task 3: Storage Utilities (Stream A)

**Files:**
- Create: `src/lib/storage.ts`

**Step 1: Create storage utility**

Create `src/lib/storage.ts`:
```typescript
const STORAGE_KEYS = {
  progress: 'ttt_progress',
  garden: 'ttt_garden',
  session: 'ttt_session',
  settings: 'ttt_settings',
} as const

export function saveToStorage<T>(key: keyof typeof STORAGE_KEYS, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
  } catch (e) {
    console.error(`Failed to save ${key} to storage:`, e)
  }
}

export function loadFromStorage<T>(key: keyof typeof STORAGE_KEYS): T | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS[key])
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error(`Failed to load ${key} from storage:`, e)
    return null
  }
}

export function clearStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add localStorage utilities"
```

---

### Task 4: Zustand Stores (Stream A)

**Files:**
- Create: `src/stores/progressStore.ts`
- Create: `src/stores/gardenStore.ts`
- Create: `src/stores/sessionStore.ts`
- Create: `src/stores/index.ts`

**Step 1: Create progress store**

Create `src/stores/progressStore.ts`:
```typescript
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
```

**Step 2: Create garden store**

Create `src/stores/gardenStore.ts`:
```typescript
import { create } from 'zustand'
import type { GardenItem, GardenState, GardenTheme } from '../types'
import { saveToStorage, loadFromStorage } from '../lib/storage'

type GardenActions = {
  initialize: () => void
  addItem: (item: Omit<GardenItem, 'id' | 'earnedAt'>) => void
  moveItem: (id: string, position: { x: number; y: number }) => void
  removeItem: (id: string) => void
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  unlockTheme: (theme: GardenTheme) => void
  setTheme: (theme: GardenTheme) => void
}

const initialState: GardenState = {
  items: [],
  coins: 0,
  unlockedThemes: ['flower'],
  currentTheme: 'flower',
}

export const useGardenStore = create<GardenState & GardenActions>((set, get) => ({
  ...initialState,

  initialize: () => {
    const saved = loadFromStorage<GardenState>('garden')
    if (saved) {
      set(saved)
    }
  },

  addItem: (itemData) => {
    const item: GardenItem = {
      ...itemData,
      id: crypto.randomUUID(),
      earnedAt: new Date().toISOString(),
    }

    set(state => {
      const newState = { ...state, items: [...state.items, item] }
      saveToStorage('garden', newState)
      return newState
    })
  },

  moveItem: (id, position) => {
    set(state => {
      const items = state.items.map(item =>
        item.id === id ? { ...item, position } : item
      )
      const newState = { ...state, items }
      saveToStorage('garden', newState)
      return newState
    })
  },

  removeItem: (id) => {
    set(state => {
      const items = state.items.filter(item => item.id !== id)
      const newState = { ...state, items }
      saveToStorage('garden', newState)
      return newState
    })
  },

  addCoins: (amount) => {
    set(state => {
      const newState = { ...state, coins: state.coins + amount }
      saveToStorage('garden', newState)
      return newState
    })
  },

  spendCoins: (amount) => {
    const { coins } = get()
    if (coins < amount) return false

    set(state => {
      const newState = { ...state, coins: state.coins - amount }
      saveToStorage('garden', newState)
      return newState
    })
    return true
  },

  unlockTheme: (theme) => {
    set(state => {
      if (state.unlockedThemes.includes(theme)) return state
      const newState = {
        ...state,
        unlockedThemes: [...state.unlockedThemes, theme]
      }
      saveToStorage('garden', newState)
      return newState
    })
  },

  setTheme: (theme) => {
    set(state => {
      const newState = { ...state, currentTheme: theme }
      saveToStorage('garden', newState)
      return newState
    })
  },
}))
```

**Step 3: Create session store**

Create `src/stores/sessionStore.ts`:
```typescript
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
```

**Step 4: Create store index**

Create `src/stores/index.ts`:
```typescript
export { useProgressStore } from './progressStore'
export { useGardenStore } from './gardenStore'
export { useSessionStore } from './sessionStore'
```

**Step 5: Commit**

```bash
git add src/stores
git commit -m "feat: add Zustand stores for progress, garden, and session"
```

---

### Task 5: Adaptive Algorithm (Stream B)

**Files:**
- Create: `src/lib/adaptive.ts`

**Step 1: Create adaptive learning algorithm**

Create `src/lib/adaptive.ts`:
```typescript
import type { FactProgress, Confidence } from '../types'
import { CONFIDENCE_THRESHOLDS, TIMES_TABLES } from './constants'

type FactWithScore = FactProgress & { score: number }

/**
 * Selects the next fact to practice based on adaptive learning principles:
 * 1. Prioritize facts currently being learned
 * 2. Focus on trouble spots (frequently missed)
 * 3. Review mastered facts using spaced repetition
 * 4. Introduce new facts gradually
 */
export function selectNextFact(
  facts: Record<string, FactProgress>,
  recentFacts: string[] = [],
  focusTables: number[] = []
): FactProgress | null {
  const allFacts = Object.values(facts)

  // Filter to focus tables if specified
  const eligibleFacts = focusTables.length > 0
    ? allFacts.filter(f => focusTables.includes(f.a) || focusTables.includes(f.b))
    : allFacts

  // Exclude very recently shown facts (last 3)
  const notRecent = eligibleFacts.filter(f => !recentFacts.slice(-3).includes(f.fact))

  // Score each fact
  const scored: FactWithScore[] = notRecent.map(fact => ({
    ...fact,
    score: calculateFactScore(fact),
  }))

  // Sort by score (higher = more likely to show)
  scored.sort((a, b) => b.score - a.score)

  // Add some randomness among top candidates
  const topCandidates = scored.slice(0, 5)
  if (topCandidates.length === 0) return null

  const randomIndex = Math.floor(Math.random() * Math.min(3, topCandidates.length))
  return topCandidates[randomIndex]
}

function calculateFactScore(fact: FactProgress): number {
  let score = 0

  // Priority by confidence level
  const confidenceScores: Record<Confidence, number> = {
    learning: 100,    // Highest priority - actively learning
    new: 50,          // Medium - introduce gradually
    confident: 30,    // Lower - occasional practice
    mastered: 10,     // Lowest - spaced review
  }
  score += confidenceScores[fact.confidence]

  // Trouble spot bonus (high incorrect rate)
  if (fact.incorrectCount > 0) {
    const errorRate = fact.incorrectCount / (fact.correctCount + fact.incorrectCount)
    score += errorRate * 50
  }

  // Spaced repetition for mastered facts
  if (fact.confidence === 'mastered' && fact.lastSeen) {
    const daysSince = daysSinceDate(fact.lastSeen)
    if (daysSince >= CONFIDENCE_THRESHOLDS.reviewInterval) {
      score += 40 // Time to review
    }
  }

  // Recency penalty (don't repeat too soon)
  if (fact.lastSeen) {
    const hoursSince = hoursSinceDate(fact.lastSeen)
    if (hoursSince < 1) {
      score -= 30
    }
  }

  // Slight bonus for "easier" facts to build confidence early
  if (fact.confidence === 'new') {
    const difficulty = getFactDifficulty(fact.a, fact.b)
    score -= difficulty * 5
  }

  return score
}

function getFactDifficulty(a: number, b: number): number {
  // 1s, 2s, 5s, 10s are easier
  if (a === 1 || b === 1) return 0
  if (a === 10 || b === 10) return 1
  if (a === 2 || b === 2) return 2
  if (a === 5 || b === 5) return 2
  // Squares are often memorized
  if (a === b) return 3
  // 9s have tricks
  if (a === 9 || b === 9) return 4
  // 3s, 4s are medium
  if (a <= 4 || b <= 4) return 5
  // 6s, 7s, 8s are hardest
  return 7
}

function daysSinceDate(isoDate: string): number {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  return (now - then) / (1000 * 60 * 60 * 24)
}

function hoursSinceDate(isoDate: string): number {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  return (now - then) / (1000 * 60 * 60)
}

/**
 * Generate multiple choice options for a fact
 */
export function generateChoices(fact: FactProgress, count: number = 4): number[] {
  const correct = fact.answer
  const choices = new Set<number>([correct])

  // Common mistake patterns
  const mistakes = [
    correct + fact.a,      // Added one more group
    correct - fact.a,      // One less group
    correct + fact.b,      // Mixed up which to add
    correct - fact.b,
    fact.a + fact.b,       // Added instead of multiplied
    correct + 1,
    correct - 1,
    correct + 10,
    correct - 10,
    (fact.a + 1) * fact.b, // Off by one on factor
    fact.a * (fact.b + 1),
  ].filter(n => n > 0 && n !== correct)

  // Shuffle mistakes and pick unique ones
  const shuffled = mistakes.sort(() => Math.random() - 0.5)

  for (const mistake of shuffled) {
    if (choices.size >= count) break
    choices.add(mistake)
  }

  // Fill with random if needed
  while (choices.size < count) {
    const random = Math.floor(Math.random() * 144) + 1
    if (random !== correct) {
      choices.add(random)
    }
  }

  // Shuffle final choices
  return Array.from(choices).sort(() => Math.random() - 0.5)
}

/**
 * Determine if user should type answer or use multiple choice
 */
export function shouldUseMultipleChoice(fact: FactProgress): boolean {
  // New facts: always multiple choice
  if (fact.confidence === 'new') return true

  // Learning: multiple choice until some success
  if (fact.confidence === 'learning') {
    return fact.correctCount < 2
  }

  // Confident/Mastered: type answer
  return false
}
```

**Step 2: Commit**

```bash
git add src/lib/adaptive.ts
git commit -m "feat: add adaptive learning algorithm with spaced repetition"
```

---

### Task 6: Strategy Hints System (Stream B)

**Files:**
- Create: `src/lib/strategies.ts`

**Step 1: Create strategy hints**

Create `src/lib/strategies.ts`:
```typescript
import type { Strategy, FactProgress } from '../types'

export type StrategyHint = {
  id: Strategy
  name: string
  description: string
  steps: string[]
  visual?: 'array' | 'number_line' | 'groups'
}

/**
 * Get applicable strategies for a given multiplication fact
 */
export function getStrategiesForFact(fact: FactProgress): StrategyHint[] {
  const { a, b, answer } = fact
  const strategies: StrategyHint[] = []

  // Always offer visual array
  strategies.push({
    id: 'visual_array',
    name: 'See It',
    description: `Picture ${a} rows with ${b} in each row`,
    steps: [
      `Draw ${a} rows`,
      `Put ${b} dots in each row`,
      `Count all the dots: ${answer}`,
    ],
    visual: 'array',
  })

  // Skip counting (good for smaller numbers)
  if (a <= 6 || b <= 6) {
    const skipBy = a <= b ? a : b
    const times = a <= b ? b : a
    const sequence = Array.from({ length: times }, (_, i) => skipBy * (i + 1))
    strategies.push({
      id: 'skip_counting',
      name: 'Skip Count',
      description: `Count by ${skipBy}s, ${times} times`,
      steps: [
        `Count by ${skipBy}s:`,
        sequence.join(', '),
        `The ${times}th number is ${answer}`,
      ],
    })
  }

  // Ones and zeros (trivial but good to reinforce)
  if (a === 1 || b === 1) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Ones Rule',
      description: 'Any number times 1 equals itself',
      steps: [
        `${a} x ${b} = ${answer}`,
        'Multiplying by 1 gives you the same number!',
      ],
    })
  }

  if (a === 0 || b === 0) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Zeros Rule',
      description: 'Any number times 0 equals 0',
      steps: [
        `${a} x ${b} = 0`,
        'Multiplying by 0 always gives 0!',
      ],
    })
  }

  // Fives trick
  if (a === 5 || b === 5) {
    const other = a === 5 ? b : a
    strategies.push({
      id: 'fives_trick',
      name: 'Fives Trick',
      description: 'Multiply by 10, then cut in half',
      steps: [
        `${other} x 10 = ${other * 10}`,
        `Half of ${other * 10} = ${answer}`,
      ],
    })
  }

  // Nines trick (fingers or subtract pattern)
  if (a === 9 || b === 9) {
    const other = a === 9 ? b : a
    strategies.push({
      id: 'nines_trick',
      name: 'Nines Trick',
      description: 'Multiply by 10, then subtract once',
      steps: [
        `${other} x 10 = ${other * 10}`,
        `${other * 10} - ${other} = ${answer}`,
        `Or: tens digit is ${other - 1}, ones digit is ${10 - other} = ${answer}`,
      ],
    })
  }

  // Tens trick
  if (a === 10 || b === 10) {
    const other = a === 10 ? b : a
    strategies.push({
      id: 'tens_trick',
      name: 'Tens Trick',
      description: 'Just add a zero!',
      steps: [
        `${other} x 10 = ${other}0`,
        `The answer is ${answer}`,
      ],
    })
  }

  // Doubles (squares)
  if (a === b) {
    strategies.push({
      id: 'doubles',
      name: 'Square Number',
      description: `${a} squared`,
      steps: [
        `${a} x ${a} = ${answer}`,
        `This is called "${a} squared"`,
      ],
      visual: 'array',
    })
  }

  // Use a neighbor (for harder facts)
  if (a > 2 && b > 2) {
    const neighborA = a - 1
    const neighborAnswer = neighborA * b
    strategies.push({
      id: 'use_neighbor',
      name: 'Use a Neighbor',
      description: `Start from ${neighborA} x ${b}, add ${b} more`,
      steps: [
        `You might know: ${neighborA} x ${b} = ${neighborAnswer}`,
        `Add one more group of ${b}`,
        `${neighborAnswer} + ${b} = ${answer}`,
      ],
    })
  }

  // Break apart (for larger numbers)
  if (a > 5 && b > 5) {
    const halfA = Math.floor(a / 2)
    const remainder = a - halfA
    strategies.push({
      id: 'break_apart',
      name: 'Break Apart',
      description: `Split ${a} into ${halfA} + ${remainder}`,
      steps: [
        `${halfA} x ${b} = ${halfA * b}`,
        `${remainder} x ${b} = ${remainder * b}`,
        `${halfA * b} + ${remainder * b} = ${answer}`,
      ],
    })
  }

  return strategies
}

/**
 * Get the best strategy for a fact, considering user preferences
 */
export function getBestStrategy(
  fact: FactProgress,
  preferredStrategy: string | null
): StrategyHint {
  const strategies = getStrategiesForFact(fact)

  // If user has a preferred strategy and it's available, use it
  if (preferredStrategy) {
    const preferred = strategies.find(s => s.id === preferredStrategy)
    if (preferred) return preferred
  }

  // Otherwise return the first (most relevant) strategy
  return strategies[0]
}

/**
 * Get a short encouraging message for wrong answers
 */
export function getEncouragingMessage(): string {
  const messages = [
    "Let me show you a trick!",
    "Here's a helpful way to think about it.",
    "No worries, let's figure this out together.",
    "Good try! Here's a strategy that might help.",
    "Let's look at this a different way.",
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}
```

**Step 2: Commit**

```bash
git add src/lib/strategies.ts
git commit -m "feat: add strategy hints system with multiple learning approaches"
```

---

### Task 7: Garden Items & Rewards (Stream C)

**Files:**
- Create: `src/lib/rewards.ts`

**Step 1: Create rewards logic**

Create `src/lib/rewards.ts`:
```typescript
import type { GardenItemType } from '../types'
import { REWARDS, FLOWER_REWARDS, TREE_REWARDS, GARDEN_ITEMS } from './constants'

export type RewardResult = {
  coins: number
  item: {
    type: GardenItemType
    itemId: string
  } | null
  bonusMessage: string | null
}

/**
 * Calculate rewards for a correct answer
 */
export function calculateReward(
  streakCount: number,
  goalProgress: number,
  goalTarget: number
): RewardResult {
  let coins = REWARDS.correctAnswer
  let bonusMessage: string | null = null
  let item: RewardResult['item'] = null

  // Streak bonus every 5 correct
  if (streakCount > 0 && streakCount % 5 === 0) {
    coins += REWARDS.streakBonus
    bonusMessage = `${streakCount} in a row!`
  }

  // Goal completion bonus
  if (goalProgress + 1 >= goalTarget) {
    coins += REWARDS.goalComplete
    bonusMessage = 'Goal complete!'

    // Award a random tree on goal complete
    const treeId = TREE_REWARDS[Math.floor(Math.random() * TREE_REWARDS.length)]
    item = { type: 'tree', itemId: treeId }
  }

  return { coins, item, bonusMessage }
}

/**
 * Award for completing a session goal
 */
export function getGoalCompleteReward(): { type: GardenItemType; itemId: string } {
  // Random flower as goal reward
  const flowerId = FLOWER_REWARDS[Math.floor(Math.random() * FLOWER_REWARDS.length)]
  return { type: 'flower', itemId: flowerId }
}

/**
 * Award for mastering a times table
 */
export function getMasteryReward(
  tableNumber: number,
  totalMastered: number
): { type: GardenItemType; itemId: string } {
  // Landmarks unlock at milestones
  if (totalMastered === 1) {
    return { type: 'landmark', itemId: 'fountain' }
  }
  if (totalMastered === 3) {
    return { type: 'landmark', itemId: 'treehouse' }
  }
  if (totalMastered === 6) {
    return { type: 'landmark', itemId: 'gazebo' }
  }
  if (totalMastered >= 12) {
    return { type: 'landmark', itemId: 'castle' }
  }

  // Default: a tree
  return { type: 'tree', itemId: TREE_REWARDS[tableNumber % TREE_REWARDS.length] }
}

/**
 * Get items available for purchase with coins
 */
export function getPurchasableItems(coins: number): Array<{
  itemId: string
  name: string
  type: GardenItemType
  cost: number
}> {
  return Object.entries(GARDEN_ITEMS)
    .filter(([_, item]) => item.cost > 0 && item.cost <= coins)
    .map(([itemId, item]) => ({
      itemId,
      name: item.name,
      type: item.type,
      cost: item.cost,
    }))
}

/**
 * Get celebration messages
 */
export function getCelebrationMessage(streakCount: number): string {
  if (streakCount >= 10) {
    return 'Amazing streak!'
  }
  if (streakCount >= 5) {
    return 'Great job!'
  }

  const messages = [
    'Nice!',
    'Correct!',
    'You got it!',
    'Well done!',
    'Perfect!',
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}
```

**Step 2: Commit**

```bash
git add src/lib/rewards.ts
git commit -m "feat: add rewards and garden item logic"
```

---

## Phase 3: UI Components

> **PARALLEL EXECUTION:** Tasks 8-9 (Stream A), Tasks 10-12 (Stream B), and Tasks 13-14 (Stream C) can run simultaneously.
>
> **IMPORTANT:** Use the `frontend-design` skill when implementing these UI components to ensure high design quality.

### Task 8: Layout & Navigation (Stream A)

**Files:**
- Create: `src/components/common/Layout.tsx`
- Create: `src/components/common/Navigation.tsx`

**Step 1: Create Layout component**

Create `src/components/common/Layout.tsx`:
```tsx
import { ReactNode } from 'react'
import { Navigation } from './Navigation'

type LayoutProps = {
  children: ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-garden-50 to-sky-50">
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {showNav && <Navigation />}
    </div>
  )
}
```

**Step 2: Create Navigation component**

Create `src/components/common/Navigation.tsx`:
```tsx
import { BookOpen, Target, Flower2 } from 'lucide-react'
import { useSessionStore } from '../../stores'
import type { AppMode } from '../../types'

const navItems: Array<{ mode: AppMode; icon: typeof BookOpen; label: string }> = [
  { mode: 'learn', icon: BookOpen, label: 'Learn' },
  { mode: 'practice', icon: Target, label: 'Practice' },
  { mode: 'garden', icon: Flower2, label: 'Garden' },
]

export function Navigation() {
  const { mode, setMode } = useSessionStore()

  return (
    <nav className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-2 safe-area-pb">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map(({ mode: itemMode, icon: Icon, label }) => {
          const isActive = mode === itemMode
          return (
            <button
              key={itemMode}
              onClick={() => setMode(itemMode)}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors min-w-[72px] ${
                isActive
                  ? 'text-garden-600 bg-garden-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

**Step 3: Add safe area CSS**

Add to `src/index.css`:
```css
@layer utilities {
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom, 0.5rem);
  }
}
```

**Step 4: Commit**

```bash
git add src/components/common src/index.css
git commit -m "feat: add Layout and Navigation components"
```

---

### Task 9: Common UI Components (Stream A)

**Files:**
- Create: `src/components/common/Button.tsx`
- Create: `src/components/common/ProgressBar.tsx`
- Create: `src/components/common/Modal.tsx`
- Create: `src/components/common/index.ts`

**Step 1: Create Button component**

Create `src/components/common/Button.tsx`:
```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'answer'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  isCorrect?: boolean
  isWrong?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-garden-500 hover:bg-garden-600 text-white shadow-sm',
  secondary: 'bg-warm-100 hover:bg-warm-200 text-gray-800',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
  answer: 'bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 hover:border-garden-300',
}

const sizeStyles = {
  sm: 'py-2 px-4 text-sm',
  md: 'py-3 px-6 text-base',
  lg: 'py-4 px-8 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isCorrect, isWrong, className = '', children, ...props }, ref) => {
    let stateStyles = ''
    if (isCorrect) {
      stateStyles = 'bg-garden-500 border-garden-500 text-white'
    } else if (isWrong) {
      stateStyles = 'bg-warm-100 border-warm-300'
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        className={`
          rounded-2xl font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-garden-400 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${stateStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
```

**Step 2: Create ProgressBar component**

Create `src/components/common/ProgressBar.tsx`:
```tsx
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

type ProgressBarProps = {
  current: number
  total: number
  showStars?: boolean
}

export function ProgressBar({ current, total, showStars = true }: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100)

  return (
    <div className="w-full">
      {showStars && (
        <div className="flex justify-between mb-1">
          {Array.from({ length: total }).map((_, i) => (
            <Star
              key={i}
              size={16}
              className={`transition-colors ${
                i < current
                  ? 'text-warm-400 fill-warm-400'
                  : 'text-gray-200'
              }`}
            />
          ))}
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-garden-400 to-garden-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
```

**Step 3: Create Modal component**

Create `src/components/common/Modal.tsx`:
```tsx
import { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-white rounded-3xl shadow-xl z-50 overflow-hidden"
          >
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            )}
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

**Step 4: Create index export**

Create `src/components/common/index.ts`:
```typescript
export { Button } from './Button'
export { ProgressBar } from './ProgressBar'
export { Modal } from './Modal'
export { Layout } from './Layout'
export { Navigation } from './Navigation'
```

**Step 5: Commit**

```bash
git add src/components/common
git commit -m "feat: add Button, ProgressBar, and Modal components"
```

---

### Task 10: ProblemDisplay Component (Stream B)

**Files:**
- Create: `src/components/practice/ProblemDisplay.tsx`

**Step 1: Create ProblemDisplay**

Create `src/components/practice/ProblemDisplay.tsx`:
```tsx
import { motion } from 'framer-motion'
import type { FactProgress } from '../../types'

type ProblemDisplayProps = {
  fact: FactProgress
}

export function ProblemDisplay({ fact }: ProblemDisplayProps) {
  return (
    <motion.div
      key={fact.fact}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8"
    >
      <div className="text-6xl md:text-7xl font-bold text-gray-800 tracking-tight">
        <span>{fact.a}</span>
        <span className="text-garden-500 mx-3">×</span>
        <span>{fact.b}</span>
      </div>
      <div className="mt-4 text-gray-400 text-lg">
        What's the answer?
      </div>
    </motion.div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/practice/ProblemDisplay.tsx
git commit -m "feat: add ProblemDisplay component"
```

---

### Task 11: AnswerInput Component (Stream B)

**Files:**
- Create: `src/components/practice/AnswerInput.tsx`
- Create: `src/components/practice/MultipleChoice.tsx`
- Create: `src/components/practice/NumberPad.tsx`

**Step 1: Create MultipleChoice component**

Create `src/components/practice/MultipleChoice.tsx`:
```tsx
import { motion } from 'framer-motion'
import { Button } from '../common'

type MultipleChoiceProps = {
  choices: number[]
  onSelect: (answer: number) => void
  correctAnswer: number
  selectedAnswer: number | null
  showResult: boolean
  disabled: boolean
}

export function MultipleChoice({
  choices,
  onSelect,
  correctAnswer,
  selectedAnswer,
  showResult,
  disabled,
}: MultipleChoiceProps) {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
      {choices.map((choice, index) => {
        const isSelected = selectedAnswer === choice
        const isCorrect = choice === correctAnswer

        return (
          <motion.div
            key={choice}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="answer"
              size="lg"
              onClick={() => onSelect(choice)}
              disabled={disabled}
              isCorrect={showResult && isCorrect}
              isWrong={showResult && isSelected && !isCorrect}
              className="w-full text-2xl font-semibold min-h-[72px]"
            >
              {choice}
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}
```

**Step 2: Create NumberPad component**

Create `src/components/practice/NumberPad.tsx`:
```tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Delete, Check } from 'lucide-react'
import { Button } from '../common'

type NumberPadProps = {
  onSubmit: (answer: number) => void
  disabled: boolean
}

export function NumberPad({ onSubmit, disabled }: NumberPadProps) {
  const [value, setValue] = useState('')

  const handleNumber = (num: string) => {
    if (value.length < 3) {
      setValue(prev => prev + num)
    }
  }

  const handleDelete = () => {
    setValue(prev => prev.slice(0, -1))
  }

  const handleSubmit = () => {
    if (value) {
      onSubmit(parseInt(value, 10))
      setValue('')
    }
  }

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

  return (
    <div className="max-w-xs mx-auto">
      {/* Display */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-4 text-center min-h-[64px] flex items-center justify-center">
        <span className="text-4xl font-bold text-gray-800">
          {value || <span className="text-gray-300">?</span>}
        </span>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {buttons.map((btn) => {
          if (btn === 'del') {
            return (
              <motion.button
                key={btn}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                disabled={disabled || !value}
                className="p-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Delete size={24} className="text-gray-600" />
              </motion.button>
            )
          }

          if (btn === 'ok') {
            return (
              <motion.button
                key={btn}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={disabled || !value}
                className="p-4 rounded-xl bg-garden-500 hover:bg-garden-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Check size={24} className="text-white" />
              </motion.button>
            )
          }

          return (
            <motion.button
              key={btn}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumber(btn)}
              disabled={disabled}
              className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-garden-300 transition-colors disabled:opacity-50 text-2xl font-semibold text-gray-800"
            >
              {btn}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 3: Create AnswerInput wrapper**

Create `src/components/practice/AnswerInput.tsx`:
```tsx
import type { FactProgress } from '../../types'
import { shouldUseMultipleChoice, generateChoices } from '../../lib/adaptive'
import { MultipleChoice } from './MultipleChoice'
import { NumberPad } from './NumberPad'
import { useMemo } from 'react'

type AnswerInputProps = {
  fact: FactProgress
  onAnswer: (answer: number) => void
  selectedAnswer: number | null
  showResult: boolean
  disabled: boolean
}

export function AnswerInput({
  fact,
  onAnswer,
  selectedAnswer,
  showResult,
  disabled,
}: AnswerInputProps) {
  const useMultipleChoice = shouldUseMultipleChoice(fact)

  const choices = useMemo(() => {
    if (useMultipleChoice) {
      return generateChoices(fact, 4)
    }
    return []
  }, [fact, useMultipleChoice])

  if (useMultipleChoice) {
    return (
      <MultipleChoice
        choices={choices}
        onSelect={onAnswer}
        correctAnswer={fact.answer}
        selectedAnswer={selectedAnswer}
        showResult={showResult}
        disabled={disabled}
      />
    )
  }

  return <NumberPad onSubmit={onAnswer} disabled={disabled} />
}
```

**Step 4: Commit**

```bash
git add src/components/practice/AnswerInput.tsx src/components/practice/MultipleChoice.tsx src/components/practice/NumberPad.tsx
git commit -m "feat: add AnswerInput with MultipleChoice and NumberPad modes"
```

---

### Task 12: HintPanel Component (Stream B)

**Files:**
- Create: `src/components/practice/HintPanel.tsx`
- Create: `src/components/practice/VisualArray.tsx`
- Create: `src/components/practice/index.ts`

**Step 1: Create VisualArray component**

Create `src/components/practice/VisualArray.tsx`:
```tsx
import { motion } from 'framer-motion'

type VisualArrayProps = {
  rows: number
  cols: number
}

export function VisualArray({ rows, cols }: VisualArrayProps) {
  // Limit display size for large numbers
  const displayRows = Math.min(rows, 10)
  const displayCols = Math.min(cols, 10)
  const isTruncated = rows > 10 || cols > 10

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${displayCols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: displayRows * displayCols }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className="w-4 h-4 rounded-full bg-garden-400"
          />
        ))}
      </div>
      {isTruncated && (
        <p className="text-xs text-gray-400 mt-2">
          (Showing {displayRows}×{displayCols} of {rows}×{cols})
        </p>
      )}
      <p className="text-sm text-gray-600 mt-2">
        {rows} rows × {cols} columns = <span className="font-bold text-garden-600">{rows * cols}</span>
      </p>
    </div>
  )
}
```

**Step 2: Create HintPanel component**

Create `src/components/practice/HintPanel.tsx`:
```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronRight } from 'lucide-react'
import type { StrategyHint } from '../../lib/strategies'
import { VisualArray } from './VisualArray'

type HintPanelProps = {
  strategy: StrategyHint | null
  isOpen: boolean
  onClose: () => void
  rows?: number
  cols?: number
}

export function HintPanel({ strategy, isOpen, onClose, rows, cols }: HintPanelProps) {
  if (!strategy) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-warm-50 rounded-2xl p-4 border border-warm-200"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-warm-200 rounded-xl">
              <Lightbulb size={20} className="text-warm-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{strategy.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>

              {strategy.visual === 'array' && rows && cols && (
                <VisualArray rows={rows} cols={cols} />
              )}

              <ul className="mt-3 space-y-2">
                {strategy.steps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <ChevronRight size={16} className="text-garden-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{step}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Got it, let me try
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 3: Create index export**

Create `src/components/practice/index.ts`:
```typescript
export { ProblemDisplay } from './ProblemDisplay'
export { AnswerInput } from './AnswerInput'
export { MultipleChoice } from './MultipleChoice'
export { NumberPad } from './NumberPad'
export { HintPanel } from './HintPanel'
export { VisualArray } from './VisualArray'
```

**Step 4: Commit**

```bash
git add src/components/practice
git commit -m "feat: add HintPanel with visual array support"
```

---

### Task 13: VisualExplainer (Learn Mode) (Stream C)

**Files:**
- Create: `src/components/learn/VisualExplainer.tsx`
- Create: `src/components/learn/FactCard.tsx`
- Create: `src/components/learn/index.ts`

**Step 1: Create FactCard component**

Create `src/components/learn/FactCard.tsx`:
```tsx
import { motion } from 'framer-motion'
import type { FactProgress, Confidence } from '../../types'
import { Circle, CircleDot, CircleCheck, Star } from 'lucide-react'

type FactCardProps = {
  fact: FactProgress
  onClick: () => void
}

const confidenceIcons: Record<Confidence, typeof Circle> = {
  new: Circle,
  learning: CircleDot,
  confident: CircleCheck,
  mastered: Star,
}

const confidenceColors: Record<Confidence, string> = {
  new: 'bg-gray-100 border-gray-200',
  learning: 'bg-sky-50 border-sky-200',
  confident: 'bg-garden-50 border-garden-200',
  mastered: 'bg-warm-50 border-warm-200',
}

export function FactCard({ fact, onClick }: FactCardProps) {
  const Icon = confidenceIcons[fact.confidence]

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 rounded-xl border-2 text-center transition-colors ${confidenceColors[fact.confidence]}`}
    >
      <div className="text-lg font-bold text-gray-800">
        {fact.a} × {fact.b}
      </div>
      <div className="flex items-center justify-center gap-1 mt-1">
        <Icon size={12} className="text-gray-400" />
        <span className="text-xs text-gray-500">{fact.answer}</span>
      </div>
    </motion.button>
  )
}
```

**Step 2: Create VisualExplainer component**

Create `src/components/learn/VisualExplainer.tsx`:
```tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FactProgress } from '../../types'
import { getStrategiesForFact, StrategyHint } from '../../lib/strategies'
import { VisualArray } from '../practice/VisualArray'

type VisualExplainerProps = {
  fact: FactProgress
  onClose: () => void
}

export function VisualExplainer({ fact, onClose }: VisualExplainerProps) {
  const strategies = getStrategiesForFact(fact)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentStrategy = strategies[currentIndex]

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, strategies.length - 1))
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">
          {fact.a} × {fact.b} = {fact.answer}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={24} className="text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-garden-50 rounded-2xl p-4">
              <h3 className="font-semibold text-garden-700 text-lg">
                {currentStrategy.name}
              </h3>
              <p className="text-gray-600 mt-1">
                {currentStrategy.description}
              </p>
            </div>

            {currentStrategy.visual === 'array' && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                <VisualArray rows={fact.a} cols={fact.b} />
              </div>
            )}

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
              <h4 className="font-medium text-gray-700 mb-3">Steps:</h4>
              <ol className="space-y-3">
                {currentStrategy.steps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex gap-3"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-garden-100 text-garden-600 flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        <div className="flex gap-1">
          {strategies.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === currentIndex ? 'bg-garden-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentIndex === strategies.length - 1}
          className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30"
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  )
}
```

**Step 3: Create index export**

Create `src/components/learn/index.ts`:
```typescript
export { VisualExplainer } from './VisualExplainer'
export { FactCard } from './FactCard'
```

**Step 4: Commit**

```bash
git add src/components/learn
git commit -m "feat: add Learn mode components with visual explainer"
```

---

### Task 14: GardenView & GardenItem (Stream C)

**Files:**
- Create: `src/components/garden/GardenView.tsx`
- Create: `src/components/garden/GardenItem.tsx`
- Create: `src/components/garden/index.ts`

**Step 1: Create GardenItem component**

Create `src/components/garden/GardenItem.tsx`:
```tsx
import { motion } from 'framer-motion'
import { Flower2, TreeDeciduous, Landmark, Sparkles } from 'lucide-react'
import type { GardenItem as GardenItemType } from '../../types'
import { GARDEN_ITEMS } from '../../lib/constants'

type GardenItemProps = {
  item: GardenItemType
  onDrag?: (id: string, position: { x: number; y: number }) => void
}

const typeIcons = {
  flower: Flower2,
  tree: TreeDeciduous,
  decoration: Sparkles,
  landmark: Landmark,
}

const typeColors = {
  flower: 'text-pink-500',
  tree: 'text-green-600',
  decoration: 'text-purple-500',
  landmark: 'text-amber-500',
}

const typeSizes = {
  flower: 32,
  tree: 48,
  decoration: 36,
  landmark: 56,
}

export function GardenItem({ item, onDrag }: GardenItemProps) {
  const Icon = typeIcons[item.type]
  const itemData = GARDEN_ITEMS[item.itemId]

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (onDrag) {
          onDrag(item.id, {
            x: item.position.x + info.offset.x,
            y: item.position.y + info.offset.y,
          })
        }
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileDrag={{ scale: 1.2, zIndex: 50 }}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{ left: item.position.x, top: item.position.y }}
    >
      <div className="flex flex-col items-center">
        <Icon
          size={typeSizes[item.type]}
          className={`${typeColors[item.type]} drop-shadow-md`}
        />
        <span className="text-xs text-gray-500 mt-1 bg-white/80 px-1 rounded">
          {itemData?.name || item.itemId}
        </span>
      </div>
    </motion.div>
  )
}
```

**Step 2: Create GardenView component**

Create `src/components/garden/GardenView.tsx`:
```tsx
import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Coins, Palette } from 'lucide-react'
import { useGardenStore } from '../../stores'
import { GardenItem } from './GardenItem'

export function GardenView() {
  const { items, coins, currentTheme, moveItem } = useGardenStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDrag = (id: string, position: { x: number; y: number }) => {
    // Constrain to container bounds
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect()
      const constrainedPosition = {
        x: Math.max(0, Math.min(position.x, bounds.width - 50)),
        y: Math.max(0, Math.min(position.y, bounds.height - 50)),
      }
      moveItem(id, constrainedPosition)
    }
  }

  const themeBackgrounds = {
    flower: 'bg-gradient-to-b from-sky-100 via-green-50 to-green-100',
    forest: 'bg-gradient-to-b from-sky-200 via-green-100 to-green-200',
    underwater: 'bg-gradient-to-b from-blue-200 via-blue-100 to-cyan-100',
    space: 'bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Coins size={20} className="text-warm-500" />
          <span className="font-semibold text-gray-800">{coins}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Palette size={18} />
          <span className="text-sm capitalize">{currentTheme} Garden</span>
        </div>
      </div>

      {/* Garden area */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden ${themeBackgrounds[currentTheme]}`}
      >
        {/* Ground line */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-green-200/50 to-transparent" />

        {/* Items */}
        {items.map(item => (
          <GardenItem key={item.id} item={item} onDrag={handleDrag} />
        ))}

        {/* Empty state */}
        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center p-6 bg-white/80 rounded-2xl max-w-xs">
              <p className="text-gray-600">
                Your garden is waiting to grow!
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Practice some problems to earn flowers and decorations.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Create index export**

Create `src/components/garden/index.ts`:
```typescript
export { GardenView } from './GardenView'
export { GardenItem } from './GardenItem'
```

**Step 4: Commit**

```bash
git add src/components/garden
git commit -m "feat: add Garden view with draggable items"
```

---

## Phase 4: Integration

> **SEQUENTIAL EXECUTION:** These tasks must run in order as each builds on the previous.

### Task 15: Practice Mode Integration

**Files:**
- Create: `src/views/PracticeView.tsx`

**Step 1: Create PracticeView**

Create `src/views/PracticeView.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, SkipForward } from 'lucide-react'
import { useProgressStore, useSessionStore, useGardenStore } from '../stores'
import { selectNextFact } from '../lib/adaptive'
import { getBestStrategy, getEncouragingMessage } from '../lib/strategies'
import { calculateReward, getCelebrationMessage } from '../lib/rewards'
import { ProblemDisplay, AnswerInput, HintPanel } from '../components/practice'
import { ProgressBar, Button } from '../components/common'
import type { FactProgress } from '../types'

export function PracticeView() {
  const { facts, recordAttempt, getFactProgress } = useProgressStore()
  const { goal, progress, streakCount, incrementProgress, incrementStreak, resetStreak, isGoalComplete } = useSessionStore()
  const { addCoins, addItem } = useGardenStore()

  const [currentFact, setCurrentFact] = useState<FactProgress | null>(null)
  const [recentFacts, setRecentFacts] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Select next problem
  const nextProblem = useCallback(() => {
    const next = selectNextFact(facts, recentFacts)
    if (next) {
      setCurrentFact(next)
      setRecentFacts(prev => [...prev.slice(-10), next.fact])
      setSelectedAnswer(null)
      setShowResult(false)
      setShowHint(false)
      setMessage(null)
    }
  }, [facts, recentFacts])

  // Initialize first problem
  useEffect(() => {
    if (!currentFact && Object.keys(facts).length > 0) {
      nextProblem()
    }
  }, [currentFact, facts, nextProblem])

  // Handle answer selection
  const handleAnswer = (answer: number) => {
    if (!currentFact || showResult) return

    setSelectedAnswer(answer)
    setShowResult(true)

    const isCorrect = answer === currentFact.answer
    recordAttempt(currentFact.fact, isCorrect)

    if (isCorrect) {
      incrementStreak()
      incrementProgress()

      const reward = calculateReward(streakCount + 1, progress, goal)
      addCoins(reward.coins)

      if (reward.item) {
        addItem({
          type: reward.item.type,
          itemId: reward.item.itemId,
          position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
          earnedFor: `practice_${currentFact.fact}`,
        })
      }

      setMessage(reward.bonusMessage || getCelebrationMessage(streakCount + 1))

      // Auto-advance after delay
      setTimeout(() => {
        if (!isGoalComplete()) {
          nextProblem()
        }
      }, 1200)
    } else {
      resetStreak()
      setMessage(getEncouragingMessage())
      setShowHint(true)
    }
  }

  // Skip current problem
  const handleSkip = () => {
    resetStreak()
    nextProblem()
  }

  const strategy = currentFact
    ? getBestStrategy(currentFact, currentFact.preferredStrategy)
    : null

  if (isGoalComplete()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-4"
        >
          <Flower2 size={80} className="text-garden-500 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Goal Complete!</h2>
        <p className="text-gray-600 mb-6">
          Amazing work! You've added to your garden.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => { useSessionStore.getState().resetProgress(); nextProblem(); }}>
            Keep Going
          </Button>
          <Button variant="secondary" onClick={() => useSessionStore.getState().setMode('garden')}>
            View Garden
          </Button>
        </div>
      </div>
    )
  }

  if (!currentFact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Today's Goal</span>
          <span className="text-sm font-medium text-gray-800">{progress}/{goal}</span>
        </div>
        <ProgressBar current={progress} total={goal} />
      </div>

      {/* Problem */}
      <div className="flex-1 flex flex-col justify-center">
        <ProblemDisplay fact={currentFact} />

        {/* Answer feedback */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-center py-2 px-4 rounded-full mx-auto mb-4 ${
                showResult && selectedAnswer === currentFact.answer
                  ? 'bg-garden-100 text-garden-700'
                  : 'bg-warm-100 text-warm-700'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Answer input */}
        <div className="mb-6">
          <AnswerInput
            fact={currentFact}
            onAnswer={handleAnswer}
            selectedAnswer={selectedAnswer}
            showResult={showResult}
            disabled={showResult && selectedAnswer === currentFact.answer}
          />
        </div>

        {/* Hint panel */}
        <HintPanel
          strategy={strategy}
          isOpen={showHint}
          onClose={() => { setShowHint(false); nextProblem(); }}
          rows={currentFact.a}
          cols={currentFact.b}
        />

        {/* Action buttons */}
        {!showResult && (
          <div className="flex justify-center gap-4 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowHint(true)}
              className="flex items-center gap-2"
            >
              <Lightbulb size={18} />
              Hint
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex items-center gap-2"
            >
              <SkipForward size={18} />
              Skip
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Import Flower2 at top
import { Flower2 } from 'lucide-react'
```

Note: The import for Flower2 was duplicated at the end - fix during implementation by adding to the top imports.

**Step 2: Commit**

```bash
git add src/views/PracticeView.tsx
git commit -m "feat: integrate Practice mode with all systems"
```

---

### Task 16: Learn Mode Integration

**Files:**
- Create: `src/views/LearnView.tsx`

**Step 1: Create LearnView**

Create `src/views/LearnView.tsx`:
```tsx
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useProgressStore } from '../stores'
import { FactCard, VisualExplainer } from '../components/learn'
import type { FactProgress, Confidence } from '../types'
import { TIMES_TABLES } from '../lib/constants'

const confidenceLabels: Record<Confidence, string> = {
  new: 'New',
  learning: 'Learning',
  confident: 'Confident',
  mastered: 'Mastered',
}

export function LearnView() {
  const { facts, getFactsByConfidence } = useProgressStore()
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedFact, setSelectedFact] = useState<FactProgress | null>(null)

  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  const getTableFacts = (table: number) =>
    Object.values(facts).filter(f => f.a === table)

  const getTableMastery = (table: number) => {
    const tableFacts = getTableFacts(table)
    const mastered = tableFacts.filter(f => f.confidence === 'mastered').length
    return Math.round((mastered / tableFacts.length) * 100)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Table selector */}
      <div className="p-4 bg-white border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Choose a Times Table
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tables.map(table => {
            const mastery = getTableMastery(table)
            const isSelected = selectedTable === table
            return (
              <button
                key={table}
                onClick={() => setSelectedTable(isSelected ? null : table)}
                className={`flex-shrink-0 w-12 h-12 rounded-xl font-bold transition-colors ${
                  isSelected
                    ? 'bg-garden-500 text-white'
                    : mastery === 100
                    ? 'bg-warm-100 text-warm-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {table}
              </button>
            )
          })}
        </div>
      </div>

      {/* Facts grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedTable ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedTable} Times Table
              </h3>
              <span className="text-sm text-gray-500">
                {getTableMastery(selectedTable)}% mastered
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {getTableFacts(selectedTable).map(fact => (
                <FactCard
                  key={fact.fact}
                  fact={fact}
                  onClick={() => setSelectedFact(fact)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {(['learning', 'new', 'confident', 'mastered'] as Confidence[]).map(confidence => {
              const confidenceFacts = getFactsByConfidence(confidence)
              if (confidenceFacts.length === 0) return null

              return (
                <div key={confidence}>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {confidenceLabels[confidence]} ({confidenceFacts.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {confidenceFacts.slice(0, 8).map(fact => (
                      <FactCard
                        key={fact.fact}
                        fact={fact}
                        onClick={() => setSelectedFact(fact)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Visual explainer modal */}
      <AnimatePresence>
        {selectedFact && (
          <VisualExplainer
            fact={selectedFact}
            onClose={() => setSelectedFact(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/views/LearnView.tsx
git commit -m "feat: integrate Learn mode with fact explorer"
```

---

### Task 17: Garden Mode Integration

**Files:**
- Create: `src/views/GardenViewPage.tsx`

**Step 1: Create GardenViewPage**

Create `src/views/GardenViewPage.tsx`:
```tsx
import { GardenView } from '../components/garden'

export function GardenViewPage() {
  return <GardenView />
}
```

**Step 2: Commit**

```bash
git add src/views/GardenViewPage.tsx
git commit -m "feat: add Garden view page wrapper"
```

---

### Task 18: Session Flow & Main App

**Files:**
- Create: `src/views/index.ts`
- Modify: `src/App.tsx`

**Step 1: Create views index**

Create `src/views/index.ts`:
```typescript
export { PracticeView } from './PracticeView'
export { LearnView } from './LearnView'
export { GardenViewPage } from './GardenViewPage'
```

**Step 2: Update App.tsx**

Replace `src/App.tsx`:
```tsx
import { useEffect } from 'react'
import { useProgressStore, useGardenStore, useSessionStore } from './stores'
import { Layout } from './components/common'
import { PracticeView, LearnView, GardenViewPage } from './views'

function App() {
  const { initialize: initProgress, initialized } = useProgressStore()
  const { initialize: initGarden } = useGardenStore()
  const { mode } = useSessionStore()

  useEffect(() => {
    initProgress()
    initGarden()
  }, [initProgress, initGarden])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-garden-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      {mode === 'learn' && <LearnView />}
      {mode === 'practice' && <PracticeView />}
      {mode === 'garden' && <GardenViewPage />}
    </Layout>
  )
}

export default App
```

**Step 3: Verify app runs**

```bash
bun run dev
```

Expected: App loads, shows Practice view with a problem, can navigate between modes.

**Step 4: Commit**

```bash
git add src/views/index.ts src/App.tsx
git commit -m "feat: wire up main App with all views and session flow"
```

---

## Phase 5: Polish

> **PARALLEL EXECUTION:** Tasks 19-21 can run simultaneously.

### Task 19: Animations & Celebrations (Stream A)

**Files:**
- Create: `src/components/common/Celebration.tsx`
- Modify: `src/views/PracticeView.tsx` (add celebration)

**Step 1: Create Celebration component**

Create `src/components/common/Celebration.tsx`:
```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Sparkles } from 'lucide-react'

type CelebrationProps = {
  show: boolean
  type?: 'correct' | 'streak' | 'goal'
}

export function Celebration({ show, type = 'correct' }: CelebrationProps) {
  const particles = type === 'goal' ? 20 : type === 'streak' ? 12 : 6

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: particles }).map((_, i) => {
            const isLeft = i % 2 === 0
            const Icon = type === 'goal' ? Star : Sparkles

            return (
              <motion.div
                key={i}
                initial={{
                  x: isLeft ? -50 : window.innerWidth + 50,
                  y: window.innerHeight / 2,
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  x: window.innerWidth / 2 + (Math.random() - 0.5) * 300,
                  y: Math.random() * window.innerHeight * 0.5,
                  scale: [0, 1.5, 1],
                  rotate: Math.random() * 360,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.03,
                  ease: 'easeOut',
                }}
                className="absolute"
              >
                <Icon
                  size={type === 'goal' ? 32 : 24}
                  className={
                    type === 'goal'
                      ? 'text-warm-400 fill-warm-400'
                      : type === 'streak'
                      ? 'text-garden-400'
                      : 'text-sky-400'
                  }
                />
              </motion.div>
            )
          })}
        </div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Update common index**

Add to `src/components/common/index.ts`:
```typescript
export { Celebration } from './Celebration'
```

**Step 3: Commit**

```bash
git add src/components/common/Celebration.tsx src/components/common/index.ts
git commit -m "feat: add celebration animations"
```

---

### Task 20: Sound Effects (Stream B)

**Files:**
- Create: `src/lib/sounds.ts`
- Create: `src/hooks/useSound.ts`

**Step 1: Create sounds utility**

Create `src/lib/sounds.ts`:
```typescript
// Simple audio context for sound effects
// Using Web Audio API for low-latency playback

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (e) {
    // Ignore audio errors (user hasn't interacted yet, etc.)
  }
}

export const sounds = {
  correct: () => {
    playTone(523.25, 0.1) // C5
    setTimeout(() => playTone(659.25, 0.15), 100) // E5
  },

  wrong: () => {
    playTone(311.13, 0.2, 'triangle') // Eb4 - gentle
  },

  streak: () => {
    playTone(523.25, 0.08)
    setTimeout(() => playTone(659.25, 0.08), 80)
    setTimeout(() => playTone(783.99, 0.12), 160) // G5
  },

  goalComplete: () => {
    playTone(523.25, 0.1)
    setTimeout(() => playTone(659.25, 0.1), 100)
    setTimeout(() => playTone(783.99, 0.1), 200)
    setTimeout(() => playTone(1046.50, 0.2), 300) // C6
  },

  click: () => {
    playTone(800, 0.05, 'square')
  },
}

export type SoundName = keyof typeof sounds
```

**Step 2: Create useSound hook**

Create `src/hooks/useSound.ts`:
```typescript
import { useCallback } from 'react'
import { sounds, SoundName } from '../lib/sounds'

export function useSound() {
  const play = useCallback((sound: SoundName) => {
    sounds[sound]()
  }, [])

  return { play }
}
```

**Step 3: Create hooks index**

Create `src/hooks/index.ts`:
```typescript
export { useSound } from './useSound'
```

**Step 4: Commit**

```bash
git add src/lib/sounds.ts src/hooks
git commit -m "feat: add sound effects using Web Audio API"
```

---

### Task 21: PWA Setup (Stream C)

**Files:**
- Modify: `vite.config.ts`
- Create: `public/manifest.json`
- Modify: `index.html`

**Step 1: Install PWA plugin**

```bash
bun add -d vite-plugin-pwa
```

**Step 2: Update vite.config.ts**

Replace `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Times Table Tutor',
        short_name: 'Times Tables',
        description: 'Learn times tables at your own pace',
        theme_color: '#22c55e',
        background_color: '#f0fdf4',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
```

**Step 3: Update index.html**

Add to `<head>` in `index.html`:
```html
<meta name="theme-color" content="#22c55e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Times Tables" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

**Step 4: Create placeholder icons**

Note: For now, create simple placeholder files. Replace with real icons later.

```bash
# Create simple placeholder (in real implementation, use actual icon files)
echo "Placeholder" > public/pwa-192x192.png
echo "Placeholder" > public/pwa-512x512.png
echo "Placeholder" > public/apple-touch-icon.png
```

**Step 5: Commit**

```bash
git add vite.config.ts index.html public/
git commit -m "feat: configure PWA with offline support"
```

---

## Phase 6: Final

### Task 22: Mobile Testing & Final Polish

**Files:**
- Modify: Various files for fixes found during testing

**Step 1: Run build and check for errors**

```bash
bun run build
```

Fix any TypeScript or build errors.

**Step 2: Test on mobile viewport**

```bash
bun run dev
```

Open Chrome DevTools, toggle device toolbar, test on:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- iPad (768px)

**Step 3: Verify core flows**

1. Practice mode: Answer questions, check hint works, verify rewards
2. Learn mode: Browse tables, open visual explainer
3. Garden mode: View items, drag to reposition

**Step 4: Fix any issues found**

Document and fix issues as separate commits.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final polish and mobile fixes"
```

---

## Summary

**Parallelization opportunities:**
- Phase 2: Three streams (Data Layer, Learning Engine, Garden Logic)
- Phase 3: Three streams (Common UI, Practice UI, Learn/Garden UI)
- Phase 5: Three streams (Animations, Sounds, PWA)

**Key files:**
- Stores: `src/stores/` - Zustand state management
- Logic: `src/lib/` - Adaptive algorithm, strategies, rewards
- Components: `src/components/` - Reusable UI pieces
- Views: `src/views/` - Page-level components

**Testing commands:**
- `bun run dev` - Start dev server
- `bun run build` - Production build
- `bun run preview` - Preview production build
