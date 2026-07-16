# Skip Limits, Derived-Fact Hints, and Fluency Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make skipping delay-but-never-avoid a fact, make hints derive from facts the learner already knows, gate mastery on unaided recall, and add fact-family follow-ups plus Learn-mode derivation ladders.

**Architecture:** Skip/comeback/follow-up state lives in `sessionStore`; the serving decision is a pure helper (`src/lib/practiceFlow.ts`) layered above `selectNextFact`. Hint personalization threads an optional `KnownFacts` lookup through `Operation.getStrategies`. Mastery gating is a one-line filter change in `calculateConfidence` plus an optional `hintShown` field on attempts. Ladders are static data (`src/lib/ladders.ts`) rendered by a new full-screen modal in Learn.

**Tech Stack:** React 19 + TypeScript, Zustand, Vitest, Tailwind v4, Framer Motion, Lucide icons, Cloudflare Pages Functions + D1.

**Spec:** `docs/superpowers/specs/2026-07-16-skip-limits-and-derived-fact-hints-design.md`

**Branch:** work on the existing `feature/skip-limits-and-hints` branch (spec is already committed there).

## Global Constraints

- Use `bun` / `bunx`, never npm/npx. Test command: `bun run test` (vitest run). Lint: `bun run lint`. Build: `bun run build`.
- Max 300 lines per file (lint ERROR). `PracticeView.tsx` is at 291 lines — Task 7 slims it before Task 8 adds wiring.
- No timers or anxiety-inducing mechanics in UI. Lucide icons only, no emojis.
- TDD: write the failing test first for all `src/lib` and `src/stores` logic. UI components have no test harness in this repo — verify those with `bun run lint && bun run test && bun run build` plus the listed manual checks.
- All existing tests must keep passing. Existing callers of `recordAttempt` omit `hintShown` — new params must be optional.
- Commit after every task (granular, one logical change per commit).

---

### Task 1: Hint-gated confidence in `calculateConfidence`

**Files:**
- Modify: `src/types/index.ts:6-11` (RecentAttempt)
- Modify: `src/types/api.ts:31-36` (RecentAttemptSync)
- Modify: `src/lib/factConfidence.ts:15`
- Test: `src/lib/factConfidence.test.ts`

**Interfaces:**
- Produces: `RecentAttempt.hintShown?: boolean` (absent/undefined = unaided). `calculateConfidence` counts only unaided number-pad attempts toward `confident`/`mastered`.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/factConfidence.test.ts` (read the file first to match its existing helpers; if it builds attempts inline, follow that pattern):

```ts
import { makeFact } from '../test/factories'

function npAttempt(correct: boolean, hintShown?: boolean, responseTimeMs = 3000) {
  return { correct, inputMethod: 'number_pad' as const, responseTimeMs, timestamp: new Date().toISOString(), hintShown }
}

describe('hint-gated confidence', () => {
  it('does not reach confident on hint-assisted number-pad corrects', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [npAttempt(true, true), npAttempt(true, true), npAttempt(true, true)]
    expect(calculateConfidence(fact)).toBe('learning')
  })

  it('reaches confident on 3 unaided NP corrects even with extra hinted attempts', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [
      npAttempt(true, true), npAttempt(true), npAttempt(true), npAttempt(true), npAttempt(false, true),
    ]
    expect(calculateConfidence(fact)).toBe('confident')
  })

  it('treats legacy attempts without hintShown as unaided', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [npAttempt(true), npAttempt(true), npAttempt(true)]
    delete fact.recentAttempts[0].hintShown
    expect(calculateConfidence(fact)).toBe('confident')
  })
})
```

Note on the second test: hinted attempts are excluded from both numerator and denominator, so 3 unaided corrects out of 3 unaided attempts = 100% accuracy → confident.

- [ ] **Step 2: Run tests, verify the first fails**

Run: `bun run test src/lib/factConfidence.test.ts`
Expected: FAIL — first test gets `'confident'` (hinted corrects currently count). Third test may fail to compile until the type change.

- [ ] **Step 3: Implement**

`src/types/index.ts` — add to `RecentAttempt`:

```ts
export type RecentAttempt = {
  correct: boolean
  inputMethod: InputMethod
  responseTimeMs: number
  timestamp: string
  /** True when the hint panel was open before answering. Absent = unaided (legacy data). */
  hintShown?: boolean
}
```

`src/types/api.ts` — add to `RecentAttemptSync`:

```ts
export interface RecentAttemptSync {
  correct: boolean;
  inputMethod: 'multiple_choice' | 'number_pad';
  responseTimeMs: number;
  timestamp: string;
  hintShown?: boolean;
}
```

`src/lib/factConfidence.ts:15` — one-line change; hinted NP attempts drop out of all gate math:

```ts
  // Filter to unaided number pad attempts only for confident/mastered evaluation
  const recentNP = recent.filter(a => a.inputMethod === 'number_pad' && !a.hintShown)
```

Also update the function's doc comment (line 5-7) to say: "Multiple choice and hint-assisted answers can only get you to 'learning' — unaided number pad is required for confident/mastered."

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test src/lib/factConfidence.test.ts`
Expected: PASS (all, including pre-existing tests — they don't set `hintShown`, so nothing regresses).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/types/api.ts src/lib/factConfidence.ts src/lib/factConfidence.test.ts
git commit -m "feat: gate confident/mastered on unaided number-pad attempts"
```

---

### Task 2: Thread `hintShown` into `progressStore.recordAttempt` and PracticeView

**Files:**
- Modify: `src/stores/progressStore.ts:12-17,97-121`
- Modify: `src/views/PracticeView.tsx:138-143`
- Test: `src/stores/progressStore.test.ts`

**Interfaces:**
- Consumes: `RecentAttempt.hintShown?` from Task 1.
- Produces: `recordAttempt({ fact, correct, inputMethod, responseTimeMs, hintShown? })` — optional so existing callers/tests compile unchanged.

- [ ] **Step 1: Write failing test**

Append to `src/stores/progressStore.test.ts` inside the main describe (match the existing `beforeEach` reset pattern already in that file):

```ts
  it('stores hintShown on the recorded attempt', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().recordAttempt({
      fact: '7x8', correct: true, inputMethod: 'number_pad', responseTimeMs: 3000, hintShown: true,
    })
    const attempts = useProgressStore.getState().facts['7x8'].recentAttempts
    expect(attempts[0].hintShown).toBe(true)
  })
```

- [ ] **Step 2: Run test, verify it fails**

Run: `bun run test src/stores/progressStore.test.ts`
Expected: FAIL — `hintShown` is `undefined` on the stored attempt (and TS error on the param until implemented).

- [ ] **Step 3: Implement**

`src/stores/progressStore.ts` — extend params and the attempt record:

```ts
type RecordAttemptParams = {
  fact: string
  correct: boolean
  inputMethod: InputMethod
  responseTimeMs: number
  hintShown?: boolean
}
```

In `recordAttempt`, destructure `hintShown` and include it:

```ts
  recordAttempt: ({ fact, correct, inputMethod, responseTimeMs, hintShown }) => {
    ...
      const newAttempt: RecentAttempt = {
        correct,
        inputMethod,
        responseTimeMs,
        timestamp: now,
        hintShown: hintShown ?? false,
      }
```

`src/views/PracticeView.tsx` — in `handleAnswer`, the `recordAttempt` call gains the field (mirroring the `recordAttemptHistory` call below it, which already passes it):

```ts
    recordAttempt({
      fact: displayFact.fact,
      correct: isCorrect,
      inputMethod,
      responseTimeMs,
      hintShown: wasHintShown,
    })
```

- [ ] **Step 4: Run full suite**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/progressStore.ts src/views/PracticeView.tsx src/stores/progressStore.test.ts
git commit -m "feat: record hintShown on fact progress attempts"
```

---

### Task 3: `skippedCount` on facts — store action, sync payload, adaptive boost

**Files:**
- Modify: `src/types/index.ts:13-25` (FactProgress)
- Modify: `src/types/api.ts:38-54` (FactProgressSync)
- Modify: `src/stores/progressStore.ts` (recordSkip action, toSyncPayload, loadFromServer)
- Modify: `src/lib/adaptive.ts` (export calculateFactScore, skipped boost)
- Test: `src/stores/progressStore.test.ts`, `src/lib/adaptive.test.ts`

**Interfaces:**
- Produces: `FactProgress.skippedCount?: number` (absent = 0); `useProgressStore.getState().recordSkip(fact: string): void`; exported `calculateFactScore(fact, context?)` from adaptive; `FactProgressSync.skippedCount?: number`.

- [ ] **Step 1: Write failing tests**

Append to `src/stores/progressStore.test.ts`:

```ts
  it('recordSkip increments skippedCount and includes it in the sync payload', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().recordSkip('7x8')
    useProgressStore.getState().recordSkip('7x8')
    expect(useProgressStore.getState().facts['7x8'].skippedCount).toBe(2)
    expect(useProgressStore.getState().toSyncPayload('7x8')?.skippedCount).toBe(2)
  })

  it('recordSkip does not touch lastSeen or attempt counts', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().recordSkip('7x8')
    const fact = useProgressStore.getState().facts['7x8']
    expect(fact.lastSeen).toBeNull()
    expect(fact.correctCount).toBe(0)
    expect(fact.incorrectCount).toBe(0)
  })
```

Append to `src/lib/adaptive.test.ts`:

```ts
import { calculateFactScore } from './adaptive'
import { makeFact } from '../test/factories'

describe('skippedCount scoring', () => {
  it('boosts skipped facts, capped at 3 skips', () => {
    const base = makeFact(7, 8)
    const skipped = { ...makeFact(7, 8), skippedCount: 2 }
    const heavilySkipped = { ...makeFact(7, 8), skippedCount: 10 }
    expect(calculateFactScore(skipped) - calculateFactScore(base)).toBe(30)
    expect(calculateFactScore(heavilySkipped) - calculateFactScore(base)).toBe(45)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test src/stores/progressStore.test.ts src/lib/adaptive.test.ts`
Expected: FAIL — `recordSkip` and exported `calculateFactScore` don't exist.

- [ ] **Step 3: Implement**

`src/types/index.ts` — add to `FactProgress` after `incorrectCount`:

```ts
  /** Times the learner skipped this fact in Practice. Absent = 0 (legacy data). */
  skippedCount?: number
```

`src/types/api.ts` — add to `FactProgressSync` after `incorrectCount`:

```ts
  skippedCount?: number;
```

`src/lib/adaptive.ts` — export the scorer (change `function calculateFactScore` to `export function calculateFactScore`) and add the boost right after the trouble-spot block (`if (fact.incorrectCount > 0) {...}`):

```ts
  // Skipped facts are avoidance signals — treat like trouble spots (bounded)
  score += Math.min(fact.skippedCount ?? 0, 3) * 15
```

`src/stores/progressStore.ts` — add to `ProgressActions`:

```ts
  recordSkip: (fact: string) => void
```

Implementation (place after `recordAttempt`). Deliberately does NOT touch `lastSeen` — the recency penalty would suppress the fact, and we want the opposite:

```ts
  recordSkip: (fact) => {
    set(state => {
      const current = state.facts[fact]
      if (!current) return state
      const facts = {
        ...state.facts,
        [fact]: { ...current, skippedCount: (current.skippedCount ?? 0) + 1 },
      }
      saveToStorage(progressKeyFor(state.curriculum), facts)
      return { facts }
    })
  },
```

In `toSyncPayload`, add after `incorrectCount`:

```ts
      skippedCount: fact.skippedCount ?? 0,
```

In `loadFromServer`, add to `factData` after `incorrectCount: f.incorrectCount,`:

```ts
        skippedCount: f.skippedCount ?? 0,
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/types/api.ts src/lib/adaptive.ts src/stores/progressStore.ts src/stores/progressStore.test.ts src/lib/adaptive.test.ts
git commit -m "feat: track skippedCount per fact and boost skipped facts in adaptive scoring"
```

---

### Task 4: Sync `skipped_count` through D1

**Files:**
- Create: `migrations/0004_skipped_count.sql`
- Modify: `functions/api/profiles/[id]/progress.ts`
- Modify: `functions/api/profiles/[id]/verify.ts:32-36`

**Interfaces:**
- Consumes: `FactProgressSync.skippedCount?` from Task 3.
- Produces: `fact_progress.skipped_count` column round-trips through PUT progress and POST verify.

There is no test harness for Pages Functions in this repo; verification is the local migration plus typecheck/build.

- [ ] **Step 1: Write the migration**

Create `migrations/0004_skipped_count.sql`:

```sql
-- Count of times the learner skipped a fact in Practice. Old clients omit the
-- field; the DEFAULT keeps their rows at 0.
-- NOTE: SQLite has no "ADD COLUMN IF NOT EXISTS" — apply this file once per
-- database; a second run fails with "duplicate column name" (harmless).
ALTER TABLE fact_progress ADD COLUMN skipped_count INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Update the PUT endpoint**

`functions/api/profiles/[id]/progress.ts` — add to the `FactSync` interface after `incorrectCount`:

```ts
  skippedCount?: number;
```

Update the INSERT statement and bindings (new column after `incorrect_count`, new `?` placeholder — 11 total):

```ts
  const stmt = env.DB.prepare(
    `INSERT OR REPLACE INTO fact_progress
     (profile_id, fact, curriculum, confidence, correct_count, incorrect_count, skipped_count, last_seen, last_correct, recent_attempts, preferred_strategy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const batch = facts.map((f) =>
    stmt.bind(
      profileId,
      f.fact,
      // Older cached PWA clients omit curriculum; anything unrecognized is multiply.
      f.curriculum === 'divide' ? 'divide' : 'multiply',
      f.confidence,
      f.correctCount,
      f.incorrectCount,
      f.skippedCount ?? 0,
      f.lastSeen,
      f.lastCorrect,
      JSON.stringify(f.recentAttempts),
      f.preferredStrategy
    )
  );
```

- [ ] **Step 3: Update the verify SELECT**

`functions/api/profiles/[id]/verify.ts` — add `skipped_count as skippedCount` to the fact_progress SELECT:

```ts
  const { results: facts } = await env.DB.prepare(
    `SELECT fact, curriculum, confidence, correct_count as correctCount, incorrect_count as incorrectCount,
     skipped_count as skippedCount, last_seen as lastSeen, last_correct as lastCorrect,
     recent_attempts as recentAttempts, preferred_strategy as preferredStrategy
     FROM fact_progress WHERE profile_id = ?`
  ).bind(id).all();
```

- [ ] **Step 4: Verify**

Run: `bun run db:migrate:local`
Expected: migration 0004 applies without error.

Run: `bun run lint && bun run build`
Expected: clean.

Note in your report: production needs `bun run db:migrate` before this branch deploys.

- [ ] **Step 5: Commit**

```bash
git add migrations/0004_skipped_count.sql functions/api/profiles/[id]/progress.ts functions/api/profiles/[id]/verify.ts
git commit -m "feat: sync skipped_count through D1 fact_progress"
```

---

### Task 5: Skip budget state in `sessionStore`

**Files:**
- Modify: `src/lib/constants.ts:32-36` (SESSION_DEFAULTS)
- Modify: `src/types/index.ts:49-57` (Session)
- Modify: `src/stores/sessionStore.ts`
- Test: `src/stores/sessionStore.test.ts` (create)

**Interfaces:**
- Produces: `SESSION_DEFAULTS.skipsPerBlock = 1`, `SESSION_DEFAULTS.comebackDelay = 2`. Session fields `skipsUsed: number`, `pendingComeback: string | null`, `comebackDelay: number`. Actions `recordSkip(fact: string)`, `tickComebackDelay()`, `clearComeback()`, `canSkip(): boolean`. `resetProgress()` clears all of them.

- [ ] **Step 1: Write failing tests**

Create `src/stores/sessionStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from './sessionStore'

describe('sessionStore skip budget', () => {
  beforeEach(() => {
    useSessionStore.getState().resetProgress()
  })

  it('allows one skip per block', () => {
    const s = useSessionStore.getState()
    expect(s.canSkip()).toBe(true)
    s.recordSkip('7x8')
    expect(useSessionStore.getState().canSkip()).toBe(false)
    expect(useSessionStore.getState().skipsUsed).toBe(1)
  })

  it('queues the skipped fact as a pending comeback with a delay of 2', () => {
    useSessionStore.getState().recordSkip('7x8')
    expect(useSessionStore.getState().pendingComeback).toBe('7x8')
    expect(useSessionStore.getState().comebackDelay).toBe(2)
  })

  it('ticks the comeback delay down and clears the comeback', () => {
    useSessionStore.getState().recordSkip('7x8')
    useSessionStore.getState().tickComebackDelay()
    expect(useSessionStore.getState().comebackDelay).toBe(1)
    useSessionStore.getState().clearComeback()
    expect(useSessionStore.getState().pendingComeback).toBeNull()
  })

  it('resetProgress restores the skip budget and clears the comeback', () => {
    useSessionStore.getState().recordSkip('7x8')
    useSessionStore.getState().resetProgress()
    const s = useSessionStore.getState()
    expect(s.canSkip()).toBe(true)
    expect(s.skipsUsed).toBe(0)
    expect(s.pendingComeback).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test src/stores/sessionStore.test.ts`
Expected: FAIL — actions don't exist.

- [ ] **Step 3: Implement**

`src/lib/constants.ts`:

```ts
export const SESSION_DEFAULTS = {
  defaultGoal: 5,
  minGoal: 3,
  maxGoal: 20,
  skipsPerBlock: 1,          // One escape valve per goal block
  comebackDelay: 2,          // Problems served before a skipped fact returns
} as const
```

`src/types/index.ts` — add to `Session` after `recentResults`:

```ts
  skipsUsed: number
  pendingComeback: string | null       // Skipped fact that must return this block
  comebackDelay: number                // Serves remaining before the comeback is due
```

`src/stores/sessionStore.ts` — add to `SessionActions`:

```ts
  recordSkip: (fact: string) => void
  tickComebackDelay: () => void
  clearComeback: () => void
  canSkip: () => boolean
```

Add to `initialState`:

```ts
  skipsUsed: 0,
  pendingComeback: null,
  comebackDelay: 0,
```

Update `resetProgress`:

```ts
  resetProgress: () => set({
    progress: 0, streakCount: 0, newFactsIntroduced: 0, recentResults: [],
    skipsUsed: 0, pendingComeback: null, comebackDelay: 0,
  }),
```

Add the actions:

```ts
  recordSkip: (fact) => set(state => ({
    skipsUsed: state.skipsUsed + 1,
    pendingComeback: fact,
    comebackDelay: SESSION_DEFAULTS.comebackDelay,
  })),

  tickComebackDelay: () => set(state => ({
    comebackDelay: Math.max(0, state.comebackDelay - 1),
  })),

  clearComeback: () => set({ pendingComeback: null, comebackDelay: 0 }),

  canSkip: () => get().skipsUsed < SESSION_DEFAULTS.skipsPerBlock,
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/types/index.ts src/stores/sessionStore.ts src/stores/sessionStore.test.ts
git commit -m "feat: add skip budget and comeback state to sessionStore"
```

---

### Task 6: Pure serving helper `decideNextProblem` (comeback logic)

**Files:**
- Create: `src/lib/practiceFlow.ts`
- Modify: `src/lib/adaptive.ts:6-11` (export SelectionContext)
- Test: `src/lib/practiceFlow.test.ts` (create)

**Interfaces:**
- Consumes: `selectNextFact` and (newly exported) `SelectionContext` from `./adaptive`.
- Produces:

```ts
export type ServeKind = 'adaptive' | 'comeback'
export type ComebackOutcome = 'none' | 'served' | 'deferred' | 'dropped'
export type ServeResult = { next: FactProgress | null; kind: ServeKind; comeback: ComebackOutcome }
export type ServeParams = {
  facts: Record<string, FactProgress>
  recentFacts: string[]
  focusTables: number[]
  context: SelectionContext
  matchesTable?: (fact: FactProgress, table: number) => boolean
  pendingComeback: string | null
  comebackDelay: number
  progress: number
  goal: number
}
export function decideNextProblem(params: ServeParams): ServeResult
```

Caller contract: `comeback: 'served' | 'dropped'` → `clearComeback()`; `'deferred'` → `tickComebackDelay()`.

- [ ] **Step 1: Export SelectionContext**

`src/lib/adaptive.ts:6` — change `type SelectionContext = {` to `export type SelectionContext = {`.

- [ ] **Step 2: Write failing tests**

Create `src/lib/practiceFlow.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { decideNextProblem } from './practiceFlow'
import { multiplyOperation } from './operations'

const facts = multiplyOperation.generateFacts()

const base = {
  facts,
  recentFacts: [],
  focusTables: [] as number[],
  context: {},
  pendingComeback: null as string | null,
  comebackDelay: 0,
  progress: 0,
  goal: 5,
}

describe('decideNextProblem comeback handling', () => {
  it('serves adaptively with no pending comeback', () => {
    const result = decideNextProblem(base)
    expect(result.kind).toBe('adaptive')
    expect(result.comeback).toBe('none')
    expect(result.next).not.toBeNull()
  })

  it('defers the comeback while the delay is positive', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 2 })
    expect(result.kind).toBe('adaptive')
    expect(result.comeback).toBe('deferred')
    expect(result.next?.fact).not.toBe('7x8')
  })

  it('serves the comeback when the delay reaches zero', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 0 })
    expect(result.kind).toBe('comeback')
    expect(result.comeback).toBe('served')
    expect(result.next?.fact).toBe('7x8')
  })

  it('forces the comeback when the block is about to complete', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 2, progress: 4, goal: 5 })
    expect(result.kind).toBe('comeback')
    expect(result.next?.fact).toBe('7x8')
  })

  it('drops a comeback that no longer matches the focus tables', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 0, focusTables: [3] })
    expect(result.comeback).toBe('dropped')
    expect(result.kind).toBe('adaptive')
    expect(result.next && (result.next.a === 3 || result.next.b === 3)).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `bun run test src/lib/practiceFlow.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement**

Create `src/lib/practiceFlow.ts`:

```ts
import type { FactProgress } from '../types'
import { selectNextFact, type SelectionContext } from './adaptive'

export type ServeKind = 'adaptive' | 'comeback'

export type ComebackOutcome = 'none' | 'served' | 'deferred' | 'dropped'

export type ServeResult = {
  next: FactProgress | null
  kind: ServeKind
  /** What the caller must do with a pending comeback: served/dropped → clear it, deferred → tick it. */
  comeback: ComebackOutcome
}

export type ServeParams = {
  facts: Record<string, FactProgress>
  recentFacts: string[]
  focusTables: number[]
  context: SelectionContext
  matchesTable?: (fact: FactProgress, table: number) => boolean
  pendingComeback: string | null
  comebackDelay: number
  progress: number
  goal: number
}

const defaultMatchesTable = (f: FactProgress, t: number) => f.a === t || f.b === t

/**
 * Decides the next problem to serve. A due comeback (skipped fact) takes priority
 * over adaptive selection so a skip delays a fact but never avoids it; it is
 * forced when the block is one correct answer from completing.
 */
export function decideNextProblem(params: ServeParams): ServeResult {
  const { facts, recentFacts, focusTables, context, pendingComeback, comebackDelay, progress, goal } = params
  const matchesTable = params.matchesTable ?? defaultMatchesTable

  let comeback: ComebackOutcome = 'none'
  if (pendingComeback) {
    const fact = facts[pendingComeback]
    const eligible = !!fact && (focusTables.length === 0 || focusTables.some(t => matchesTable(fact, t)))
    if (!eligible) {
      comeback = 'dropped'
    } else if (comebackDelay <= 0 || progress >= goal - 1) {
      return { next: fact, kind: 'comeback', comeback: 'served' }
    } else {
      comeback = 'deferred'
    }
  }

  const next = selectNextFact(facts, recentFacts, focusTables, context, matchesTable)
  return { next, kind: 'adaptive', comeback }
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/practiceFlow.ts src/lib/practiceFlow.test.ts src/lib/adaptive.ts
git commit -m "feat: add decideNextProblem helper with skipped-fact comeback priority"
```

---

### Task 7: Slim PracticeView (extract speech-advance hook and reward granting)

Pure refactor, no behavior change. `PracticeView.tsx` is at 291/300 lines and Tasks 8 and 12 add wiring; this pulls ~65 lines out first.

**Files:**
- Create: `src/hooks/useSpeakThenAdvance.ts`
- Create: `src/lib/practiceRewards.ts`
- Modify: `src/hooks/index.ts`
- Modify: `src/views/PracticeView.tsx`

**Interfaces:**
- Produces:
  - `useSpeakThenAdvance(ttsEnabled: boolean, operation: Operation): { speakThenAdvance(fact, minDelayMs, onAdvance): void; clearAdvanceTimer(): void }`
  - `grantCorrectRewards(factKey: string, newStreak: number, progress: number, goal: number): { message: string; celebrationType: 'correct' | 'streak' | 'goal' }` — grants coins/items via store getState() and increments the session counter on goal completion.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSpeakThenAdvance.ts` (logic moved verbatim from `PracticeView.tsx:51-60,83-94`):

```ts
import { useCallback, useEffect, useRef } from 'react'
import type { FactProgress } from '../types'
import type { Operation } from '../lib/operations'

/** Speak the completed fact (when TTS is on), then advance after a minimum delay. */
export function useSpeakThenAdvance(ttsEnabled: boolean, operation: Operation) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const clearAdvanceTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const speakThenAdvance = useCallback((fact: FactProgress, minDelayMs: number, onAdvance: () => void) => {
    const start = Date.now()
    const ttsPromise = ttsEnabled ? operation.speakFact(fact) : Promise.resolve()

    ttsPromise.then(() => {
      if (cancelledRef.current) return
      const remaining = Math.max(0, minDelayMs - (Date.now() - start))
      timerRef.current = setTimeout(onAdvance, remaining)
    })
  }, [ttsEnabled, operation])

  return { speakThenAdvance, clearAdvanceTimer }
}
```

Add to `src/hooks/index.ts`:

```ts
export { useSpeakThenAdvance } from './useSpeakThenAdvance'
```

- [ ] **Step 2: Create the reward helper**

Create `src/lib/practiceRewards.ts` (logic moved from `PracticeView.tsx` handleAnswer correct branch; caller passes the incremented streak):

```ts
import { useGardenStore } from '../stores/gardenStore'
import { useProgressViewStore } from '../stores/progressViewStore'
import { calculateReward, getCelebrationMessage } from './rewards'

function getRandomPosition() {
  return { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 }
}

/** Grant coins/items for a correct answer and pick the celebration. `newStreak` is the streak including this answer. */
export function grantCorrectRewards(
  factKey: string,
  newStreak: number,
  progress: number,
  goal: number
): { message: string; celebrationType: 'correct' | 'streak' | 'goal' } {
  const reward = calculateReward(newStreak, progress, goal)
  const garden = useGardenStore.getState()
  garden.addCoins(reward.coins)

  if (reward.item) {
    garden.addItem({
      type: reward.item.type,
      itemId: reward.item.itemId,
      position: getRandomPosition(),
      earnedFor: `practice_${factKey}`,
    })
  }

  let celebrationType: 'correct' | 'streak' | 'goal' = 'correct'
  if (progress + 1 >= goal) {
    useProgressViewStore.getState().incrementSessions()
    celebrationType = 'goal'
  } else if (newStreak % 5 === 0) {
    celebrationType = 'streak'
  }

  return { message: reward.bonusMessage || getCelebrationMessage(newStreak), celebrationType }
}
```

- [ ] **Step 3: Rewire PracticeView**

In `src/views/PracticeView.tsx`:

1. Remove `getRandomPosition` (lines 13-15), the `advanceTimerRef`/`cancelledRef` declarations and their cleanup effect (lines 51-60), and the inline `speakThenAdvance` (lines 83-94).
2. Remove now-unused imports: `useRef`, `calculateReward`, `getCelebrationMessage`, `useGardenStore` usage (`addCoins`, `addItem` destructure at line 33), and `useProgressViewStore` import if now unused.
3. Add imports and the hook:

```ts
import { useSpeakThenAdvance } from '../hooks'
import { grantCorrectRewards } from '../lib/practiceRewards'
...
  const { speakThenAdvance, clearAdvanceTimer } = useSpeakThenAdvance(ttsEnabled, operation)
```

4. In `nextProblem`, replace `if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)` with `clearAdvanceTimer()` and add `clearAdvanceTimer` to the dependency array.
5. Replace the correct-branch reward block (previously lines 169-190) with:

```ts
      incrementStreak()
      incrementProgress()

      const { message: rewardMessage, celebrationType: celebration } =
        grantCorrectRewards(displayFact.fact, streakCount + 1, progress, goal)
      setMessage(rewardMessage)
      setCelebrationType(celebration)
```

- [ ] **Step 4: Verify (no behavior change)**

Run: `bun run lint && bun run test && bun run build`
Expected: all clean. `wc -l src/views/PracticeView.tsx` should report ≤ 235 lines.

Manual check: `bun run dev`, answer one problem correct (coins/celebration fire), one wrong (hint auto-opens, advances after the answer is spoken/2.5s).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSpeakThenAdvance.ts src/hooks/index.ts src/lib/practiceRewards.ts src/views/PracticeView.tsx
git commit -m "refactor: extract speech-advance hook and reward granting from PracticeView"
```

---### Task 8: Wire the skip budget and comeback into Practice

**Files:**
- Modify: `src/views/PracticeView.tsx`
- Modify: `src/components/practice/PracticeActions.tsx`

**Interfaces:**
- Consumes: `decideNextProblem` (Task 6), sessionStore skip actions (Task 5), `progressStore.recordSkip` (Task 3).
- Produces: `PracticeActions` props gain `canSkip: boolean`. PracticeView tracks `servedKind: ServeKind` state — Task 12 reuses it.

- [ ] **Step 1: Update PracticeActions**

Replace `src/components/practice/PracticeActions.tsx` contents:

```tsx
import { Lightbulb, SkipForward } from 'lucide-react'
import { Button } from '../common'

type PracticeActionsProps = {
  onHint: () => void
  onSkip: () => void
  canSkip: boolean
}

export function PracticeActions({ onHint, onSkip, canSkip }: PracticeActionsProps) {
  return (
    <div className="flex justify-center gap-4 mt-4">
      <Button variant="ghost" onClick={onHint} className="flex items-center gap-2">
        <Lightbulb size={18} />
        Hint
      </Button>
      <Button variant="ghost" onClick={onSkip} disabled={!canSkip} className="flex items-center gap-2">
        <SkipForward size={18} />
        {canSkip ? 'Skip' : 'Skip used'}
      </Button>
    </div>
  )
}
```

(`Button` already renders `disabled:opacity-50 disabled:cursor-not-allowed`.)

- [ ] **Step 2: Rewire PracticeView serving and skip**

In `src/views/PracticeView.tsx`:

1. Imports (keep `selectNextFact` — the synchronous initial-fact path at lines 96-109 still uses it; a fresh session has no pending comeback, so that path stays on plain adaptive selection):

```ts
import { selectNextFact, shouldUseMultipleChoice } from '../lib/adaptive'
import { decideNextProblem, type ServeKind } from '../lib/practiceFlow'
```

2. Store hooks — destructure `recordSkip` from progressStore under a distinct name, and subscribe to `skipsUsed`:

```ts
  const { facts, recordAttempt, toSyncPayload, recordSkip: recordFactSkip } = useProgressStore()
  const skipsUsed = useSessionStore(s => s.skipsUsed)
  const canSkip = skipsUsed < SESSION_DEFAULTS.skipsPerBlock
```

Add `import { SESSION_DEFAULTS } from '../lib/constants'`.

3. Add serve-kind state next to the other useState calls:

```ts
  const [servedKind, setServedKind] = useState<ServeKind>('adaptive')
```

4. Replace the body of `nextProblem` (session/progress state read fresh via `getState()` so the skip → serve sequence in the same tick sees the just-recorded skip):

```ts
  const nextProblem = useCallback(() => {
    clearAdvanceTimer()

    const session = useSessionStore.getState()
    const result = decideNextProblem({
      facts: useProgressStore.getState().facts,
      recentFacts,
      focusTables: activeFocusTables,
      context: {
        newFactsIntroduced: session.newFactsIntroduced,
        sessionAccuracy: session.getSessionAccuracy(),
        consecutiveWrong: countConsecutiveWrong(),
        nearGoalEnd: session.progress >= session.goal - 1,
      },
      matchesTable: operation.matchesTable,
      pendingComeback: session.pendingComeback,
      comebackDelay: session.comebackDelay,
      progress: session.progress,
      goal: session.goal,
    })

    if (result.comeback === 'served' || result.comeback === 'dropped') session.clearComeback()
    else if (result.comeback === 'deferred') session.tickComebackDelay()

    const next = result.next
    if (next) {
      setServedKind(result.kind)
      setCurrentFact(next)
      setRecentFacts(prev => [...prev.slice(-10), next.fact])
      setSelectedAnswer(null)
      setShowResult(false)
      setShowHint(false)
      setMessage(null)
      setAttemptStartTime(Date.now())
      if (ttsEnabled) operation.speakProblem(next)
    }
  }, [recentFacts, activeFocusTables, ttsEnabled, operation, clearAdvanceTimer])
```

(The old dep entries `facts, newFactsIntroduced, progress, goal, getSessionAccuracy` drop out — those values are now read fresh from `getState()`.)

5. Comebacks always use multiple choice — extend the input-widget memo:

```ts
  const useMultipleChoice = useMemo(
    () => (displayFact ? servedKind === 'comeback' || shouldUseMultipleChoice(displayFact, recentlyFailed) : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFact, servedKind]
  )
```

6. Replace `handleSkip`:

```ts
  const handleSkip = () => {
    if (!displayFact) return
    const session = useSessionStore.getState()
    if (!session.canSkip()) return

    session.recordSkip(displayFact.fact)
    recordFactSkip(displayFact.fact)
    const syncPayload = toSyncPayload(displayFact.fact)
    if (syncPayload) queueProgressSync(syncPayload)

    resetStreak()
    nextProblem()
  }
```

7. Pass the prop:

```tsx
          <PracticeActions onHint={() => setShowHint(true)} onSkip={handleSkip} canSkip={canSkip} />
```

- [ ] **Step 3: Verify**

Run: `bun run lint && bun run test && bun run build`
Expected: clean; `wc -l src/views/PracticeView.tsx` ≤ 275.

Manual check (`bun run dev`):
1. Skip a problem → button reads "Skip used" and is disabled; streak resets.
2. Answer two more problems → the skipped fact returns as multiple choice.
3. Skip when the goal bar shows 4/5 → the skipped fact returns immediately.
4. Complete the goal, tap "Keep Going" → Skip is available again.

- [ ] **Step 4: Commit**

```bash
git add src/views/PracticeView.tsx src/components/practice/PracticeActions.tsx
git commit -m "feat: one skip per block with guaranteed same-block comeback"
```

---

### Task 9: `KnownFacts`, commuted-fact hint, and hint ordering

**Files:**
- Modify: `src/lib/strategies.ts`
- Test: `src/lib/strategies.test.ts` (create — strategies currently have no direct test file)

**Interfaces:**
- Produces:

```ts
export type KnownFacts = { isKnown: (a: number, b: number) => boolean }
export function makeKnownFacts(facts: Record<string, FactProgress>): KnownFacts   // confident or mastered
export function getStrategiesForFact(fact: FactProgress, known?: KnownFacts): StrategyHint[]
```

- With `known`: commuted `fact_family` hint when `isKnown(b, a)` and `a !== b`; result sorted (fact_family first, visual_array last). Without `known`: identical to today (same set, same order).

- [ ] **Step 1: Write failing tests**

Create `src/lib/strategies.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getStrategiesForFact, makeKnownFacts, type KnownFacts } from './strategies'
import { makeFact } from '../test/factories'

const knowing = (...facts: string[]): KnownFacts => ({
  isKnown: (a, b) => facts.includes(`${a}x${b}`),
})

describe('commuted fact hint', () => {
  it('offers the flipped fact when it is known', () => {
    const strategies = getStrategiesForFact(makeFact(7, 8), knowing('8x7'))
    expect(strategies[0].id).toBe('fact_family')
    expect(strategies[0].steps[0]).toContain('8 × 7 = 56')
  })

  it('is absent when the flipped fact is not known', () => {
    const ids = getStrategiesForFact(makeFact(7, 8), knowing()).map(s => s.id)
    expect(ids).not.toContain('fact_family')
  })

  it('is absent for squares', () => {
    const ids = getStrategiesForFact(makeFact(6, 6), knowing('6x6')).map(s => s.id)
    expect(ids).not.toContain('fact_family')
  })
})

describe('ordering', () => {
  it('puts visual_array last when a known-facts context is provided', () => {
    const strategies = getStrategiesForFact(makeFact(7, 8), knowing())
    expect(strategies[strategies.length - 1].id).toBe('visual_array')
  })

  it('keeps the legacy order without a context', () => {
    const strategies = getStrategiesForFact(makeFact(7, 8))
    expect(strategies[0].id).toBe('visual_array')
  })
})

describe('makeKnownFacts', () => {
  it('treats confident and mastered facts as known, others not', () => {
    const facts = {
      '8x7': { ...makeFact(8, 7), confidence: 'confident' as const },
      '5x5': { ...makeFact(5, 5), confidence: 'learning' as const },
    }
    const known = makeKnownFacts(facts)
    expect(known.isKnown(8, 7)).toBe(true)
    expect(known.isKnown(5, 5)).toBe(false)
    expect(known.isKnown(9, 9)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test src/lib/strategies.test.ts`
Expected: FAIL — `makeKnownFacts` doesn't exist; `getStrategiesForFact` takes one argument.

- [ ] **Step 3: Implement**

In `src/lib/strategies.ts`:

1. Add after the `StrategyHint` type:

```ts
/** Lookup for facts the learner already answers reliably (confident or mastered). */
export type KnownFacts = {
  isKnown: (a: number, b: number) => boolean
}

/** Build a KnownFacts lookup from a multiplication facts record. */
export function makeKnownFacts(facts: Record<string, FactProgress>): KnownFacts {
  return {
    isKnown: (a, b) => {
      const fact = facts[`${a}x${b}`]
      return !!fact && (fact.confidence === 'confident' || fact.confidence === 'mastered')
    },
  }
}

const STRATEGY_ORDER: Strategy[] = [
  'fact_family', 'known_anchor', 'nines_trick', 'fives_trick', 'tens_trick',
  'ones_zeros', 'doubles', 'use_neighbor', 'skip_counting', 'break_apart', 'visual_array',
]

function sortByStrategyOrder(list: StrategyHint[]): StrategyHint[] {
  return [...list].sort((x, y) => STRATEGY_ORDER.indexOf(x.id) - STRATEGY_ORDER.indexOf(y.id))
}

function getCommutedStrategy(fact: FactProgress, known: KnownFacts): StrategyHint | null {
  const { a, b, answer } = fact
  if (a === b || !known.isKnown(b, a)) return null
  return {
    id: 'fact_family',
    name: 'Flip It',
    description: `${a} × ${b} is ${b} × ${a} flipped — same answer`,
    steps: [
      `You already know ${b} × ${a} = ${answer}!`,
      `${a} × ${b} is the same problem, just flipped.`,
      `So ${a} × ${b} = ?`,
    ],
  }
}
```

2. Add `'known_anchor'` to the `Strategy` union in `src/types/index.ts:59-71` (after `'ones_zeros'`):

```ts
  | 'known_anchor'
```

3. Change the signature and the tail of `getStrategiesForFact`:

```ts
export function getStrategiesForFact(fact: FactProgress, known?: KnownFacts): StrategyHint[] {
```

and replace the final `return strategies`:

```ts
  if (known) {
    const commuted = getCommutedStrategy(fact, known)
    if (commuted) strategies.push(commuted)
    return sortByStrategyOrder(strategies)
  }
  return strategies
```

Also import `Strategy` in the type import at line 1: `import type { Strategy, FactProgress } from '../types'` (already present).

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test`
Expected: PASS (existing `multiply.test.ts` strategy tests pass no context → legacy order preserved).

- [ ] **Step 5: Commit**

```bash
git add src/lib/strategies.ts src/lib/strategies.test.ts src/types/index.ts
git commit -m "feat: commuted-fact hint and known-facts ordering for strategies"
```

---

### Task 10: Anchor-chain hints and smarter neighbor

**Files:**
- Create: `src/lib/anchorStrategies.ts`
- Modify: `src/lib/strategies.ts` (compose anchors; personalize use_neighbor)
- Test: `src/lib/anchorStrategies.test.ts` (create), `src/lib/strategies.test.ts`

**Interfaces:**
- Consumes: `StrategyHint`, `KnownFacts` (type-only import from `./strategies` — safe circularity, types are erased).
- Produces: `getAnchorStrategies(fact: FactProgress, known: KnownFacts): StrategyHint[]` — id `'known_anchor'`, max 2 hints. Anchors accept either orientation (`isKnown(x,y) || isKnown(y,x)`).

- [ ] **Step 1: Write failing tests**

Create `src/lib/anchorStrategies.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getAnchorStrategies } from './anchorStrategies'
import type { KnownFacts } from './strategies'
import { makeFact } from '../test/factories'

const knowing = (...facts: string[]): KnownFacts => ({
  isKnown: (a, b) => facts.includes(`${a}x${b}`),
})

describe('getAnchorStrategies', () => {
  it('builds 8s from tens minus twos when 10x and 2x are known', () => {
    const hints = getAnchorStrategies(makeFact(8, 7), knowing('10x7', '2x7'))
    expect(hints[0].id).toBe('known_anchor')
    expect(hints[0].name).toBe('Tens Minus Twos')
    expect(hints[0].steps.join(' ')).toContain('70')
    expect(hints[0].steps.join(' ')).toContain('14')
  })

  it('falls back to doubling fours for 8s when only 4x is known', () => {
    const hints = getAnchorStrategies(makeFact(8, 7), knowing('4x7'))
    expect(hints[0].name).toBe('Double the Fours')
  })

  it('accepts anchors in either orientation', () => {
    const hints = getAnchorStrategies(makeFact(6, 9), knowing('9x5'))
    expect(hints[0].name).toBe('Fives Plus One')
  })

  it('returns nothing when no anchors are known', () => {
    expect(getAnchorStrategies(makeFact(8, 7), knowing())).toEqual([])
  })

  it('caps at two hints', () => {
    const hints = getAnchorStrategies(makeFact(8, 12), knowing('10x8', '2x8', '10x12', '2x12'))
    expect(hints).toHaveLength(2)
  })

  it('emits a single hint for squares', () => {
    const hints = getAnchorStrategies(makeFact(4, 4), knowing('2x4'))
    expect(hints).toHaveLength(1)
    expect(hints[0].name).toBe('Double the Double')
  })
})
```

Add to `src/lib/strategies.test.ts`:

```ts
describe('personalized neighbor', () => {
  it('prefers a known neighbor above the fact', () => {
    const strategies = getStrategiesForFact(makeFact(7, 6), knowing('8x6'))
    const neighbor = strategies.find(s => s.id === 'use_neighbor')
    expect(neighbor?.description).toContain('8 × 6')
    expect(neighbor?.steps.join(' ')).toContain('−')
  })

  it('anchor chains appear after the commuted hint and before number tricks', () => {
    const strategies = getStrategiesForFact(makeFact(8, 7), knowing('7x8', '10x7', '2x7'))
    const ids = strategies.map(s => s.id)
    expect(ids.indexOf('fact_family')).toBeLessThan(ids.indexOf('known_anchor'))
    expect(ids.indexOf('known_anchor')).toBeLessThan(ids.indexOf('visual_array'))
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test src/lib/anchorStrategies.test.ts src/lib/strategies.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement anchorStrategies**

Create `src/lib/anchorStrategies.ts`:

```ts
import type { FactProgress } from '../types'
import type { StrategyHint, KnownFacts } from './strategies'

type Knows = (x: number, y: number) => boolean

function hint(name: string, description: string, steps: string[]): StrategyHint {
  return { id: 'known_anchor', name, description, steps }
}

/** Recipes for k groups of n, derived from anchor facts the learner knows. */
const CHAIN_BUILDERS: Record<number, (n: number, knows: Knows) => StrategyHint | null> = {
  3: (n, knows) => knows(2, n) ? hint('Double Plus One', `Start from 2 × ${n} — you know that one`, [
    `You know 2 × ${n} = ${2 * n}.`,
    `3 × ${n} is just one more ${n}.`,
    `${2 * n} + ${n} = ?`,
  ]) : null,
  4: (n, knows) => knows(2, n) ? hint('Double the Double', `Start from 2 × ${n} — you know that one`, [
    `You know 2 × ${n} = ${2 * n}.`,
    `4 × ${n} is double that.`,
    `${2 * n} + ${2 * n} = ?`,
  ]) : null,
  6: (n, knows) => knows(5, n) ? hint('Fives Plus One', `Start from 5 × ${n} — you know that one`, [
    `You know 5 × ${n} = ${5 * n}.`,
    `6 × ${n} is one more ${n}.`,
    `${5 * n} + ${n} = ?`,
  ]) : null,
  7: (n, knows) => knows(5, n) && knows(2, n) ? hint('Fives Plus Twos', `Start from 5 × ${n} — you know that one`, [
    `You know 5 × ${n} = ${5 * n} and 2 × ${n} = ${2 * n}.`,
    `7 groups is 5 groups plus 2 groups.`,
    `${5 * n} + ${2 * n} = ?`,
  ]) : null,
  8: (n, knows) => {
    if (knows(10, n) && knows(2, n)) return hint('Tens Minus Twos', `Start from 10 × ${n} — you know that one`, [
      `You know 10 × ${n} = ${10 * n}.`,
      `8 groups is 2 groups less than 10 — that's ${2 * n} less.`,
      `${10 * n} − ${2 * n} = ?`,
    ])
    if (knows(4, n)) return hint('Double the Fours', `Start from 4 × ${n} — you know that one`, [
      `You know 4 × ${n} = ${4 * n}.`,
      `8 × ${n} is double that.`,
      `${4 * n} + ${4 * n} = ?`,
    ])
    return null
  },
  12: (n, knows) => knows(10, n) && knows(2, n) ? hint('Tens Plus Twos', `Start from 10 × ${n} — you know that one`, [
    `You know 10 × ${n} = ${10 * n} and 2 × ${n} = ${2 * n}.`,
    `12 groups is 10 groups plus 2 groups.`,
    `${10 * n} + ${2 * n} = ?`,
  ]) : null,
}

/** Derived-fact hints built only from anchors the learner already knows. Max 2. */
export function getAnchorStrategies(fact: FactProgress, known: KnownFacts): StrategyHint[] {
  const knows: Knows = (x, y) => known.isKnown(x, y) || known.isKnown(y, x)
  const pairs: Array<[number, number]> =
    fact.a === fact.b ? [[fact.a, fact.b]] : [[fact.a, fact.b], [fact.b, fact.a]]

  const hints: StrategyHint[] = []
  for (const [k, n] of pairs) {
    const built = CHAIN_BUILDERS[k]?.(n, knows)
    if (built) hints.push(built)
  }
  return hints.slice(0, 2)
}
```

- [ ] **Step 4: Compose in strategies.ts**

In `src/lib/strategies.ts`:

1. Add import: `import { getAnchorStrategies } from './anchorStrategies'`
2. In the `known` block at the tail:

```ts
  if (known) {
    const commuted = getCommutedStrategy(fact, known)
    if (commuted) strategies.push(commuted)
    strategies.push(...getAnchorStrategies(fact, known))
    return sortByStrategyOrder(strategies)
  }
```

3. Replace the `use_neighbor` block (currently anchored on `a - 1` unconditionally):

```ts
  // Use a neighbor (for harder facts) — prefer a neighbor the learner knows
  if (a > 2 && b > 2) {
    const knownNeighbors = known
      ? [a - 1, a + 1].filter(k => k >= 1 && k <= 12 && (known.isKnown(k, b) || known.isKnown(b, k)))
      : []
    const neighbor = knownNeighbors[0] ?? a - 1
    const below = neighbor === a - 1
    strategies.push({
      id: 'use_neighbor',
      name: 'Use a Neighbor',
      description: below
        ? `Start from ${neighbor} × ${b}, add ${b} more`
        : `Start from ${neighbor} × ${b}, take ${b} away`,
      steps: [
        `Do you know ${neighbor} × ${b}?`,
        below ? `If so, just add one more group of ${b}!` : `That's one group of ${b} too many — take one away.`,
        below ? `${neighbor} × ${b} + ${b} = ?` : `${neighbor} × ${b} − ${b} = ?`,
      ],
    })
  }
```

- [ ] **Step 5: Run tests, verify pass**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/anchorStrategies.ts src/lib/anchorStrategies.test.ts src/lib/strategies.ts src/lib/strategies.test.ts
git commit -m "feat: derived-fact anchor hints and known-neighbor personalization"
```

---

### Task 11: Thread `KnownFacts` through the Operation seam and views

**Files:**
- Modify: `src/lib/operations/types.ts:40`
- Modify: `src/views/PracticeView.tsx` (strategies memo)
- Modify: `src/components/learn/VisualExplainer.tsx:14-18`

**Interfaces:**
- Produces: `Operation.getStrategies: (fact: FactProgress, known?: KnownFacts) => StrategyHint[]`. `multiplyOperation.getStrategies` already satisfies this (Task 9 changed `getStrategiesForFact`); `getStrategiesForDivisionFact(fact)` needs no change — a function taking fewer parameters is assignable, and division hints stay static per spec.

- [ ] **Step 1: Update the Operation type**

`src/lib/operations/types.ts`:

```ts
import type { StrategyHint, KnownFacts } from '../strategies'
...
  getStrategies: (fact: FactProgress, known?: KnownFacts) => StrategyHint[]
```

- [ ] **Step 2: Pass known facts from PracticeView**

In `src/views/PracticeView.tsx`, add `import { makeKnownFacts } from '../lib/strategies'` and update the strategies memo:

```ts
  const strategies = useMemo(
    () => (displayFact ? operation.getStrategies(displayFact, makeKnownFacts(facts)) : []),
    [displayFact, operation, facts]
  )
```

- [ ] **Step 3: Pass known facts from VisualExplainer**

In `src/components/learn/VisualExplainer.tsx`:

```ts
import { useMemo, useState } from 'react'
import { useProgressStore } from '../../stores'
import { makeKnownFacts } from '../../lib/strategies'
...
  const facts = useProgressStore((s) => s.facts)
  const strategies = useMemo(
    () => operation.getStrategies(fact, makeKnownFacts(facts)),
    [operation, fact, facts]
  )
```

(Check `../../stores` re-exports `useProgressStore` — `src/stores/index.ts` does.)

- [ ] **Step 4: Verify**

Run: `bun run lint && bun run test && bun run build`
Expected: clean. Existing division operation tests pass — division ignores the new argument.

Manual check (`bun run dev`): in Practice, tap Hint on a fact whose flipped twin or 10×/5×/2× anchors are already green in the Learn grid → "Flip It" / anchor hints appear first; the dot-array hint is now the last page.

- [ ] **Step 5: Commit**

```bash
git add src/lib/operations/types.ts src/views/PracticeView.tsx src/components/learn/VisualExplainer.tsx
git commit -m "feat: pass known-facts context to strategies in Practice and Learn"
```

---

### Task 12: Fact-family follow-ups

**Files:**
- Modify: `src/lib/operations/types.ts` (familyFollowUp hook)
- Modify: `src/lib/operations/multiply.ts`
- Modify: `src/types/index.ts` (Session.pendingFollowUp)
- Modify: `src/stores/sessionStore.ts`
- Modify: `src/lib/practiceFlow.ts`
- Modify: `src/views/PracticeView.tsx`
- Test: `src/lib/practiceFlow.test.ts`, `src/lib/operations/multiply.test.ts`

**Interfaces:**
- Produces: `Operation.familyFollowUp?: (fact: FactProgress) => string | null` (multiply: commuted fact key, null for squares; divide: undefined). `ServeParams.pendingFollowUp: string | null`; `ServeKind` gains `'followUp'`. Session action `setPendingFollowUp(fact: string | null)`. Follow-up is one-shot: the caller clears it after every serve.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/operations/multiply.test.ts`:

```ts
describe('familyFollowUp', () => {
  it('returns the commuted fact key', () => {
    expect(multiplyOperation.familyFollowUp?.(makeFact(7, 8))).toBe('8x7')
  })
  it('returns null for squares', () => {
    expect(multiplyOperation.familyFollowUp?.(makeFact(6, 6))).toBeNull()
  })
})
```

(Reuse that file's existing `makeFact` helper/import.)

Append to `src/lib/practiceFlow.test.ts` — note `base` gains `pendingFollowUp: null`:

```ts
describe('decideNextProblem follow-up handling', () => {
  const withFollowUp = { ...base, pendingFollowUp: '8x7' }

  it('serves an eligible follow-up', () => {
    const result = decideNextProblem(withFollowUp)
    expect(result.kind).toBe('followUp')
    expect(result.next?.fact).toBe('8x7')
  })

  it('skips a follow-up that is already confident', () => {
    const facts = { ...base.facts, '8x7': { ...base.facts['8x7'], confidence: 'confident' as const } }
    const result = decideNextProblem({ ...withFollowUp, facts })
    expect(result.kind).toBe('adaptive')
  })

  it('skips the follow-up when one correct answer remains', () => {
    const result = decideNextProblem({ ...withFollowUp, progress: 4, goal: 5 })
    expect(result.kind).toBe('adaptive')
  })

  it('skips a follow-up in the recent window', () => {
    const result = decideNextProblem({ ...withFollowUp, recentFacts: ['3x3', '8x7', '2x2'] })
    expect(result.kind).toBe('adaptive')
  })

  it('a due comeback beats the follow-up', () => {
    const result = decideNextProblem({ ...withFollowUp, pendingComeback: '9x6', comebackDelay: 0 })
    expect(result.kind).toBe('comeback')
    expect(result.next?.fact).toBe('9x6')
  })
})
```

Update `base` in that file to include `pendingFollowUp: null as string | null`.

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test src/lib/practiceFlow.test.ts src/lib/operations/multiply.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/operations/types.ts` — add to `Operation` (documented as optional; division omits it for now):

```ts
  /** Key of the fact-family sibling to serve right after a correct answer (e.g. the commuted fact). */
  familyFollowUp?: (fact: FactProgress) => string | null
```

`src/lib/operations/multiply.ts` — add to `multiplyOperation`:

```ts
  familyFollowUp: (fact) => (fact.a === fact.b ? null : factId(fact.b, fact.a)),
```

`src/types/index.ts` — add to `Session`:

```ts
  pendingFollowUp: string | null    // Commuted fact queued after a correct answer
```

`src/stores/sessionStore.ts` — add `pendingFollowUp: null,` to `initialState`, add it to `resetProgress` (`pendingFollowUp: null`), and add the action + type:

```ts
  setPendingFollowUp: (fact: string | null) => void
...
  setPendingFollowUp: (fact) => set({ pendingFollowUp: fact }),
```

`src/lib/practiceFlow.ts` — extend:

```ts
export type ServeKind = 'adaptive' | 'comeback' | 'followUp'
```

Add `pendingFollowUp: string | null` to `ServeParams`. Insert between the comeback block and the adaptive fallback:

```ts
  if (params.pendingFollowUp) {
    const followUp = facts[params.pendingFollowUp]
    const eligible = !!followUp
      && (followUp.confidence === 'new' || followUp.confidence === 'learning')
      && progress < goal - 1
      && !recentFacts.slice(-3).includes(followUp.fact)
      && (focusTables.length === 0 || focusTables.some(t => matchesTable(followUp, t)))
    if (eligible) return { next: followUp, kind: 'followUp', comeback }
  }
```

`src/views/PracticeView.tsx`:

1. In `nextProblem`, pass `pendingFollowUp: session.pendingFollowUp` to `decideNextProblem`, and clear it right after the decision (one-shot — consumed or discarded either way):

```ts
    session.setPendingFollowUp(null)
```

(place this line immediately after the comeback clear/tick lines).

2. In `handleAnswer`'s correct branch (before `speakThenAdvance`), queue the follow-up — but never chain one follow-up into another:

```ts
      if (servedKind !== 'followUp' && operation.familyFollowUp) {
        useSessionStore.getState().setPendingFollowUp(operation.familyFollowUp(displayFact))
      }
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test && bun run lint && bun run build`
Expected: PASS; `wc -l src/views/PracticeView.tsx` ≤ 285.

Manual check: answer a not-yet-confident fact correctly → its flipped twin is usually the next problem; getting the twin right does not immediately re-serve the original.

- [ ] **Step 5: Commit**

```bash
git add src/lib/operations/types.ts src/lib/operations/multiply.ts src/lib/operations/multiply.test.ts src/types/index.ts src/stores/sessionStore.ts src/lib/practiceFlow.ts src/lib/practiceFlow.test.ts src/views/PracticeView.tsx
git commit -m "feat: serve the commuted fact as a follow-up after correct answers"
```

---

### Task 13: `VisualArray` faded rows

**Files:**
- Modify: `src/components/practice/VisualArray.tsx`

**Interfaces:**
- Produces: `VisualArray` prop `fadedRows?: number` — the LAST N rows render dimmed (gray, low opacity), used by ladders for "take a group away" / "the group you're adding".

- [ ] **Step 1: Implement**

Update `src/components/practice/VisualArray.tsx`:

```tsx
type VisualArrayProps = {
  rows: number
  cols: number
  /** Overrides the default multiplication rows x columns caption. */
  caption?: string
  /** Render the last N rows dimmed — a group being removed or added. */
  fadedRows?: number
}

export function VisualArray({ rows, cols, caption, fadedRows = 0 }: VisualArrayProps) {
```

and inside the map, derive the row and swap the dot class:

```tsx
        {Array.from({ length: displayRows * displayCols }).map((_, i) => {
          const row = Math.floor(i / displayCols)
          const faded = fadedRows > 0 && row >= displayRows - fadedRows
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`w-4 h-4 rounded-full ${faded ? 'bg-gray-300 opacity-40' : 'bg-garden-400'}`}
            />
          )
        })}
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run test && bun run build`
Expected: clean (prop is optional; existing call sites unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/components/practice/VisualArray.tsx
git commit -m "feat: support faded rows in VisualArray"
```

---

### Task 14: Ladder definitions (`src/lib/ladders.ts`)

**Files:**
- Create: `src/lib/ladders.ts`
- Test: `src/lib/ladders.test.ts` (create)

**Interfaces:**
- Produces:

```ts
export type LadderShowStep = {
  kind: 'show'
  title: string
  text: string
  array?: { rows: number; cols: number; caption?: string; fadedRows?: number }
}
export type LadderTryStep = { kind: 'try'; a: number; b: number; prompt: string }
export type LadderStep = LadderShowStep | LadderTryStep
export type Ladder = { id: string; title: string; subtitle: string; steps: LadderStep[] }
export const LADDERS: Ladder[]
```

Constraint: array `rows` must be ≤ 10 (`VisualArray` truncates above 10) — the 12s ladder shows 10× and 2× as two separate arrays.

- [ ] **Step 1: Write failing tests**

Create `src/lib/ladders.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { LADDERS } from './ladders'

describe('LADDERS', () => {
  it('has six ladders with unique ids', () => {
    expect(LADDERS).toHaveLength(6)
    expect(new Set(LADDERS.map(l => l.id)).size).toBe(6)
  })

  it('every ladder ends each example with a try step', () => {
    for (const ladder of LADDERS) {
      const lastStep = ladder.steps[ladder.steps.length - 1]
      expect(lastStep.kind).toBe('try')
    }
  })

  it('try steps stay inside the 12x12 grid', () => {
    for (const ladder of LADDERS) {
      for (const step of ladder.steps) {
        if (step.kind === 'try') {
          expect(step.a).toBeGreaterThanOrEqual(1)
          expect(step.a).toBeLessThanOrEqual(12)
          expect(step.b).toBeGreaterThanOrEqual(1)
          expect(step.b).toBeLessThanOrEqual(12)
        }
      }
    }
  })

  it('never shows an array taller than VisualArray can render', () => {
    for (const ladder of LADDERS) {
      for (const step of ladder.steps) {
        if (step.kind === 'show' && step.array) {
          expect(step.array.rows).toBeLessThanOrEqual(10)
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test src/lib/ladders.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Create `src/lib/ladders.ts`:

```ts
export type LadderShowStep = {
  kind: 'show'
  title: string
  text: string
  array?: { rows: number; cols: number; caption?: string; fadedRows?: number }
}

export type LadderTryStep = { kind: 'try'; a: number; b: number; prompt: string }

export type LadderStep = LadderShowStep | LadderTryStep

export type Ladder = {
  id: string
  title: string
  subtitle: string
  steps: LadderStep[]
}

function ninesFromTens(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 10 × ${n}`, text: `You know 10 × ${n} = ${10 * n}.`, array: { rows: 10, cols: n, caption: `10 rows of ${n} = ${10 * n}` } },
    { kind: 'show', title: 'Take one group away', text: `9 × ${n} is one group of ${n} less. ${10 * n} − ${n} = ?`, array: { rows: 10, cols: n, fadedRows: 1, caption: `The faded row is the ${n} you take away` } },
    { kind: 'try', a: 9, b: n, prompt: `You try: 9 × ${n}` },
  ]
}

function eightsByDoubling(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 2 × ${n}`, text: `You know 2 × ${n} = ${2 * n}.`, array: { rows: 2, cols: n, caption: `2 rows of ${n} = ${2 * n}` } },
    { kind: 'show', title: 'Double it', text: `Double ${2 * n} to get 4 × ${n} = ${4 * n}.`, array: { rows: 4, cols: n, fadedRows: 2, caption: `The faded rows are the new double` } },
    { kind: 'show', title: 'Double it again', text: `Double ${4 * n} one more time to get 8 × ${n}.`, array: { rows: 8, cols: n, fadedRows: 4, caption: `Double ${4 * n} = ?` } },
    { kind: 'try', a: 8, b: n, prompt: `You try: 8 × ${n}` },
  ]
}

function sixesFromFives(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 5 × ${n}`, text: `You know 5 × ${n} = ${5 * n}.`, array: { rows: 5, cols: n, caption: `5 rows of ${n} = ${5 * n}` } },
    { kind: 'show', title: 'Add one more group', text: `6 × ${n} is one more ${n}. ${5 * n} + ${n} = ?`, array: { rows: 6, cols: n, fadedRows: 1, caption: `The faded row is the ${n} you add` } },
    { kind: 'try', a: 6, b: n, prompt: `You try: 6 × ${n}` },
  ]
}

function foursDoubleDouble(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 2 × ${n}`, text: `You know 2 × ${n} = ${2 * n}.`, array: { rows: 2, cols: n, caption: `2 rows of ${n} = ${2 * n}` } },
    { kind: 'show', title: 'Double it', text: `4 × ${n} is double 2 × ${n}. ${2 * n} + ${2 * n} = ?`, array: { rows: 4, cols: n, fadedRows: 2, caption: `The faded rows are the new double` } },
    { kind: 'try', a: 4, b: n, prompt: `You try: 4 × ${n}` },
  ]
}

function twelvesTensPlusTwos(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 10 × ${n}`, text: `You know 10 × ${n} = ${10 * n}.`, array: { rows: 10, cols: n, caption: `10 rows of ${n} = ${10 * n}` } },
    { kind: 'show', title: `Add 2 × ${n}`, text: `12 × ${n} is 10 groups plus 2 groups. ${10 * n} + ${2 * n} = ?`, array: { rows: 2, cols: n, caption: `2 more rows of ${n} = ${2 * n}` } },
    { kind: 'try', a: 12, b: n, prompt: `You try: 12 × ${n}` },
  ]
}

function threesDoublePlusOne(n: number): LadderStep[] {
  return [
    { kind: 'show', title: `Start with 2 × ${n}`, text: `You know 2 × ${n} = ${2 * n}.`, array: { rows: 2, cols: n, caption: `2 rows of ${n} = ${2 * n}` } },
    { kind: 'show', title: 'Add one more group', text: `3 × ${n} is one more ${n}. ${2 * n} + ${n} = ?`, array: { rows: 3, cols: n, fadedRows: 1, caption: `The faded row is the ${n} you add` } },
    { kind: 'try', a: 3, b: n, prompt: `You try: 3 × ${n}` },
  ]
}

export const LADDERS: Ladder[] = [
  { id: 'nines-from-tens', title: 'Build 9s from 10s', subtitle: 'One group less than 10', steps: [...ninesFromTens(4), ...ninesFromTens(7)] },
  { id: 'eights-by-doubling', title: 'Build 8s by doubling', subtitle: 'Double, double, double', steps: [...eightsByDoubling(3), ...eightsByDoubling(6)] },
  { id: 'sixes-from-fives', title: 'Build 6s from 5s', subtitle: 'One group more than 5', steps: [...sixesFromFives(6), ...sixesFromFives(8)] },
  { id: 'fours-double-double', title: '4s: double the double', subtitle: 'Two doubles in a row', steps: [...foursDoubleDouble(6), ...foursDoubleDouble(7)] },
  { id: 'twelves-tens-plus-twos', title: '12s: 10s plus 2s', subtitle: 'Ten groups and two more', steps: [...twelvesTensPlusTwos(4), ...twelvesTensPlusTwos(6)] },
  { id: 'threes-double-plus-one', title: '3s: double plus one', subtitle: 'One group more than double', steps: [...threesDoublePlusOne(7), ...threesDoublePlusOne(8)] },
]
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ladders.ts src/lib/ladders.test.ts
git commit -m "feat: add derivation ladder definitions"
```

---

### Task 15: `LadderModal` component

**Files:**
- Create: `src/components/learn/LadderModal.tsx`
- Modify: `src/components/learn/index.ts`

**Interfaces:**
- Consumes: `Ladder`, `LadderStep`, `LadderTryStep` from `../../lib/ladders`; `MultipleChoice` from `../practice/MultipleChoice`; `VisualArray` from `../practice/VisualArray`; `multiplyOperation.generateChoices`; `Celebration` from `../common`.
- Produces: `<LadderModal ladder={Ladder} onClose={() => void} />`. Try answers are NOT recorded to any store (Learn mode — no wrong answers).

- [ ] **Step 1: Implement**

Create `src/components/learn/LadderModal.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react'
import type { FactProgress } from '../../types'
import type { Ladder, LadderTryStep } from '../../lib/ladders'
import { multiplyOperation } from '../../lib/operations'
import { MultipleChoice } from '../practice/MultipleChoice'
import { VisualArray } from '../practice/VisualArray'
import { Button, Celebration } from '../common'

type LadderModalProps = {
  ladder: Ladder
  onClose: () => void
}

/** Build a throwaway FactProgress so multiplyOperation.generateChoices can run. */
function tryFact(step: LadderTryStep): FactProgress {
  return {
    fact: `${step.a}x${step.b}`, a: step.a, b: step.b, answer: step.a * step.b,
    confidence: 'new', correctCount: 0, incorrectCount: 0,
    lastSeen: null, lastCorrect: null, recentAttempts: [], preferredStrategy: null,
  }
}

export function LadderModal({ ladder, onClose }: LadderModalProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)

  const isComplete = stepIndex >= ladder.steps.length
  const step = isComplete ? null : ladder.steps[stepIndex]

  const choices = useMemo(
    () => (step?.kind === 'try' ? multiplyOperation.generateChoices(tryFact(step), 4) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepIndex]
  )

  const goNext = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    setStepIndex(i => i + 1)
  }
  const goPrev = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    setStepIndex(i => Math.max(0, i - 1))
  }

  const tryAnswered = step?.kind !== 'try' || showResult

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      <Celebration show={isComplete} type="goal" />

      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">{ladder.title}</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <X size={24} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {isComplete ? (
              <div className="text-center py-12 space-y-4">
                <PartyPopper size={48} className="mx-auto text-warm-500" />
                <h3 className="text-2xl font-bold text-gray-800">Nice climbing!</h3>
                <p className="text-gray-600">{ladder.subtitle} — now you can build these yourself.</p>
                <Button onClick={onClose}>Done</Button>
              </div>
            ) : step?.kind === 'show' ? (
              <>
                <div className="bg-sky-50 rounded-2xl p-4">
                  <h3 className="font-semibold text-sky-700 text-lg">{step.title}</h3>
                  <p className="text-gray-700 mt-1">{step.text}</p>
                </div>
                {step.array && (
                  <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                    <VisualArray
                      rows={step.array.rows}
                      cols={step.array.cols}
                      caption={step.array.caption}
                      fadedRows={step.array.fadedRows}
                    />
                  </div>
                )}
              </>
            ) : step ? (
              <>
                <div className="bg-sky-50 rounded-2xl p-4 text-center">
                  <h3 className="font-semibold text-sky-700 text-lg">{step.prompt}</h3>
                </div>
                <MultipleChoice
                  choices={choices}
                  onSelect={(answer) => { setSelectedAnswer(answer); setShowResult(true) }}
                  correctAnswer={step.a * step.b}
                  selectedAnswer={selectedAnswer}
                  showResult={showResult}
                  disabled={showResult}
                />
                {showResult && (
                  <p className="text-center text-gray-600">
                    {selectedAnswer === step.a * step.b
                      ? 'You built it yourself!'
                      : `It's ${step.a * step.b} — look back at the picture and try the next one.`}
                  </p>
                )}
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {!isComplete && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex gap-1">
            {ladder.steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === stepIndex ? 'bg-sky-500' : 'bg-gray-200'}`} />
            ))}
          </div>

          <button
            onClick={goNext}
            disabled={!tryAnswered}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </motion.div>
  )
}
```

Add to `src/components/learn/index.ts`:

```ts
export { LadderModal } from './LadderModal'
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run test && bun run build`
Expected: clean; `wc -l src/components/learn/LadderModal.tsx` ≤ 160.

- [ ] **Step 3: Commit**

```bash
git add src/components/learn/LadderModal.tsx src/components/learn/index.ts
git commit -m "feat: add LadderModal guided derivation sequence"
```

---

### Task 16: Ladder row in LearnView

**Files:**
- Modify: `src/views/LearnView.tsx`

**Interfaces:**
- Consumes: `LADDERS`, `Ladder` from `../lib/ladders`; `LadderModal` from `../components/learn`.

- [ ] **Step 1: Implement**

In `src/views/LearnView.tsx`:

1. Imports:

```ts
import { TrendingUp } from 'lucide-react'
import { LADDERS, type Ladder } from '../lib/ladders'
import { FactCard, VisualExplainer, LadderModal } from '../components/learn'
```

2. State:

```ts
  const [selectedLadder, setSelectedLadder] = useState<Ladder | null>(null)
```

3. Add the ladder row inside the white header block, after the table-buttons `<div className="flex gap-2 overflow-x-auto pb-2">...</div>`:

```tsx
        <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-3">Strategy Ladders</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {LADDERS.map(ladder => (
            <button
              key={ladder.id}
              onClick={() => setSelectedLadder(ladder)}
              className="flex-shrink-0 w-40 text-left bg-sky-50 hover:bg-sky-100 rounded-xl p-3 transition-colors"
            >
              <TrendingUp size={18} className="text-sky-600 mb-1" />
              <div className="font-semibold text-gray-800 text-sm">{ladder.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{ladder.subtitle}</div>
            </button>
          ))}
        </div>
```

4. Render the modal next to the existing VisualExplainer AnimatePresence:

```tsx
      <AnimatePresence>
        {selectedLadder && (
          <LadderModal ladder={selectedLadder} onClose={() => setSelectedLadder(null)} />
        )}
      </AnimatePresence>
```

- [ ] **Step 2: Verify**

Run: `bun run lint && bun run test && bun run build`
Expected: clean; `wc -l src/views/LearnView.tsx` ≤ 140.

Manual check (`bun run dev`): Learn tab shows the Strategy Ladders row; open "Build 9s from 10s" → arrays render, the second step fades one row, the try step offers 4 choices, wrong answers show a gentle correction, completion fires the celebration; Back/Next and the X all work.

- [ ] **Step 3: Commit**

```bash
git add src/views/LearnView.tsx
git commit -m "feat: add strategy ladders row to Learn view"
```

---

### Task 17: Docs and final verification

**Files:**
- Modify: `CLAUDE.md` (project root)

- [ ] **Step 1: Update CLAUDE.md**

In the **Key Concepts → Adaptive Learning** section, update to mention: one skip per goal block with the skipped fact guaranteed to return in the same block (`skippedCount` boosts its priority); confident/mastered require unaided number-pad answers (`hintShown` attempts count toward learning only); correct answers can queue the commuted fact as the next problem.

In **Strategy Hints**, update the strategy list to add `fact_family` (flip it) and `known_anchor` (derived-fact chains), and note hints personalize against confident/mastered facts via `makeKnownFacts`.

In **Project Structure**, add `ladders.ts` and `practiceFlow.ts` to the `lib/` line and note `LadderModal` under `learn/`.

- [ ] **Step 2: Full verification**

Run: `bun run lint && bun run test && bun run build`
Expected: all clean.

Run: `for f in src/views/PracticeView.tsx src/lib/strategies.ts src/lib/ladders.ts src/components/learn/LadderModal.tsx; do wc -l $f; done`
Expected: every file ≤ 300 lines.

Manual smoke pass (`bun run dev`), full loop: skip once (budget + comeback), lean on a hint and answer correctly (confidence stays sub-confident — check the Learn grid), see a flipped-fact follow-up, run one ladder end-to-end.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document skip budget, hint gating, and ladders in CLAUDE.md"
```

- [ ] **Step 4: Finish the branch**

Use superpowers:finishing-a-development-branch to choose merge/PR/cleanup. Reminder for the report: production D1 needs `bun run db:migrate` before deploy (migration 0004).
