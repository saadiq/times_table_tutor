# Division Curriculum — Phase 1: Operation Abstraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce an `Operation` descriptor seam and route all multiplication-specific logic (fact generation, multiple-choice distractors, strategy hints, problem display, speech) through a single `multiplyOperation`, with **zero behavior change**, so Phase 2 can add a `divideOperation` without touching the engine.

**Architecture:** A new `src/lib/operations/` module exports an `Operation` type and a `multiplyOperation` that owns everything operation-specific. A `useActiveOperation()` hook returns the operation for components (Phase 1: always multiply). The generic engine (`adaptive.ts`, `progressStore` confidence/attempt logic, stores, views) is unchanged except to call through the operation instead of multiplication-hardcoded helpers.

**Tech Stack:** React 19 + TypeScript (strict), Zustand, Vite 7, Bun. Tests: Vitest + jsdom (added in Task 1 — the repo currently has no test tooling).

## Global Constraints

- Use **bun / bunx**, never npm / npx. (`bun add`, `bun run`, `bunx`.)
- **Max 300 lines per file** (hard error), max 100 lines per function, cyclomatic complexity ≤ 15.
- **No emojis** anywhere; icons come from `lucide-react`.
- **Zero behavior change** for multiplication in this phase — the app must look and behave identically. The `÷` separator, division facts, curriculum switching, and per-curriculum state are **Phase 2**; backend sync is **Phase 3**.
- TypeScript is strict with `noUnusedLocals` / `noUnusedParameters` and `verbatimModuleSyntax: true` — type-only imports MUST use `import type { ... }`.
- Imports use **no file extension** (match existing code: `import { X } from '../types'`).
- Commit granularly — one logical change per commit, descriptive message.
- Tailwind v4 CSS-first; custom colors are `garden-*`, `warm-*`, `sky-*`.

## Scope note

This is **Phase 1 of 3**. It produces a fully working, multiplication-only app routed through the operation seam. Phase 2 (`…-phase2-division-track.md`) adds the divide operation, curriculum-keyed stores, and the header toggle. Phase 3 (`…-phase3-backend-sync.md`) adds D1/Pages-Function sync for division. Each phase ships independently.

## Files created / modified in this phase

| File | Responsibility | Task |
|------|----------------|------|
| `package.json` | add `vitest`/`jsdom` dev deps + `test` scripts | 1 |
| `vite.config.ts` | add Vitest `test` block (jsdom env) | 1 |
| `tsconfig.app.json` | exclude test files from the production typecheck | 1 |
| `src/test/tooling.test.ts` (create) | proves the runner + DOM env work | 1 |
| `src/lib/operations/types.ts` (create) | the `Operation` / `CurriculumId` / `FormattedProblem` types | 2 |
| `src/lib/operations/multiply.ts` (create) | the `multiplyOperation` — owns fact gen, choices, format, strategy/speech delegation | 2 |
| `src/lib/operations/index.ts` (create) | re-exports + `formatEquation()` helper | 2 |
| `src/lib/adaptive.ts` (modify) | move `generateChoices` body into `multiply.ts`; temporary re-export shim | 2 |
| `src/stores/progressStore.ts` (modify) | generate facts via `multiplyOperation.generateFacts()` | 3 |
| `src/hooks/useActiveOperation.ts` (create) | hook returning the active operation (Phase 1: multiply) | 4 |
| `src/hooks/index.ts` (modify) | export the hook | 4 |
| `src/components/practice/ProblemDisplay.tsx` (modify) | render via `formatProblem`; speak via operation | 4 |
| `src/components/practice/AnswerInput.tsx` (modify) | choices via `operation.generateChoices` | 4 |
| `src/views/PracticeView.tsx` (modify) | strategies/speech/wrong-answer message via operation | 4 |
| `src/components/learn/FactCard.tsx` (modify) | render via `formatProblem` | 5 |
| `src/components/learn/VisualExplainer.tsx` (modify) | strategies + equation via operation | 5 |

**Explicitly deferred to Phase 2 (do NOT touch in Phase 1):** `selectNextFact` focus filter and `checkTableMastery` (they currently encode multiplication's `a||b` table membership, which is correct for multiply — they gain an `operation.matchesTable` seam in Phase 2); `progressStore.loadFromServer` fact-string parsing; `VisualArray.tsx` ("rows × columns" array language); the scene/`progressViewStore`.

---

### Task 1: Set up Vitest test tooling

**Files:**
- Modify: `package.json` (dev deps + scripts)
- Modify: `vite.config.ts:1-6` (import + test block)
- Modify: `tsconfig.app.json:27` (add `exclude`)
- Create: `src/test/tooling.test.ts`

**Interfaces:**
- Produces: a working `bun run test` command and a jsdom DOM environment (so later store tests have `localStorage`).

- [ ] **Step 1: Install dev dependencies**

```bash
bun add -d vitest jsdom
```

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add these two lines after `"lint": "eslint .",`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Add the Vitest config to `vite.config.ts`**

Change the first import line from:

```ts
import { defineConfig } from 'vite'
```

to:

```ts
import { defineConfig } from 'vitest/config'
```

Then add a `test` block as the first key inside the `defineConfig({ ... })` object (immediately before `server: {`):

```ts
  test: {
    environment: 'jsdom',
    globals: false,
  },
```

- [ ] **Step 4: Exclude test files from the production typecheck**

In `tsconfig.app.json`, change the last line from:

```json
  "include": ["src"]
```

to:

```json
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]
```

- [ ] **Step 5: Write the tooling smoke test**

Create `src/test/tooling.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('test tooling', () => {
  it('runs assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('provides a DOM environment with localStorage', () => {
    expect(typeof localStorage).toBe('object')
    localStorage.setItem('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
  })
})
```

- [ ] **Step 6: Run the test to verify tooling works**

Run: `bun run test`
Expected: PASS — 1 file, 2 tests passing.

- [ ] **Step 7: Verify the production build still typechecks**

Run: `bun run build`
Expected: succeeds (tsc + vite build), no errors. Confirms the `test` config and `exclude` didn't break the build.

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock vite.config.ts tsconfig.app.json src/test/tooling.test.ts
git commit -m "test: add vitest + jsdom tooling"
```

---

### Task 2: Operations module (`Operation` type + `multiplyOperation`)

**Files:**
- Create: `src/lib/operations/types.ts`
- Create: `src/lib/operations/multiply.ts`
- Create: `src/lib/operations/index.ts`
- Modify: `src/lib/adaptive.ts:151-191` (replace `generateChoices` with a re-export shim)
- Test: `src/lib/operations/multiply.test.ts`, `src/lib/operations/index.test.ts`

**Interfaces:**
- Produces:
  - `type CurriculumId = 'multiply' | 'divide'`
  - `type FormattedProblem = { left: number; symbol: string; right: number }`
  - `type Operation` with: `id: CurriculumId`, `symbol: string`, `label: string`, `generateFacts(): Record<string, FactProgress>`, `factId(a, b): string`, `formatProblem(f): FormattedProblem`, `generateChoices(f, count?): number[]`, `getStrategies(f): StrategyHint[]`, `speakProblem(f): Promise<void>`, `speakFact(f): Promise<void>`
  - `const multiplyOperation: Operation`
  - `function formatEquation(op: Operation, f: FactProgress): string` → e.g. `"7 × 8 = 56"`
- Consumes: `getStrategiesForFact` (`src/lib/strategies.ts`), `speakProblem`/`speakFact` (`src/lib/speech.ts`), `TIMES_TABLES` (`src/lib/constants.ts`), `FactProgress` (`src/types`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/operations/multiply.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { multiplyOperation } from './multiply'
import type { FactProgress } from '../../types'

function makeFact(a: number, b: number): FactProgress {
  return {
    fact: `${a}x${b}`, a, b, answer: a * b, confidence: 'new',
    correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
    recentAttempts: [], preferredStrategy: null,
  }
}

describe('multiplyOperation', () => {
  it('generates all 144 facts', () => {
    expect(Object.keys(multiplyOperation.generateFacts())).toHaveLength(144)
  })

  it('builds correct fact entries', () => {
    expect(multiplyOperation.generateFacts()['7x8']).toMatchObject({
      a: 7, b: 8, answer: 56, confidence: 'new',
    })
  })

  it('factId uses the x separator', () => {
    expect(multiplyOperation.factId(7, 8)).toBe('7x8')
  })

  it('formats the problem with the times symbol', () => {
    expect(multiplyOperation.formatProblem(makeFact(7, 8))).toEqual({
      left: 7, symbol: '×', right: 8,
    })
  })

  it('generates 4 unique positive choices including the answer', () => {
    const choices = multiplyOperation.generateChoices(makeFact(7, 8), 4)
    expect(choices).toHaveLength(4)
    expect(new Set(choices).size).toBe(4)
    expect(choices).toContain(56)
    expect(choices.every((n) => n > 0)).toBe(true)
  })

  it('always offers the visual-array strategy', () => {
    const ids = multiplyOperation.getStrategies(makeFact(7, 8)).map((s) => s.id)
    expect(ids).toContain('visual_array')
  })
})
```

Create `src/lib/operations/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { multiplyOperation, formatEquation } from './index'
import type { FactProgress } from '../../types'

const fact: FactProgress = {
  fact: '7x8', a: 7, b: 8, answer: 56, confidence: 'new',
  correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
  recentAttempts: [], preferredStrategy: null,
}

describe('formatEquation', () => {
  it('renders a full multiplication equation', () => {
    expect(formatEquation(multiplyOperation, fact)).toBe('7 × 8 = 56')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test`
Expected: FAIL — cannot resolve `./multiply` / `./index` (modules not created yet).

- [ ] **Step 3: Create the `Operation` types**

Create `src/lib/operations/types.ts`:

```ts
import type { FactProgress } from '../../types'
import type { StrategyHint } from '../strategies'

export type CurriculumId = 'multiply' | 'divide'

export type FormattedProblem = {
  left: number
  symbol: string
  right: number
}

/**
 * Everything that differs between curricula (multiplication, division, ...).
 * The generic engine (adaptive scoring, confidence, stores) is operation-agnostic
 * and receives the facts this descriptor produces.
 */
export type Operation = {
  id: CurriculumId
  symbol: string
  label: string
  generateFacts: () => Record<string, FactProgress>
  factId: (a: number, b: number) => string
  formatProblem: (fact: FactProgress) => FormattedProblem
  generateChoices: (fact: FactProgress, count?: number) => number[]
  getStrategies: (fact: FactProgress) => StrategyHint[]
  speakProblem: (fact: FactProgress) => Promise<void>
  speakFact: (fact: FactProgress) => Promise<void>
}
```

- [ ] **Step 4: Create the `multiplyOperation`**

Create `src/lib/operations/multiply.ts`:

```ts
import type { FactProgress } from '../../types'
import type { StrategyHint } from '../strategies'
import type { Operation } from './types'
import { getStrategiesForFact } from '../strategies'
import { speakProblem, speakFact } from '../speech'
import { TIMES_TABLES } from '../constants'

function factId(a: number, b: number): string {
  return `${a}x${b}`
}

function generateFacts(): Record<string, FactProgress> {
  const facts: Record<string, FactProgress> = {}
  for (let a = TIMES_TABLES.min; a <= TIMES_TABLES.max; a++) {
    for (let b = TIMES_TABLES.min; b <= TIMES_TABLES.max; b++) {
      const fact = factId(a, b)
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

function generateChoices(fact: FactProgress, count: number = 4): number[] {
  const correct = fact.answer
  const choices = new Set<number>([correct])

  const mistakes = [
    correct + fact.a,
    correct - fact.a,
    correct + fact.b,
    correct - fact.b,
    fact.a + fact.b,
    correct + 1,
    correct - 1,
    correct + 10,
    correct - 10,
    (fact.a + 1) * fact.b,
    fact.a * (fact.b + 1),
  ].filter((n) => n > 0 && n !== correct)

  const shuffled = mistakes.sort(() => Math.random() - 0.5)
  for (const mistake of shuffled) {
    if (choices.size >= count) break
    choices.add(mistake)
  }

  while (choices.size < count) {
    const random = Math.floor(Math.random() * 144) + 1
    if (random !== correct) choices.add(random)
  }

  return Array.from(choices).sort(() => Math.random() - 0.5)
}

export const multiplyOperation: Operation = {
  id: 'multiply',
  symbol: '×',
  label: 'Multiplication',
  generateFacts,
  factId,
  formatProblem: (fact) => ({ left: fact.a, symbol: '×', right: fact.b }),
  generateChoices,
  getStrategies: (fact): StrategyHint[] => getStrategiesForFact(fact),
  speakProblem: (fact) => speakProblem(fact.a, fact.b),
  speakFact: (fact) => speakFact(fact.a, fact.b, fact.answer),
}
```

- [ ] **Step 5: Create the module index + `formatEquation`**

Create `src/lib/operations/index.ts`:

```ts
import type { FactProgress } from '../../types'
import type { Operation } from './types'
import { multiplyOperation } from './multiply'

export { multiplyOperation }
export type { Operation, CurriculumId, FormattedProblem } from './types'

/** Render a fact as a full equation string, e.g. "7 × 8 = 56". Works for any operation. */
export function formatEquation(op: Operation, fact: FactProgress): string {
  const p = op.formatProblem(fact)
  return `${p.left} ${p.symbol} ${p.right} = ${fact.answer}`
}
```

- [ ] **Step 6: Move `generateChoices` out of `adaptive.ts` (re-export shim)**

In `src/lib/adaptive.ts`, delete the entire `generateChoices` function and its doc comment (the block starting `/**\n * Generate multiple choice options for a fact\n */` through the function's closing brace — originally lines 151-191) and replace it with this single re-export line:

```ts
// generateChoices now lives in the multiply operation; re-exported here for the
// existing AnswerInput import. Removed in Phase 1, Task 4 once AnswerInput uses the operation.
export { generateChoices } from './operations/multiply'
```

(Leave `selectNextFact`, `shouldUseMultipleChoice`, `calculateFactScore`, `getFactDifficulty`, and the date helpers exactly as-is.)

- [ ] **Step 7: Run tests + typecheck to verify everything passes**

Run: `bun run test`
Expected: PASS — `multiply.test.ts` (6 tests) and `index.test.ts` (1 test) green, plus `tooling.test.ts`.

Run: `bun run build`
Expected: succeeds. `AnswerInput.tsx` still imports `generateChoices` from `../../lib/adaptive`, which now resolves to the re-export — no break.

- [ ] **Step 8: Commit**

```bash
git add src/lib/operations src/lib/adaptive.ts
git commit -m "feat: add Operation descriptor and multiplyOperation"
```

---

### Task 3: Generate facts through the operation in `progressStore`

**Files:**
- Modify: `src/stores/progressStore.ts` (remove local `generateAllFacts`, call `multiplyOperation.generateFacts()`)
- Test: `src/stores/progressStore.test.ts`

**Interfaces:**
- Consumes: `multiplyOperation` from `src/lib/operations`.
- Produces: no API change — `useProgressStore` keeps the same shape and methods.

- [ ] **Step 1: Write the failing test**

Create `src/stores/progressStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from './progressStore'

describe('progressStore.initialize', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.setState({ facts: {}, initialized: false })
  })

  it('generates all 144 multiplication facts on a fresh start', () => {
    useProgressStore.getState().initialize()
    const facts = useProgressStore.getState().facts
    expect(Object.keys(facts)).toHaveLength(144)
    expect(facts['7x8'].answer).toBe(56)
    expect(facts['12x12'].answer).toBe(144)
  })
})
```

- [ ] **Step 2: Run the test to verify it passes (current behavior)**

Run: `bun run test src/stores/progressStore.test.ts`
Expected: PASS — this characterizes existing behavior before the refactor, so it should already pass against the current `generateAllFacts`. (If it fails, stop — the refactor would change behavior.)

- [ ] **Step 3: Replace `generateAllFacts` with the operation**

In `src/stores/progressStore.ts`:

(a) Add this import below the existing `import { getMasteryReward } ...` line (around line 6):

```ts
import { multiplyOperation } from '../lib/operations'
```

(b) Delete the entire local `generateAllFacts` function (originally lines 32-55, the block `function generateAllFacts(): Record<string, FactProgress> { ... return facts }`).

(c) In `initialize`, change the `else` branch:

```ts
    } else {
      const facts = generateAllFacts()
```

to:

```ts
    } else {
      const facts = multiplyOperation.generateFacts()
```

(d) In `loadFromServer`, change the merge line:

```ts
    const allFacts = generateAllFacts()
```

to:

```ts
    const allFacts = multiplyOperation.generateFacts()
```

(Leave `TIMES_TABLES` imported — it is still used by `checkTableMastery` and `getMasteredTablesFromFacts`.)

- [ ] **Step 4: Run the test + typecheck**

Run: `bun run test src/stores/progressStore.test.ts`
Expected: PASS — still 144 facts, `7x8 = 56`, `12x12 = 144`.

Run: `bun run build`
Expected: succeeds with no unused-symbol errors (`generateAllFacts` fully removed; `multiplyOperation` used twice).

- [ ] **Step 5: Commit**

```bash
git add src/stores/progressStore.ts src/stores/progressStore.test.ts
git commit -m "refactor: generate facts via multiplyOperation in progressStore"
```

---

### Task 4: `useActiveOperation` hook + rewire the Practice surface

**Files:**
- Create: `src/hooks/useActiveOperation.ts`
- Modify: `src/hooks/index.ts` (add export)
- Modify: `src/components/practice/ProblemDisplay.tsx`
- Modify: `src/components/practice/AnswerInput.tsx`
- Modify: `src/views/PracticeView.tsx`
- Modify: `src/lib/adaptive.ts` (remove the Task 2 `generateChoices` re-export shim)

**Interfaces:**
- Produces: `function useActiveOperation(): Operation` — Phase 1 returns `multiplyOperation` (a stable module singleton; safe in `useMemo`/`useCallback` deps). Phase 2 changes its body to read the active-curriculum store; **no component that uses the hook changes again.**
- Consumes: `multiplyOperation`, `formatEquation` from `src/lib/operations`.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useActiveOperation.ts`:

```ts
import { multiplyOperation } from '../lib/operations'
import type { Operation } from '../lib/operations'

/**
 * Returns the operation for the active curriculum.
 * Phase 1: multiplication is the only curriculum. Phase 2 reads the active-curriculum store.
 */
export function useActiveOperation(): Operation {
  return multiplyOperation
}
```

- [ ] **Step 2: Export the hook**

In `src/hooks/index.ts`, add:

```ts
export { useActiveOperation } from './useActiveOperation'
```

- [ ] **Step 3: Rewire `ProblemDisplay.tsx`**

Replace the entire contents of `src/components/practice/ProblemDisplay.tsx` with:

```tsx
import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import type { FactProgress } from '../../types'
import { useSettingsStore } from '../../stores'
import { useActiveOperation } from '../../hooks'

type ProblemDisplayProps = {
  fact: FactProgress
}

export function ProblemDisplay({ fact }: ProblemDisplayProps) {
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled)
  const operation = useActiveOperation()
  const { left, symbol, right } = operation.formatProblem(fact)

  return (
    <motion.div
      key={fact.fact}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8"
    >
      <div className="text-6xl md:text-7xl font-bold text-gray-800 tracking-tight">
        <span>{left}</span>
        <span className="text-garden-500 mx-3">{symbol}</span>
        <span>{right}</span>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-lg">
        <span>What's the answer?</span>
        {ttsEnabled && (
          <button
            onClick={() => operation.speakProblem(fact)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Hear the problem read aloud"
          >
            <Volume2 size={20} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Rewire `AnswerInput.tsx`**

In `src/components/practice/AnswerInput.tsx`:

(a) Change the import on line 3 from:

```tsx
import { shouldUseMultipleChoice, generateChoices } from '../../lib/adaptive'
```

to:

```tsx
import { shouldUseMultipleChoice } from '../../lib/adaptive'
import { useActiveOperation } from '../../hooks'
```

(b) Inside the component, change the body from:

```tsx
  const useMultipleChoice = shouldUseMultipleChoice(fact)

  const choices = useMemo(() => {
    if (useMultipleChoice) {
      return generateChoices(fact, 4)
    }
    return []
  }, [fact, useMultipleChoice])
```

to:

```tsx
  const operation = useActiveOperation()
  const useMultipleChoice = shouldUseMultipleChoice(fact)

  const choices = useMemo(() => {
    if (useMultipleChoice) {
      return operation.generateChoices(fact, 4)
    }
    return []
  }, [fact, useMultipleChoice, operation])
```

- [ ] **Step 5: Rewire `PracticeView.tsx`**

In `src/views/PracticeView.tsx`:

(a) Remove these two imports (lines 7 and 9):

```tsx
import { getStrategiesForFact } from '../lib/strategies'
```
```tsx
import { speakProblem, speakFact } from '../lib/speech'
```

(b) Add this import (next to the other `../lib` imports):

```tsx
import { useActiveOperation } from '../hooks'
import { formatEquation } from '../lib/operations'
```

(c) Near the top of the component body (right after the `const { focusTables, isEnabled } = useFocusTablesStore()` line), add:

```tsx
  const operation = useActiveOperation()
```

(d) In `nextProblem`, change:

```tsx
      if (ttsEnabled) speakProblem(next.a, next.b)
```

to:

```tsx
      if (ttsEnabled) operation.speakProblem(next)
```

and add `operation` to that `useCallback`'s dependency array (it currently ends `..., getSessionAccuracy, ttsEnabled])` → make it `..., getSessionAccuracy, ttsEnabled, operation])`).

(e) In `speakThenAdvance`, change:

```tsx
    const ttsPromise = ttsEnabled
      ? speakFact(fact.a, fact.b, fact.answer)
      : Promise.resolve()
```

to:

```tsx
    const ttsPromise = ttsEnabled
      ? operation.speakFact(fact)
      : Promise.resolve()
```

and add `operation` to that `useCallback`'s deps (`}, [ttsEnabled])` → `}, [ttsEnabled, operation])`).

(f) In the wrong-answer branch of `handleAnswer`, change:

```tsx
      setMessage(`${displayFact.a} × ${displayFact.b} = ${displayFact.answer}`)
```

to:

```tsx
      setMessage(formatEquation(operation, displayFact))
```

(g) Change the strategies memo from:

```tsx
  const strategies = useMemo(
    () => (displayFact ? getStrategiesForFact(displayFact) : []),
    [displayFact]
  )
```

to:

```tsx
  const strategies = useMemo(
    () => (displayFact ? operation.getStrategies(displayFact) : []),
    [displayFact, operation]
  )
```

- [ ] **Step 6: Remove the temporary `generateChoices` re-export shim**

In `src/lib/adaptive.ts`, delete the re-export line added in Task 2 Step 6:

```ts
// generateChoices now lives in the multiply operation; re-exported here for the
// existing AnswerInput import. Removed in Phase 1, Task 4 once AnswerInput uses the operation.
export { generateChoices } from './operations/multiply'
```

(Nothing imports `generateChoices` from `adaptive` anymore — `AnswerInput` now uses the operation.)

- [ ] **Step 7: Verify typecheck, lint, and tests**

Run: `bun run build`
Expected: succeeds — no unused imports (`getStrategiesForFact`, `speakProblem`, `speakFact` removed from `PracticeView`; `generateChoices` removed from `AnswerInput` and `adaptive`).

Run: `bun run lint`
Expected: no errors.

Run: `bun run test`
Expected: PASS — all existing tests still green.

- [ ] **Step 8: Manual smoke (behavior unchanged)**

Run: `bun run dev`
In the browser: go to Practice. Verify the problem renders as `7 × 8` (real numbers + `×`), multiple-choice options appear for new facts, an answer can be submitted, a wrong answer shows the `a × b = answer` message, and (with TTS on in Settings) the speaker button reads the problem. Everything must look identical to before.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useActiveOperation.ts src/hooks/index.ts src/components/practice/ProblemDisplay.tsx src/components/practice/AnswerInput.tsx src/views/PracticeView.tsx src/lib/adaptive.ts
git commit -m "refactor: route Practice surface through useActiveOperation"
```

---

### Task 5: Rewire the Learn surface

**Files:**
- Modify: `src/components/learn/FactCard.tsx`
- Modify: `src/components/learn/VisualExplainer.tsx`

**Interfaces:**
- Consumes: `useActiveOperation` (`src/hooks`), `formatEquation` (`src/lib/operations`).

- [ ] **Step 1: Rewire `FactCard.tsx`**

In `src/components/learn/FactCard.tsx`:

(a) Add this import below `import { Circle, CircleDot, CircleCheck, Star } from 'lucide-react'`:

```tsx
import { useActiveOperation } from '../../hooks'
```

(b) Change the component body from:

```tsx
export function FactCard({ fact, onClick }: FactCardProps) {
  const Icon = confidenceIcons[fact.confidence]
```

to:

```tsx
export function FactCard({ fact, onClick }: FactCardProps) {
  const Icon = confidenceIcons[fact.confidence]
  const { left, symbol, right } = useActiveOperation().formatProblem(fact)
```

(c) Change the fact label from:

```tsx
      <div className="text-lg font-bold text-gray-800">
        {fact.a} × {fact.b}
      </div>
```

to:

```tsx
      <div className="text-lg font-bold text-gray-800">
        {left} {symbol} {right}
      </div>
```

- [ ] **Step 2: Rewire `VisualExplainer.tsx`**

In `src/components/learn/VisualExplainer.tsx`:

(a) Change the strategies import line:

```tsx
import { getStrategiesForFact } from '../../lib/strategies'
```

to:

```tsx
import { useActiveOperation } from '../../hooks'
import { formatEquation } from '../../lib/operations'
```

(b) Change:

```tsx
  const strategies = getStrategiesForFact(fact)
```

to:

```tsx
  const operation = useActiveOperation()
  const strategies = operation.getStrategies(fact)
```

(c) Change the equation header (line 31):

```tsx
          {fact.a} × {fact.b} = {fact.answer}
```

to:

```tsx
          {formatEquation(operation, fact)}
```

- [ ] **Step 3: Verify typecheck, lint, and tests**

Run: `bun run build`
Expected: succeeds.

Run: `bun run lint`
Expected: no errors.

Run: `bun run test`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Run: `bun run dev`
In the browser: go to Learn, pick a table, confirm cards render `7 × 8` with the answer, open a fact's Visual Explainer and confirm the `7 × 8 = 56` header and strategy steps look unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/learn/FactCard.tsx src/components/learn/VisualExplainer.tsx
git commit -m "refactor: route Learn surface through useActiveOperation"
```

---

### Task 6: Phase 1 integration verification

**Files:** none (verification only).

- [ ] **Step 1: Full check**

Run: `bun run lint && bun run build && bun run test`
Expected: all three succeed — lint clean, build green, all tests passing.

- [ ] **Step 2: Confirm no multiplication-hardcoding leaked outside the operation**

Run: `grep -rn "generateAllFacts" src` → expect **no matches**.
Run: `grep -rn "getStrategiesForFact" src` → expect matches only in `src/lib/strategies.ts` (definition) and `src/lib/operations/multiply.ts` (the operation delegating to it).
Run: `grep -rn "generateChoices" src` → expect matches only in `src/lib/operations/multiply.ts` and its test.

- [ ] **Step 3: Final manual regression**

Run: `bun run dev`. Exercise Practice (new fact → multiple choice, confident fact → number pad, wrong answer → hint + message), Learn (cards + visual explainer), and TTS. Behavior must be identical to `main`.

- [ ] **Step 4: Tag the phase complete (optional commit if anything was touched)**

If steps 1-3 surfaced any fix, commit it. Otherwise Phase 1 is complete — the operation seam is in place and multiplication is unchanged.

---

## Self-Review

- **Spec coverage (Phase 1 portion):** The spec's "Operation descriptor" (§1) is created in Task 2 with `generateFacts`/`factId`/`formatProblem`/`generateChoices`/`getStrategies`/`symbol`/`speak`. `matchesTable` and `scene` are intentionally deferred (documented under "deferred to Phase 2") because nothing consumes them until division exists — adding them now would be dead code. The spec's stores, navigation toggle, division content, scene, and backend are explicitly Phases 2-3.
- **Placeholder scan:** No "TBD"/"handle edge cases"/"similar to" — every code step shows complete code; every command shows expected output. The Task 2 re-export shim is a real, intentional line removed in Task 4 (documented), not a placeholder.
- **Type consistency:** `Operation`, `CurriculumId`, `FormattedProblem`, `multiplyOperation`, `formatEquation`, and `useActiveOperation` are spelled identically across the type definition (Task 2), consumers (Tasks 3-5), and the `import type` (verbatimModuleSyntax) rules. `formatProblem` returns `{ left, symbol, right }` everywhere it's destructured.
