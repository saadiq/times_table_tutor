# Progress View Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Learn view's Overview mode into a parent-friendly progress dashboard with mastery grid and activity calendar.

**Architecture:** Offline-first attempt tracking with cloud sync. Store attempts locally, sync to D1 when online. UI shows 12x12 mastery grid + GitHub-style activity calendar.

**Tech Stack:** React 19, Zustand, Tailwind CSS v4, Framer Motion, Cloudflare Pages Functions, D1 (SQLite)

---

## Parallelization Map

```
Phase 1 (Parallel):
├── Task 1: Add AttemptRecord type
└── Task 2: Add D1 attempts table

Phase 2 (Parallel, after Phase 1):
├── Task 3: Create attemptsStore (local-only first)
└── Task 4: Create API endpoints

Phase 3 (Parallel, after Task 3):
├── Task 5: Create MasteryGrid component
├── Task 6: Create ActivityCalendar component
├── Task 7: Create FactDetailSheet component
└── Task 8: Create SyncStatusBadge component

Phase 4 (Sequential, after Phase 3):
├── Task 9: Integrate attempt recording in PracticeView
└── Task 10: Replace LearnView Overview with Progress tab

Phase 5 (Sequential, after Phase 4):
├── Task 11: Add cloud sync to attemptsStore
└── Task 12: End-to-end testing
```

---

## Phase 1: Foundation (Parallel)

### Task 1: Add AttemptRecord Type

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add AttemptRecord and InputMethod types**

Add to `src/types/index.ts` after the Strategy type:

```typescript
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
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add AttemptRecord and DailySummary types"
```

---

### Task 2: Add D1 Attempts Table

**Files:**
- Modify: `schema.sql`

**Step 1: Add attempts table to schema**

Add to `schema.sql` after profile_stats table:

```sql
-- Attempt history (for progress tracking)
CREATE TABLE IF NOT EXISTS attempts (
  id              TEXT PRIMARY KEY,
  profile_id      TEXT NOT NULL,
  fact_key        TEXT NOT NULL,
  timestamp       INTEGER NOT NULL,
  correct         INTEGER NOT NULL,
  response_time_ms INTEGER,
  input_method    TEXT,
  hint_shown      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attempts_profile_timestamp
  ON attempts(profile_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_profile_date
  ON attempts(profile_id, timestamp);
```

**Step 2: Apply migration locally**

Run: `bun run db:migrate:local`
Expected: Migration succeeds

**Step 3: Commit**

```bash
git add schema.sql
git commit -m "feat(db): add attempts table for history tracking"
```

---

## Phase 2: Data Layer (Parallel, after Phase 1)

### Task 3: Create attemptsStore (Local-Only)

**Files:**
- Create: `src/stores/attemptsStore.ts`
- Modify: `src/stores/index.ts`

**Step 1: Create the attempts store**

Create `src/stores/attemptsStore.ts`:

```typescript
import { create } from 'zustand'
import type { AttemptRecord, DailySummary, InputMethod } from '../types'
import { saveToStorage, loadFromStorage } from '../lib/storage'

const STORAGE_KEY = 'ttt_attempts'
const PENDING_KEY = 'ttt_pending_attempts'
const MAX_LOCAL_DAYS = 30

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

type AttemptsState = {
  attempts: AttemptRecord[]
  pendingSync: AttemptRecord[]
  syncStatus: SyncStatus
  lastSyncTimestamp: string | null
}

type AttemptsActions = {
  initialize: () => void
  recordAttempt: (params: {
    factKey: string
    correct: boolean
    responseTimeMs: number
    inputMethod: InputMethod
    hintShown: boolean
    profileId?: string
  }) => void
  getAttemptsByDate: (date: string) => AttemptRecord[]
  getDailySummaries: (days: number) => DailySummary[]
  getFactAttempts: (factKey: string) => AttemptRecord[]
  getStreakDays: () => number
  getTodayStats: () => { attempts: number; correct: number; accuracy: number }
  clearOldAttempts: () => void
}

function generateId(): string {
  return crypto.randomUUID()
}

function getDateKey(timestamp: string): string {
  return timestamp.split('T')[0]
}

function isWithinDays(timestamp: string, days: number): boolean {
  const date = new Date(timestamp)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}

export const useAttemptsStore = create<AttemptsState & AttemptsActions>(
  (set, get) => ({
    attempts: [],
    pendingSync: [],
    syncStatus: 'offline',
    lastSyncTimestamp: null,

    initialize: () => {
      const saved = loadFromStorage<AttemptRecord[]>(STORAGE_KEY) || []
      const pending = loadFromStorage<AttemptRecord[]>(PENDING_KEY) || []
      set({ attempts: saved, pendingSync: pending })
    },

    recordAttempt: (params) => {
      const attempt: AttemptRecord = {
        id: generateId(),
        factKey: params.factKey,
        timestamp: new Date().toISOString(),
        correct: params.correct,
        responseTimeMs: params.responseTimeMs,
        inputMethod: params.inputMethod,
        hintShown: params.hintShown,
        profileId: params.profileId,
      }

      set((state) => {
        const attempts = [...state.attempts, attempt]
        const pendingSync = [...state.pendingSync, attempt]
        saveToStorage(STORAGE_KEY, attempts)
        saveToStorage(PENDING_KEY, pendingSync)
        return { attempts, pendingSync }
      })
    },

    getAttemptsByDate: (date) => {
      return get().attempts.filter((a) => getDateKey(a.timestamp) === date)
    },

    getDailySummaries: (days) => {
      const attempts = get().attempts
      const summaries: Map<string, DailySummary> = new Map()

      for (const attempt of attempts) {
        if (!isWithinDays(attempt.timestamp, days)) continue

        const date = getDateKey(attempt.timestamp)
        const existing = summaries.get(date) || {
          date,
          attemptCount: 0,
          correctCount: 0,
          factsAttempted: [],
          newMastered: [],
        }

        existing.attemptCount++
        if (attempt.correct) existing.correctCount++
        if (!existing.factsAttempted.includes(attempt.factKey)) {
          existing.factsAttempted.push(attempt.factKey)
        }

        summaries.set(date, existing)
      }

      return Array.from(summaries.values()).sort(
        (a, b) => b.date.localeCompare(a.date)
      )
    },

    getFactAttempts: (factKey) => {
      return get().attempts.filter((a) => a.factKey === factKey)
    },

    getStreakDays: () => {
      const summaries = get().getDailySummaries(365)
      if (summaries.length === 0) return 0

      let streak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateKey = checkDate.toISOString().split('T')[0]

        const hasPractice = summaries.some((s) => s.date === dateKey)
        if (hasPractice) {
          streak++
        } else if (i > 0) {
          break
        }
      }

      return streak
    },

    getTodayStats: () => {
      const today = new Date().toISOString().split('T')[0]
      const todayAttempts = get().getAttemptsByDate(today)
      const correct = todayAttempts.filter((a) => a.correct).length
      return {
        attempts: todayAttempts.length,
        correct,
        accuracy: todayAttempts.length > 0
          ? Math.round((correct / todayAttempts.length) * 100)
          : 0,
      }
    },

    clearOldAttempts: () => {
      set((state) => {
        const filtered = state.attempts.filter((a) =>
          isWithinDays(a.timestamp, MAX_LOCAL_DAYS)
        )
        saveToStorage(STORAGE_KEY, filtered)
        return { attempts: filtered }
      })
    },
  })
)
```

**Step 2: Export from stores index**

Add to `src/stores/index.ts`:

```typescript
export { useAttemptsStore } from './attemptsStore'
```

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/stores/attemptsStore.ts src/stores/index.ts
git commit -m "feat(store): add attemptsStore for tracking attempt history"
```

---

### Task 4: Create API Endpoints

**Files:**
- Create: `functions/api/attempts/index.ts`
- Create: `functions/api/attempts/sync.ts`

**Step 1: Create GET /api/attempts endpoint**

Create `functions/api/attempts/index.ts`:

```typescript
interface Env {
  DB: D1Database
}

interface AttemptRow {
  id: string
  profile_id: string
  fact_key: string
  timestamp: number
  correct: number
  response_time_ms: number | null
  input_method: string | null
  hint_shown: number
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const profileId = url.searchParams.get('profileId')
  const since = url.searchParams.get('since')

  if (!profileId) {
    return Response.json({ error: 'profileId required' }, { status: 400 })
  }

  let query = `
    SELECT id, profile_id, fact_key, timestamp, correct,
           response_time_ms, input_method, hint_shown
    FROM attempts
    WHERE profile_id = ?
  `
  const params: (string | number)[] = [profileId]

  if (since) {
    query += ' AND timestamp > ?'
    params.push(parseInt(since))
  }

  query += ' ORDER BY timestamp DESC LIMIT 1000'

  const { results } = await env.DB.prepare(query).bind(...params).all<AttemptRow>()

  const attempts = results.map((row) => ({
    id: row.id,
    factKey: row.fact_key,
    timestamp: new Date(row.timestamp).toISOString(),
    correct: row.correct === 1,
    responseTimeMs: row.response_time_ms,
    inputMethod: row.input_method,
    hintShown: row.hint_shown === 1,
    profileId: row.profile_id,
  }))

  return Response.json({ attempts })
}
```

**Step 2: Create POST /api/attempts/sync endpoint**

Create `functions/api/attempts/sync.ts`:

```typescript
interface Env {
  DB: D1Database
}

interface AttemptPayload {
  id: string
  factKey: string
  timestamp: string
  correct: boolean
  responseTimeMs: number
  inputMethod: string
  hintShown: boolean
  profileId: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { attempts } = await request.json<{ attempts: AttemptPayload[] }>()

  if (!attempts || !Array.isArray(attempts)) {
    return Response.json({ error: 'attempts array required' }, { status: 400 })
  }

  if (attempts.length === 0) {
    return Response.json({ synced: 0 })
  }

  const stmt = env.DB.prepare(`
    INSERT OR IGNORE INTO attempts
      (id, profile_id, fact_key, timestamp, correct, response_time_ms, input_method, hint_shown)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const batch = attempts.map((a) =>
    stmt.bind(
      a.id,
      a.profileId,
      a.factKey,
      new Date(a.timestamp).getTime(),
      a.correct ? 1 : 0,
      a.responseTimeMs,
      a.inputMethod,
      a.hintShown ? 1 : 0
    )
  )

  await env.DB.batch(batch)

  return Response.json({ synced: attempts.length })
}
```

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add functions/api/attempts/
git commit -m "feat(api): add attempts sync and fetch endpoints"
```

---

## Phase 3: UI Components (Parallel, after Task 3)

### Task 5: Create MasteryGrid Component

**Files:**
- Create: `src/components/progress/MasteryGrid.tsx`
- Create: `src/components/progress/index.ts`

**Step 1: Create the MasteryGrid component**

Create `src/components/progress/MasteryGrid.tsx`:

```typescript
import { motion } from 'framer-motion'
import { useProgressStore } from '../../stores'
import type { Confidence, FactProgress } from '../../types'
import { TIMES_TABLES } from '../../lib/constants'

type MasteryGridProps = {
  onFactSelect: (fact: FactProgress) => void
}

const confidenceColors: Record<Confidence, string> = {
  new: 'bg-gray-200',
  learning: 'bg-warm-300',
  confident: 'bg-garden-300',
  mastered: 'bg-garden-500',
}

const confidenceBorders: Record<Confidence, string> = {
  new: 'border-gray-300',
  learning: 'border-warm-400',
  confident: 'border-garden-400',
  mastered: 'border-garden-600',
}

export function MasteryGrid({ onFactSelect }: MasteryGridProps) {
  const { facts, getFactsByConfidence } = useProgressStore()

  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  const masteredCount = getFactsByConfidence('mastered').length
  const learningCount = getFactsByConfidence('learning').length
  const confidentCount = getFactsByConfidence('confident').length
  const newCount = getFactsByConfidence('new').length
  const totalFacts = Object.keys(facts).length

  const masteryPercent = totalFacts > 0
    ? Math.round((masteredCount / totalFacts) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          {masteryPercent}% Mastered
        </span>
        <div className="flex gap-3 text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-garden-500" />
            {masteredCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-garden-300" />
            {confidentCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warm-300" />
            {learningCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-200" />
            {newCount}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="inline-block min-w-full">
          {/* Header row */}
          <div className="flex gap-0.5 mb-0.5">
            <div className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">
              ×
            </div>
            {tables.map((col) => (
              <div
                key={col}
                className="w-7 h-7 flex items-center justify-center text-xs font-medium text-gray-500"
              >
                {col}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {tables.map((row) => (
            <div key={row} className="flex gap-0.5 mb-0.5">
              <div className="w-7 h-7 flex items-center justify-center text-xs font-medium text-gray-500">
                {row}
              </div>
              {tables.map((col) => {
                const factKey = `${row}x${col}`
                const fact = facts[factKey]
                if (!fact) return null

                return (
                  <motion.button
                    key={factKey}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFactSelect(fact)}
                    className={`w-7 h-7 rounded border ${confidenceColors[fact.confidence]} ${confidenceBorders[fact.confidence]} transition-colors`}
                    title={`${row} × ${col} = ${fact.answer}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-gray-500 pt-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border bg-gray-200 border-gray-300" />
          New
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border bg-warm-300 border-warm-400" />
          Learning
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border bg-garden-300 border-garden-400" />
          Confident
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border bg-garden-500 border-garden-600" />
          Mastered
        </span>
      </div>
    </div>
  )
}
```

**Step 2: Create index export**

Create `src/components/progress/index.ts`:

```typescript
export { MasteryGrid } from './MasteryGrid'
```

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/progress/
git commit -m "feat(ui): add MasteryGrid component for 12x12 fact visualization"
```

---

### Task 6: Create ActivityCalendar Component

**Files:**
- Modify: `src/components/progress/ActivityCalendar.tsx`
- Modify: `src/components/progress/index.ts`

**Step 1: Create the ActivityCalendar component**

Create `src/components/progress/ActivityCalendar.tsx`:

```typescript
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAttemptsStore } from '../../stores'
import type { DailySummary } from '../../types'

const WEEKS_TO_SHOW = 15
const DAYS_PER_WEEK = 7

function getIntensity(count: number): string {
  if (count === 0) return 'bg-gray-100'
  if (count <= 10) return 'bg-garden-200'
  if (count <= 25) return 'bg-garden-400'
  return 'bg-garden-600'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function ActivityCalendar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DailySummary | null>(null)
  const { getDailySummaries, getStreakDays, getTodayStats } = useAttemptsStore()

  const summaries = getDailySummaries(WEEKS_TO_SHOW * 7)
  const summaryMap = new Map(summaries.map((s) => [s.date, s]))
  const streak = getStreakDays()
  const todayStats = getTodayStats()

  // Generate calendar grid (most recent on right)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()

  const cells: { date: string; summary: DailySummary | null }[] = []
  const totalDays = WEEKS_TO_SHOW * 7 + dayOfWeek

  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    cells.push({ date: dateKey, summary: summaryMap.get(dateKey) || null })
  }

  // Organize into weeks (columns)
  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="space-y-3">
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm text-gray-600"
      >
        <span className="font-medium">Activity</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">
            {streak} day streak
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Stats row (always visible) */}
      <div className="flex gap-4 text-sm">
        <div className="flex-1 bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-garden-600">
            {todayStats.attempts}
          </div>
          <div className="text-xs text-gray-500">Today</div>
        </div>
        <div className="flex-1 bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-garden-600">
            {todayStats.accuracy}%
          </div>
          <div className="text-xs text-gray-500">Accuracy</div>
        </div>
        <div className="flex-1 bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-garden-600">{streak}</div>
          <div className="text-xs text-gray-500">Streak</div>
        </div>
      </div>

      {/* Expandable calendar */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {/* Day labels */}
              <div className="flex gap-0.5 mb-1">
                <div className="w-6" />
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 text-[10px] text-gray-400 text-center"
                  >
                    {i % 2 === 1 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="flex gap-0.5 overflow-x-auto pb-2">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((cell, di) => (
                      <button
                        key={cell.date}
                        onClick={() =>
                          setSelectedDay(
                            cell.summary || {
                              date: cell.date,
                              attemptCount: 0,
                              correctCount: 0,
                              factsAttempted: [],
                              newMastered: [],
                            }
                          )
                        }
                        className={`w-4 h-4 rounded-sm ${getIntensity(cell.summary?.attemptCount || 0)} transition-colors hover:ring-1 hover:ring-garden-500`}
                        title={`${formatDate(cell.date)}: ${cell.summary?.attemptCount || 0} attempts`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex justify-end items-center gap-1 text-[10px] text-gray-400 mt-1">
                <span>Less</span>
                <span className="w-3 h-3 rounded-sm bg-gray-100" />
                <span className="w-3 h-3 rounded-sm bg-garden-200" />
                <span className="w-3 h-3 rounded-sm bg-garden-400" />
                <span className="w-3 h-3 rounded-sm bg-garden-600" />
                <span>More</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected day detail */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-lg p-3 text-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium">{formatDate(selectedDay.date)}</span>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>
                Facts practiced: <strong>{selectedDay.attemptCount}</strong>
              </div>
              <div>
                Accuracy:{' '}
                <strong>
                  {selectedDay.attemptCount > 0
                    ? Math.round(
                        (selectedDay.correctCount / selectedDay.attemptCount) *
                          100
                      )
                    : 0}
                  %
                </strong>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Export from index**

Update `src/components/progress/index.ts`:

```typescript
export { MasteryGrid } from './MasteryGrid'
export { ActivityCalendar } from './ActivityCalendar'
```

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/progress/
git commit -m "feat(ui): add ActivityCalendar component with heat map"
```

---

### Task 7: Create FactDetailSheet Component

**Files:**
- Create: `src/components/progress/FactDetailSheet.tsx`
- Modify: `src/components/progress/index.ts`

**Step 1: Create the FactDetailSheet component**

Create `src/components/progress/FactDetailSheet.tsx`:

```typescript
import { motion } from 'framer-motion'
import { X, TrendingUp, Clock, Target } from 'lucide-react'
import { useAttemptsStore } from '../../stores'
import type { FactProgress } from '../../types'

type FactDetailSheetProps = {
  fact: FactProgress
  onClose: () => void
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

const confidenceLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'text-gray-500' },
  learning: { label: 'Learning', color: 'text-warm-600' },
  confident: { label: 'Confident', color: 'text-garden-500' },
  mastered: { label: 'Mastered', color: 'text-garden-600' },
}

export function FactDetailSheet({ fact, onClose }: FactDetailSheetProps) {
  const { getFactAttempts } = useAttemptsStore()
  const attempts = getFactAttempts(fact.fact)

  const totalAttempts = fact.correctCount + fact.incorrectCount
  const accuracy =
    totalAttempts > 0
      ? Math.round((fact.correctCount / totalAttempts) * 100)
      : 0

  const recentAttempts = attempts.slice(-10)
  const avgResponseTime =
    recentAttempts.length > 0
      ? Math.round(
          recentAttempts.reduce((sum, a) => sum + a.responseTimeMs, 0) /
            recentAttempts.length
        )
      : null

  const inputMethodTrend =
    recentAttempts.length > 0
      ? recentAttempts.filter((a) => a.inputMethod === 'number_pad').length /
        recentAttempts.length
      : 0

  const { label: statusLabel, color: statusColor } =
    confidenceLabels[fact.confidence]

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[70vh] overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              {fact.a} × {fact.b} = {fact.answer}
            </h2>
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Target size={20} className="mx-auto mb-1 text-garden-500" />
              <div className="text-xl font-bold text-gray-800">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <TrendingUp size={20} className="mx-auto mb-1 text-garden-500" />
              <div className="text-xl font-bold text-gray-800">
                {totalAttempts}
              </div>
              <div className="text-xs text-gray-500">Attempts</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Clock size={20} className="mx-auto mb-1 text-garden-500" />
              <div className="text-xl font-bold text-gray-800">
                {avgResponseTime ? `${(avgResponseTime / 1000).toFixed(1)}s` : '-'}
              </div>
              <div className="text-xs text-gray-500">Avg Time</div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Last practiced</span>
              <span className="text-gray-800">
                {formatRelativeTime(fact.lastSeen)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Input method</span>
              <span className="text-gray-800">
                {inputMethodTrend >= 0.5 ? 'Number pad' : 'Multiple choice'}
              </span>
            </div>
            {fact.recentAttempts.length > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Recent streak</span>
                <div className="flex gap-1">
                  {fact.recentAttempts.map((correct, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        correct ? 'bg-garden-500' : 'bg-warm-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
```

**Step 2: Export from index**

Update `src/components/progress/index.ts`:

```typescript
export { MasteryGrid } from './MasteryGrid'
export { ActivityCalendar } from './ActivityCalendar'
export { FactDetailSheet } from './FactDetailSheet'
```

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/progress/
git commit -m "feat(ui): add FactDetailSheet bottom sheet component"
```

---

### Task 8: Create SyncStatusBadge Component

**Files:**
- Create: `src/components/progress/SyncStatusBadge.tsx`
- Modify: `src/components/progress/index.ts`

**Step 1: Create the SyncStatusBadge component**

Create `src/components/progress/SyncStatusBadge.tsx`:

```typescript
import { motion } from 'framer-motion'
import { Check, Loader2, Cloud, CloudOff } from 'lucide-react'
import { useAttemptsStore } from '../../stores'

export function SyncStatusBadge() {
  const { syncStatus, pendingSync } = useAttemptsStore()

  const config = {
    synced: {
      icon: Check,
      color: 'text-garden-500',
      bg: 'bg-garden-50',
      label: 'Synced',
    },
    syncing: {
      icon: Loader2,
      color: 'text-sky-500',
      bg: 'bg-sky-50',
      label: 'Syncing...',
    },
    offline: {
      icon: CloudOff,
      color: 'text-gray-400',
      bg: 'bg-gray-100',
      label: 'Offline',
    },
    error: {
      icon: Cloud,
      color: 'text-warm-500',
      bg: 'bg-warm-50',
      label: 'Sync failed',
    },
  }

  const { icon: Icon, color, bg, label } = config[syncStatus]
  const hasPending = pendingSync.length > 0

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${bg} ${color}`}
      title={hasPending ? `${pendingSync.length} pending` : label}
    >
      <motion.div
        animate={syncStatus === 'syncing' ? { rotate: 360 } : {}}
        transition={
          syncStatus === 'syncing'
            ? { repeat: Infinity, duration: 1, ease: 'linear' }
            : {}
        }
      >
        <Icon size={12} />
      </motion.div>
      {hasPending && syncStatus !== 'syncing' && (
        <span className="font-medium">{pendingSync.length}</span>
      )}
    </div>
  )
}
```

**Step 2: Export from index**

Update `src/components/progress/index.ts`:

```typescript
export { MasteryGrid } from './MasteryGrid'
export { ActivityCalendar } from './ActivityCalendar'
export { FactDetailSheet } from './FactDetailSheet'
export { SyncStatusBadge } from './SyncStatusBadge'
```

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/progress/
git commit -m "feat(ui): add SyncStatusBadge component"
```

---

## Phase 4: Integration (Sequential, after Phase 3)

### Task 9: Integrate Attempt Recording in PracticeView

**Files:**
- Modify: `src/views/PracticeView.tsx`
- Modify: `src/App.tsx` (to initialize attemptsStore)

**Step 1: Initialize attemptsStore in App.tsx**

In `src/App.tsx`, find where stores are initialized and add:

```typescript
import { useAttemptsStore } from './stores'

// Inside the component, alongside other store initializations:
const initializeAttempts = useAttemptsStore((s) => s.initialize)

useEffect(() => {
  // ... existing initializations
  initializeAttempts()
}, [])
```

**Step 2: Update PracticeView to record attempts**

In `src/views/PracticeView.tsx`:

Add import:
```typescript
import { useAttemptsStore } from '../stores'
```

Inside PracticeView function, add:
```typescript
const recordAttemptHistory = useAttemptsStore((s) => s.recordAttempt)
const activeProfile = useProfileStore((s) => s.activeProfile)
```

Add state for tracking start time:
```typescript
const [attemptStartTime, setAttemptStartTime] = useState<number>(Date.now())
```

In `nextProblem`, reset the start time:
```typescript
const nextProblem = useCallback(() => {
  const next = selectNextFact(facts, recentFacts, activeFocusTables)
  if (next) {
    setCurrentFact(next)
    setRecentFacts(prev => [...prev.slice(-10), next.fact])
    setSelectedAnswer(null)
    setShowResult(false)
    setShowHint(false)
    setMessage(null)
    setAttemptStartTime(Date.now()) // Add this line
  }
}, [facts, recentFacts, activeFocusTables])
```

Modify `handleAnswer` to record to attempts store after the `recordAttempt` call:
```typescript
const handleAnswer = (answer: number) => {
  if (!currentFact || showResult) return

  setSelectedAnswer(answer)
  setShowResult(true)

  const isCorrect = answer === currentFact.answer
  const responseTimeMs = Date.now() - attemptStartTime

  // Determine input method
  const inputMethod = shouldUseMultipleChoice(currentFact)
    ? 'multiple_choice'
    : 'number_pad'

  recordAttempt(currentFact.fact, isCorrect)

  // Record to attempt history
  recordAttemptHistory({
    factKey: currentFact.fact,
    correct: isCorrect,
    responseTimeMs,
    inputMethod,
    hintShown: showHint,
    profileId: activeProfile?.id,
  })

  // ... rest of the function unchanged
}
```

Add import for shouldUseMultipleChoice:
```typescript
import { selectNextFact, shouldUseMultipleChoice } from '../lib/adaptive'
```

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Test locally**

Run: `bun run dev`
- Practice a few facts
- Check localStorage for `ttt_attempts` key
Expected: Attempts are being recorded

**Step 5: Commit**

```bash
git add src/views/PracticeView.tsx src/App.tsx
git commit -m "feat: integrate attempt history recording in PracticeView"
```

---

### Task 10: Replace LearnView Overview with Progress Tab

**Files:**
- Modify: `src/views/LearnView.tsx`

**Step 1: Rewrite LearnView with tabs**

Replace `src/views/LearnView.tsx` with:

```typescript
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, BarChart3 } from 'lucide-react'
import { useProgressStore, useAttemptsStore } from '../stores'
import { FactCard, VisualExplainer } from '../components/learn'
import {
  MasteryGrid,
  ActivityCalendar,
  FactDetailSheet,
  SyncStatusBadge,
} from '../components/progress'
import type { FactProgress } from '../types'
import { TIMES_TABLES } from '../lib/constants'

type Tab = 'learn' | 'progress'

export function LearnView() {
  const { facts } = useProgressStore()
  const { getStreakDays } = useAttemptsStore()
  const [activeTab, setActiveTab] = useState<Tab>('learn')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedFact, setSelectedFact] = useState<FactProgress | null>(null)
  const [detailFact, setDetailFact] = useState<FactProgress | null>(null)

  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  const getTableFacts = (table: number) =>
    Object.values(facts).filter((f) => f.a === table)

  const getTableMastery = (table: number) => {
    const tableFacts = getTableFacts(table)
    const mastered = tableFacts.filter((f) => f.confidence === 'mastered').length
    return Math.round((mastered / tableFacts.length) * 100)
  }

  const streak = getStreakDays()

  return (
    <div className="flex-1 flex flex-col">
      {/* Tab header */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex">
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'learn'
                ? 'text-garden-600 border-b-2 border-garden-500'
                : 'text-gray-500'
            }`}
          >
            <BookOpen size={18} />
            Learn
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'progress'
                ? 'text-garden-600 border-b-2 border-garden-500'
                : 'text-gray-500'
            }`}
          >
            <BarChart3 size={18} />
            Progress
            {streak > 0 && (
              <span className="bg-garden-100 text-garden-600 text-xs px-1.5 py-0.5 rounded-full">
                {streak}d
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'learn' ? (
          <div className="p-4">
            {/* Table selector */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Choose a Times Table
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {tables.map((table) => {
                  const mastery = getTableMastery(table)
                  const isSelected = selectedTable === table
                  return (
                    <button
                      key={table}
                      onClick={() =>
                        setSelectedTable(isSelected ? null : table)
                      }
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
            {selectedTable && (
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
                  {getTableFacts(selectedTable).map((fact) => (
                    <FactCard
                      key={fact.fact}
                      fact={fact}
                      onClick={() => setSelectedFact(fact)}
                    />
                  ))}
                </div>
              </>
            )}

            {!selectedTable && (
              <p className="text-gray-500 text-center py-8">
                Select a times table above to start learning
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Sync status */}
            <div className="flex justify-end">
              <SyncStatusBadge />
            </div>

            {/* Mastery grid */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                Mastery Overview
              </h3>
              <MasteryGrid onFactSelect={setDetailFact} />
            </div>

            {/* Activity calendar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <ActivityCalendar />
            </div>
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

      {/* Fact detail sheet */}
      <AnimatePresence>
        {detailFact && (
          <FactDetailSheet
            fact={detailFact}
            onClose={() => setDetailFact(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Test locally**

Run: `bun run dev`
- Navigate to Learn view
- Switch between Learn and Progress tabs
- Click cells in mastery grid to see detail sheet
- Expand activity calendar
Expected: All components render and interact correctly

**Step 4: Commit**

```bash
git add src/views/LearnView.tsx
git commit -m "feat: replace LearnView Overview with Progress tab dashboard"
```

---

## Phase 5: Cloud Sync (Sequential, after Phase 4)

### Task 11: Add Cloud Sync to attemptsStore

**Files:**
- Modify: `src/stores/attemptsStore.ts`

**Step 1: Add sync methods to attemptsStore**

Update `src/stores/attemptsStore.ts` to add sync functionality.

Add to AttemptsActions type:
```typescript
syncToCloud: (profileId: string) => Promise<void>
fetchFromCloud: (profileId: string) => Promise<void>
```

Add implementation:
```typescript
syncToCloud: async (profileId) => {
  const { pendingSync } = get()
  if (pendingSync.length === 0) return

  set({ syncStatus: 'syncing' })

  try {
    const response = await fetch('/api/attempts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attempts: pendingSync.map((a) => ({ ...a, profileId })),
      }),
    })

    if (!response.ok) throw new Error('Sync failed')

    set({ pendingSync: [], syncStatus: 'synced' })
    saveToStorage(PENDING_KEY, [])
  } catch {
    set({ syncStatus: 'error' })
  }
},

fetchFromCloud: async (profileId) => {
  const { lastSyncTimestamp } = get()

  try {
    const url = new URL('/api/attempts', window.location.origin)
    url.searchParams.set('profileId', profileId)
    if (lastSyncTimestamp) {
      url.searchParams.set('since', String(new Date(lastSyncTimestamp).getTime()))
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error('Fetch failed')

    const { attempts: cloudAttempts } = await response.json()

    set((state) => {
      const existingIds = new Set(state.attempts.map((a) => a.id))
      const newAttempts = cloudAttempts.filter(
        (a: AttemptRecord) => !existingIds.has(a.id)
      )
      const merged = [...state.attempts, ...newAttempts].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      saveToStorage(STORAGE_KEY, merged)
      return {
        attempts: merged,
        lastSyncTimestamp: new Date().toISOString(),
        syncStatus: 'synced',
      }
    })
  } catch {
    set({ syncStatus: 'offline' })
  }
},
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/stores/attemptsStore.ts
git commit -m "feat: add cloud sync methods to attemptsStore"
```

---

### Task 12: End-to-End Testing

**Files:** None (testing only)

**Step 1: Start local dev servers**

Terminal 1:
```bash
bun run dev
```

Terminal 2:
```bash
bun run dev:api
```

**Step 2: Test attempt recording**

1. Create or select a profile
2. Go to Practice
3. Answer several facts (both correct and incorrect)
4. Check browser DevTools → Application → Local Storage
   - Should see `ttt_attempts` with recorded attempts
   - Should see `ttt_pending_attempts` with pending sync items

**Step 3: Test Progress tab**

1. Go to Learn → Progress tab
2. Verify mastery grid shows correct colors for fact states
3. Click on a grid cell → verify detail sheet appears
4. Expand activity calendar → verify heat map shows today's activity
5. Verify streak counter updates

**Step 4: Test cloud sync (if API is running)**

1. Practice a few facts
2. Check Network tab for POST to `/api/attempts/sync`
3. Refresh the page
4. Verify attempts persist from cloud fetch

**Step 5: Build verification**

```bash
bun run build
bun run lint
```

Expected: Both pass

**Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify progress view enhancement end-to-end"
```

---

## Summary

This implementation adds:

1. **AttemptRecord type** - Captures all metadata for each practice attempt
2. **D1 attempts table** - Cloud storage for unlimited history
3. **attemptsStore** - Local-first storage with cloud sync
4. **API endpoints** - POST/GET for attempt sync
5. **MasteryGrid** - 12×12 interactive visualization of all facts
6. **ActivityCalendar** - GitHub-style heat map with streak tracking
7. **FactDetailSheet** - Bottom sheet with fact-specific stats
8. **SyncStatusBadge** - Visual sync state indicator
9. **LearnView integration** - New Progress tab replacing Overview

Parallelizable work:
- Phase 1: Types + DB migration (2 tasks parallel)
- Phase 2: Store + API (2 tasks parallel)
- Phase 3: All 4 UI components (4 tasks parallel)
