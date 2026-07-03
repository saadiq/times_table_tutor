# Division Curriculum — Phase 2: Division Track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the division curriculum as a fully working second track: a `divideOperation`, curriculum-keyed store slices, a persistent `× | ÷` header toggle, division strategies/speech/choices, and a division-specific scene theme (own palette + 12 new characters) — with multiplication behavior and stored data unchanged.

**Architecture:** The `Operation` descriptor (Phase 1) gains the fields the second curriculum needs (`symbol`, per-surface copy, `factId`, `tableOf`, `matchesTable`) plus a `getOperation(id)` registry. A tiny `curriculumStore` holds the active track; `progressStore`/`progressViewStore`/`focusTablesStore` each hold only the *active* curriculum's slice in memory and swap slices on toggle, persisting multiply under its existing localStorage keys (zero migration) and divide under new `ttt_*_divide` keys. Views are keyed by curriculum in `App` so a toggle remounts them cleanly. The p5 scene engine is parameterized by a `SceneTheme` (palette + animal set + reveal copy); multiplication keeps its exact current visuals, division gets a twilight-pond theme.

**Tech Stack:** React 19 + TypeScript (strict), Zustand, Vite 7, Bun, Vitest (node env, localStorage polyfill in `src/test/setup.ts`), p5.js, Framer Motion, lucide-react.

## Global Constraints

- Use **bun / bunx**, never npm / npx.
- **Max 300 lines per file** (hard error), max 100 lines per function, cyclomatic complexity ≤ 15. `progressStore.ts` is currently 314 lines (pre-existing debt) — Task 5 must bring it under 300 via the `factConfidence` extraction.
- **No emojis**; icons come from `lucide-react`.
- **Zero behavior or stored-data change for multiplication.** Multiply keeps localStorage keys `ttt_progress`, `ttt_progress_view`, `ttt_focus_tables` unchanged. A learner's existing multiply progress must survive this phase untouched.
- **Division is local-only in Phase 2**: no division data is sent to the backend (`toSyncPayload` returns `null` for divide). D1 sync is Phase 3. Consequence (accepted, documented): division progress does not follow a profile across devices and is cleared on profile switch.
- Division facts: divisor 1–12, quotient 1–12, **no remainders** — the 144 `(a, b)` pairs where `a` = quotient (= `answer`), `b` = divisor, dividend = `a*b`. Fact key format: `` `${a*b}÷${b}` `` (e.g. `(8,7) → "56÷7"`).
- Division "table N" = **divisor `b === N`**; multiplication "table N" = `a === N || b === N`.
- The session streak/attempt history (`attemptsStore`, `sessionStore` streak days) stays **account-global**; switching curriculum resets only the in-flight run (`sessionStore.resetProgress()`).
- TypeScript strict, `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax: true` — type-only imports MUST use `import type { ... }`. Imports use **no file extension**.
- Tests run in the node environment; `src/test/setup.ts` polyfills `localStorage` and clears it before each test. Shared fixture: `makeFact` in `src/test/factories.ts` (multiplication-shaped).
- Commit granularly — one logical change per commit, descriptive message.
- Tailwind v4 CSS-first; custom colors `garden-*`, `warm-*`, `sky-*`.

## Scope note

This is **Phase 2 of 3** (Phase 1: operation abstraction, complete; Phase 3: D1/Pages-Function sync for division). One deliberate deviation from the design doc: the spec sketched a `scene` field on the `Operation` descriptor; this plan implements it as a **scene-theme registry in `src/components/progress/`** keyed by `CurriculumId` instead, so `src/lib/` stays free of rendering data. Same lookup key, same per-curriculum behavior.

## Files created / modified in this phase

| File | Responsibility | Task |
|------|----------------|------|
| `src/lib/operations/types.ts` (modify) | add `symbol`, `copy`, `factId`, `tableOf`, `matchesTable` to `Operation` | 1 |
| `src/lib/operations/shuffle.ts` (create) | shared Fisher-Yates (lifted from `multiply.ts`) | 1 |
| `src/lib/operations/multiply.ts` (modify) | implement the new fields for multiply | 1 |
| `src/lib/operations/index.ts` (modify) | `getOperation(id)` registry | 1 |
| `src/types/index.ts` (modify) | extend `Strategy` union with division ids | 2 |
| `src/lib/strategies.ts` (modify) | `StrategyHint` gains optional `arrayCaption` | 2 |
| `src/lib/divisionStrategies.ts` (create) | `getStrategiesForDivisionFact` | 2 |
| `src/lib/speech.ts` (modify) | `speakDivisionProblem` / `speakDivisionFact` | 2 |
| `src/lib/operations/divide.ts` (create) | the `divideOperation` | 3 |
| `src/lib/storage.ts` (modify) | new keys: `curriculum`, `progressDivide`, `progressViewDivide`, `focusTablesDivide`; `clearFromStorage` | 4 |
| `src/stores/curriculumStore.ts` (create) | active curriculum, persisted | 4 |
| `src/hooks/useActiveOperation.ts` (modify) | read the curriculum store | 4 |
| `src/stores/index.ts` (modify) | export curriculumStore | 4 |
| `src/App.tsx` (modify) | init curriculum first (Task 4); key views by curriculum (Task 8) | 4, 8 |
| `src/lib/factConfidence.ts` (create) | confidence calc + attempt migration (extracted from progressStore) | 5 |
| `src/stores/progressStore.ts` (modify) | curriculum slices, generic table mastery, sync guard | 5 |
| `src/lib/resetStores.ts` (modify) | clear division slices on profile switch | 5 |
| `src/stores/focusTablesStore.ts` (modify) | curriculum slices | 6 |
| `src/stores/progressViewStore.ts` (modify) | curriculum slices; drop `TABLE_CHARACTERS` export (Task 10) | 6, 10 |
| `src/lib/adaptive.ts` (modify) | `selectNextFact` takes a `matchesTable` predicate | 7 |
| `src/views/PracticeView.tsx` (modify) | pass `operation.matchesTable` to selection | 7 |
| `src/lib/switchCurriculum.ts` (create) | orchestrates the store swap + session reset | 8 |
| `src/components/common/CurriculumToggle.tsx` (create) | the `× | ÷` segmented control | 8 |
| `src/components/common/Layout.tsx` (modify) | header hosting the toggle | 8 |
| `src/components/common/index.ts` (modify) | export CurriculumToggle | 8 |
| `src/views/LearnView.tsx` (modify) | group facts via `tableOf`, operation copy | 9 |
| `src/components/common/SettingsModal.tsx` (modify) | operation focus copy | 9 |
| `src/components/common/FocusTablePicker.tsx` (modify) | aria labels via `tableLabel` | 9 |
| `src/components/progress/MasteryGrid.tsx` (modify) | cell lookup via `factId`, aria via `formatEquation` | 9 |
| `src/components/practice/VisualArray.tsx` (modify) | optional `caption` prop | 9 |
| `src/components/practice/HintPanel.tsx` (modify) | pass `strategy.arrayCaption` | 9 |
| `src/components/learn/VisualExplainer.tsx` (modify) | pass `strategy.arrayCaption` | 9 |
| `src/components/progress/p5/types.ts` (modify) | `HSB`, `ScenePalette`, `AnimalDrawer`, `SceneVisuals` (Task 10); twilight animal types (Task 11) | 10, 11 |
| `src/components/progress/p5/colors.ts` (modify) | type `PALETTE` as `ScenePalette` (10); `TWILIGHT_PALETTE` (11) | 10, 11 |
| `src/components/progress/p5/elements.ts` (modify) | draw from `ctx.palette` | 10 |
| `src/components/progress/p5/animals.ts` (modify) | keep the 12 forest drawers, export `FOREST_DRAWERS` | 10 |
| `src/components/progress/p5/drawAnimal.ts` (create) | slot positions + drawer dispatch | 10 |
| `src/components/progress/p5/scene.ts` (modify) | `generateScene(w, h, visuals)`, palette-driven | 10 |
| `src/components/progress/p5/useP5.ts` (modify) | thread `visuals` through | 10 |
| `src/components/progress/sceneThemes.ts` (create) | `SceneTheme` registry (multiply in 10, divide in 11) | 10, 11 |
| `src/components/progress/ProgressScene.tsx` (modify) | resolve theme, pass visuals | 10 |
| `src/components/progress/CharacterBar.tsx` (modify) | characters + icons from theme | 10 |
| `src/components/progress/RevealSequence.tsx` (modify) | tier messages / landmark copy from theme + operation | 10 |
| `src/components/progress/ProgressView.tsx` (modify) | empty-state copy from theme | 10 |
| `src/components/progress/p5/animalsTwilight.ts` (create) | 12 twilight animal drawers | 11 |

**Explicitly out of scope (do NOT touch):** backend (`functions/`, `wrangler.toml`, migrations — Phase 3), `attemptsStore`/`ActivityCalendar`/`StatsSheet` aggregation (attempt history stays account-global; division fact keys are distinct so no collisions), legacy `gardenStore` (division table mastery may award coins/items through the existing generic path — acceptable), `ProblemDisplay`/`AnswerInput`/`MultipleChoice`/`NumberPad` (already operation-driven; quotients ≤ 12 fit the NumberPad), `CharacterSparkle` positions in `ProgressScene` (slot positions are shared across themes).

---

### Task 1: Operation seam expansion (multiply-only, zero behavior change)

**Files:**
- Modify: `src/lib/operations/types.ts`
- Create: `src/lib/operations/shuffle.ts`
- Modify: `src/lib/operations/multiply.ts`
- Modify: `src/lib/operations/index.ts`
- Test: `src/lib/operations/multiply.test.ts` (extend)

**Interfaces:**
- Produces (consumed by Tasks 3–9):
  - `Operation` gains: `symbol: string`; `copy: OperationCopy` where `OperationCopy = { label: string; tablePickerTitle: string; focusTitle: string; tableLabel: (table: number) => string; tableMasteryText: (table: number) => string; focusSummary: (tables: number[]) => string }`; `factId: (a: number, b: number) => string`; `tableOf: (fact: FactProgress) => number`; `matchesTable: (fact: FactProgress, table: number) => boolean`
  - `function getOperation(id: CurriculumId): Operation` from `src/lib/operations`
  - `function shuffle<T>(items: T[]): T[]` from `src/lib/operations/shuffle`
- Consumes: existing Phase 1 module shape.

- [ ] **Step 1: Write the failing tests**

Append to the `describe('multiplyOperation', ...)` block in `src/lib/operations/multiply.test.ts`:

```ts
  it('exposes the times symbol and labels', () => {
    expect(multiplyOperation.symbol).toBe('×')
    expect(multiplyOperation.copy.label).toBe('Multiplication')
    expect(multiplyOperation.copy.tableLabel(7)).toBe('7 Times Table')
    expect(multiplyOperation.copy.tableMasteryText(7)).toBe('You mastered your 7s!')
    expect(multiplyOperation.copy.focusSummary([3, 5])).toBe('Practicing: 3, 5 times tables')
  })

  it('keys facts by factId', () => {
    expect(multiplyOperation.factId(7, 8)).toBe('7x8')
  })

  it('groups a fact under its a-factor table for Learn', () => {
    expect(multiplyOperation.tableOf(makeFact(7, 8))).toBe(7)
  })

  it('matches a table when either factor equals it', () => {
    expect(multiplyOperation.matchesTable(makeFact(7, 8), 7)).toBe(true)
    expect(multiplyOperation.matchesTable(makeFact(7, 8), 8)).toBe(true)
    expect(multiplyOperation.matchesTable(makeFact(7, 8), 3)).toBe(false)
  })
```

Create `src/lib/operations/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getOperation, multiplyOperation } from './index'

describe('getOperation', () => {
  it('resolves the multiply operation', () => {
    expect(getOperation('multiply')).toBe(multiplyOperation)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test`
Expected: FAIL — `symbol`, `copy`, `factId`, `tableOf`, `matchesTable` do not exist on `Operation`; `getOperation` is not exported.

- [ ] **Step 3: Extend the `Operation` type**

Replace the `Operation`-related content of `src/lib/operations/types.ts` (keep the file's imports and `CurriculumId`/`FormattedProblem` as-is) so the file reads:

```ts
import type { FactProgress } from '../../types'
import type { StrategyHint } from '../strategies'

export type CurriculumId = 'multiply' | 'divide'

export type FormattedProblem = {
  left: number
  symbol: string
  right: number
}

/** Learner-facing wording that differs between curricula. */
export type OperationCopy = {
  label: string
  tablePickerTitle: string
  focusTitle: string
  tableLabel: (table: number) => string
  tableMasteryText: (table: number) => string
  focusSummary: (tables: number[]) => string
}

/**
 * Everything that differs between curricula (multiplication, division, ...).
 * The generic engine (adaptive scoring, confidence, stores) is operation-agnostic
 * and receives the facts this descriptor produces.
 * - tableOf: the table a fact is listed under in Learn (multiply: a; divide: the divisor b)
 * - matchesTable: table membership for the focus filter and mastery checks
 *   (multiply: a or b; divide: divisor b only)
 */
export type Operation = {
  id: CurriculumId
  symbol: string
  copy: OperationCopy
  factId: (a: number, b: number) => string
  tableOf: (fact: FactProgress) => number
  matchesTable: (fact: FactProgress, table: number) => boolean
  generateFacts: () => Record<string, FactProgress>
  formatProblem: (fact: FactProgress) => FormattedProblem
  generateChoices: (fact: FactProgress, count?: number) => number[]
  getStrategies: (fact: FactProgress) => StrategyHint[]
  speakProblem: (fact: FactProgress) => Promise<void>
  speakFact: (fact: FactProgress) => Promise<void>
}
```

- [ ] **Step 4: Lift `shuffle` into a shared module**

Create `src/lib/operations/shuffle.ts`:

```ts
/** Unbiased Fisher-Yates shuffle; a random sort comparator skews positions. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
```

In `src/lib/operations/multiply.ts`, delete the local `shuffle` function (the `/** Unbiased Fisher-Yates shuffle ... */` comment through its closing brace) and add to the imports:

```ts
import { shuffle } from './shuffle'
```

- [ ] **Step 5: Implement the new fields on `multiplyOperation`**

In `src/lib/operations/multiply.ts`, replace the exported descriptor with:

```ts
export const multiplyOperation: Operation = {
  id: 'multiply',
  symbol: MULTIPLY_SYMBOL,
  copy: {
    label: 'Multiplication',
    tablePickerTitle: 'Choose a Times Table',
    focusTitle: 'Focus Tables',
    tableLabel: (table) => `${table} Times Table`,
    tableMasteryText: (table) => `You mastered your ${table}s!`,
    focusSummary: (tables) => `Practicing: ${tables.join(', ')} times tables`,
  },
  factId,
  tableOf: (fact) => fact.a,
  matchesTable: (fact, table) => fact.a === table || fact.b === table,
  generateFacts,
  formatProblem: (fact) => ({ left: fact.a, symbol: MULTIPLY_SYMBOL, right: fact.b }),
  generateChoices,
  getStrategies: getStrategiesForFact,
  speakProblem: (fact) => speakProblem(fact.a, fact.b),
  speakFact: (fact) => speakFact(fact.a, fact.b, fact.answer),
}
```

(The private `factId` function already exists in the file; it now also backs the public field.)

- [ ] **Step 6: Add the operation registry**

Replace `src/lib/operations/index.ts` with:

```ts
import type { FactProgress } from '../../types'
import type { CurriculumId, Operation } from './types'
import { multiplyOperation } from './multiply'

export { multiplyOperation }
export type { Operation, OperationCopy, CurriculumId, FormattedProblem } from './types'

const OPERATIONS: Record<CurriculumId, Operation> = {
  multiply: multiplyOperation,
  // Task 3 registers divideOperation here.
  divide: multiplyOperation,
}

/** Resolve the operation descriptor for a curriculum. */
export function getOperation(id: CurriculumId): Operation {
  return OPERATIONS[id]
}

/** Render a fact as a full equation string, e.g. "7 × 8 = 56". Works for any operation. */
export function formatEquation(op: Operation, fact: FactProgress): string {
  const p = op.formatProblem(fact)
  return `${p.left} ${p.symbol} ${p.right} = ${fact.answer}`
}
```

(The temporary `divide: multiplyOperation` entry is required because `Record<CurriculumId, Operation>` needs both keys; Task 3 replaces it. Nothing can reach it before Task 8 ships the toggle.)

- [ ] **Step 7: Run tests, lint, build**

Run: `bun run test` — Expected: PASS (all suites, including the new assertions).
Run: `bun run lint && bun run build` — Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/operations src/lib/operations/registry.test.ts
git commit -m "feat: expand Operation seam with symbol, copy, factId, tableOf, matchesTable"
```

---

### Task 2: Division strategies + division speech

**Files:**
- Modify: `src/types/index.ts` (Strategy union)
- Modify: `src/lib/strategies.ts` (`StrategyHint.arrayCaption`)
- Create: `src/lib/divisionStrategies.ts`
- Modify: `src/lib/speech.ts`
- Test: `src/lib/divisionStrategies.test.ts`

**Interfaces:**
- Produces:
  - `Strategy` union gains `'inverse_multiplication' | 'fact_family' | 'halving'`
  - `StrategyHint` gains `arrayCaption?: string` (caption override for the `visual: 'array'` display; Task 9 wires it into `VisualArray`)
  - `function getStrategiesForDivisionFact(fact: FactProgress): StrategyHint[]` from `src/lib/divisionStrategies`
  - `function speakDivisionProblem(dividend: number, divisor: number): Promise<void>` and `function speakDivisionFact(dividend: number, divisor: number, quotient: number): Promise<void>` from `src/lib/speech`
- Consumes: `StrategyHint` type from `src/lib/strategies`; division fact convention `a` = quotient, `b` = divisor.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/divisionStrategies.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getStrategiesForDivisionFact } from './divisionStrategies'
import type { FactProgress } from '../types'

/** Division fact: a = quotient (the answer), b = divisor, dividend = a*b. */
function makeDivisionFact(quotient: number, divisor: number): FactProgress {
  return {
    fact: `${quotient * divisor}÷${divisor}`, a: quotient, b: divisor,
    answer: quotient, confidence: 'new',
    correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
    recentAttempts: [], preferredStrategy: null,
  }
}

describe('getStrategiesForDivisionFact', () => {
  it('always anchors on inverse multiplication with an array caption', () => {
    const strategies = getStrategiesForDivisionFact(makeDivisionFact(8, 7))
    const anchor = strategies.find((s) => s.id === 'inverse_multiplication')
    expect(anchor).toBeDefined()
    expect(anchor?.visual).toBe('array')
    expect(anchor?.arrayCaption).toBe('56 dots in rows of 7 — how many rows?')
  })

  it('offers the fact family when quotient and divisor differ', () => {
    const ids = getStrategiesForDivisionFact(makeDivisionFact(8, 7)).map((s) => s.id)
    expect(ids).toContain('fact_family')
    const squareIds = getStrategiesForDivisionFact(makeDivisionFact(6, 6)).map((s) => s.id)
    expect(squareIds).not.toContain('fact_family')
  })

  it('offers skip counting for small divisors only', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(8, 3)).map((s) => s.id)).toContain('skip_counting')
    expect(getStrategiesForDivisionFact(makeDivisionFact(8, 7)).map((s) => s.id)).not.toContain('skip_counting')
  })

  it('offers halving for divisor 2', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(9, 2)).map((s) => s.id)).toContain('halving')
  })

  it('offers the ones rule for divisor 1 and the self rule for quotient 1', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(9, 1)).map((s) => s.id)).toContain('ones_zeros')
    expect(getStrategiesForDivisionFact(makeDivisionFact(1, 9)).map((s) => s.id)).toContain('ones_zeros')
  })

  it('offers the tens trick for divisor 10', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(7, 10)).map((s) => s.id)).toContain('tens_trick')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/lib/divisionStrategies.test.ts`
Expected: FAIL — cannot resolve `./divisionStrategies`.

- [ ] **Step 3: Extend the `Strategy` union**

In `src/types/index.ts`, replace the `Strategy` type with:

```ts
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
  | 'inverse_multiplication'
  | 'fact_family'
  | 'halving'
```

- [ ] **Step 4: Add `arrayCaption` to `StrategyHint`**

In `src/lib/strategies.ts`, replace the `StrategyHint` type with:

```ts
export type StrategyHint = {
  id: Strategy
  name: string
  description: string
  steps: string[]
  visual?: 'array' | 'number_line' | 'groups'
  /** Caption under the array visual; defaults to the multiplication rows x columns text. */
  arrayCaption?: string
}
```

- [ ] **Step 5: Create the division strategies**

Create `src/lib/divisionStrategies.ts`:

```ts
import type { FactProgress } from '../types'
import type { StrategyHint } from './strategies'

/**
 * Strategies for a division fact. By convention a = quotient (the answer),
 * b = divisor, dividend = a*b — see divideOperation.
 */
export function getStrategiesForDivisionFact(fact: FactProgress): StrategyHint[] {
  const quotient = fact.a
  const divisor = fact.b
  const dividend = quotient * divisor
  const strategies: StrategyHint[] = []

  // The anchor: division is multiplication in reverse
  strategies.push({
    id: 'inverse_multiplication',
    name: 'Think Multiplication',
    description: `${divisor} × ? = ${dividend}`,
    steps: [
      'Division is multiplication in reverse.',
      `Ask: ${divisor} times what makes ${dividend}?`,
      'That missing number is your answer!',
    ],
    visual: 'array',
    arrayCaption: `${dividend} dots in rows of ${divisor} — how many rows?`,
  })

  if (quotient !== divisor) {
    strategies.push({
      id: 'fact_family',
      name: 'Fact Family',
      description: `${quotient}, ${divisor}, and ${dividend} are a family`,
      steps: [
        `${quotient} × ${divisor} = ${dividend}`,
        `${divisor} × ${quotient} = ${dividend}`,
        `So ${dividend} ÷ ${divisor} = ?`,
      ],
    })
  }

  if (divisor <= 6) {
    const previewCount = Math.min(3, quotient)
    const preview = Array.from({ length: previewCount }, (_, i) => divisor * (i + 1))
    strategies.push({
      id: 'skip_counting',
      name: 'Skip Count',
      description: `Count by ${divisor}s up to ${dividend}`,
      steps: [
        `Count by ${divisor}s: ${preview.join(', ')}...`,
        `Keep going until you reach ${dividend}.`,
        'How many counts did it take? That is your answer!',
      ],
    })
  }

  if (divisor === 2) {
    strategies.push({
      id: 'halving',
      name: 'Half It',
      description: 'Dividing by 2 means cutting in half',
      steps: [
        `Split ${dividend} into two equal parts.`,
        `What is half of ${dividend}?`,
      ],
    })
  }

  if (divisor === 1) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Ones Rule',
      description: 'Dividing by 1 changes nothing',
      steps: [
        'Any number divided by 1 stays the same!',
        `What is ${dividend} divided by 1?`,
      ],
    })
  }

  if (quotient === 1) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Same Number Rule',
      description: 'A number divided by itself is 1',
      steps: [
        `${dividend} and ${divisor} are the same number.`,
        'Any number divided by itself equals 1!',
      ],
    })
  }

  if (divisor === 10) {
    strategies.push({
      id: 'tens_trick',
      name: 'Tens Trick',
      description: 'Take away the zero',
      steps: [
        `${dividend} ends in a zero.`,
        'Dividing by 10 just removes that zero!',
      ],
    })
  }

  return strategies
}
```

- [ ] **Step 6: Add division speech**

In `src/lib/speech.ts`, add below the existing `speakFact` function:

```ts
export function speakDivisionProblem(dividend: number, divisor: number): Promise<void> {
  return speak(`${numberToWords(dividend)} divided by ${numberToWords(divisor)}`)
}

export function speakDivisionFact(dividend: number, divisor: number, quotient: number): Promise<void> {
  return speak(
    `${numberToWords(dividend)} divided by ${numberToWords(divisor)} equals ${numberToWords(quotient)}`
  )
}
```

- [ ] **Step 7: Run tests, lint, build**

Run: `bun run test` — Expected: PASS (6 new tests green, all existing suites green).
Run: `bun run lint && bun run build` — Expected: clean. (`speakDivision*` are exported and consumed in Task 3; `noUnusedLocals` does not flag exports.)

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/strategies.ts src/lib/divisionStrategies.ts src/lib/divisionStrategies.test.ts src/lib/speech.ts
git commit -m "feat: add division strategies and division speech"
```

---

### Task 3: The `divideOperation`

**Files:**
- Create: `src/lib/operations/divide.ts`
- Modify: `src/lib/operations/index.ts` (register it)
- Test: `src/lib/operations/divide.test.ts`

**Interfaces:**
- Produces: `const divideOperation: Operation` — `getOperation('divide')` now resolves to it.
- Consumes: `Operation` type (Task 1), `shuffle` (Task 1), `getStrategiesForDivisionFact` + `speakDivision*` (Task 2), `TIMES_TABLES` from `src/lib/constants`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/operations/divide.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { divideOperation } from './divide'
import type { FactProgress } from '../../types'

function makeDivisionFact(quotient: number, divisor: number): FactProgress {
  return {
    fact: `${quotient * divisor}÷${divisor}`, a: quotient, b: divisor,
    answer: quotient, confidence: 'new',
    correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
    recentAttempts: [], preferredStrategy: null,
  }
}

describe('divideOperation', () => {
  it('generates 144 distinct division facts', () => {
    const facts = divideOperation.generateFacts()
    expect(Object.keys(facts)).toHaveLength(144)
  })

  it('builds facts where the answer is the quotient', () => {
    const facts = divideOperation.generateFacts()
    expect(facts['56÷7']).toMatchObject({ a: 8, b: 7, answer: 8, confidence: 'new' })
    expect(facts['56÷8']).toMatchObject({ a: 7, b: 8, answer: 7 })
    expect(facts['144÷12']).toMatchObject({ a: 12, b: 12, answer: 12 })
  })

  it('keys facts as dividend÷divisor', () => {
    expect(divideOperation.factId(8, 7)).toBe('56÷7')
    expect(divideOperation.factId(7, 8)).toBe('56÷8')
  })

  it('formats the problem as dividend ÷ divisor', () => {
    expect(divideOperation.formatProblem(makeDivisionFact(8, 7))).toEqual({
      left: 56, symbol: '÷', right: 7,
    })
  })

  it('generates 4 unique choices in quotient range including the answer', () => {
    for (let i = 0; i < 20; i++) {
      const choices = divideOperation.generateChoices(makeDivisionFact(8, 7), 4)
      expect(choices).toHaveLength(4)
      expect(new Set(choices).size).toBe(4)
      expect(choices).toContain(8)
      expect(choices.every((n) => n >= 1 && n <= 12)).toBe(true)
    }
  })

  it('matches a table by divisor only', () => {
    expect(divideOperation.matchesTable(makeDivisionFact(8, 7), 7)).toBe(true)
    expect(divideOperation.matchesTable(makeDivisionFact(8, 7), 8)).toBe(false)
  })

  it('groups facts under their divisor for Learn', () => {
    expect(divideOperation.tableOf(makeDivisionFact(8, 7))).toBe(7)
  })

  it('offers the inverse-multiplication strategy', () => {
    const ids = divideOperation.getStrategies(makeDivisionFact(8, 7)).map((s) => s.id)
    expect(ids).toContain('inverse_multiplication')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/lib/operations/divide.test.ts`
Expected: FAIL — cannot resolve `./divide`.

- [ ] **Step 3: Create the operation**

Create `src/lib/operations/divide.ts`:

```ts
import type { FactProgress } from '../../types'
import type { Operation } from './types'
import { shuffle } from './shuffle'
import { getStrategiesForDivisionFact } from '../divisionStrategies'
import { speakDivisionProblem, speakDivisionFact } from '../speech'
import { TIMES_TABLES } from '../constants'

const DIVIDE_SYMBOL = '÷'

/** a = quotient (the answer the learner types), b = divisor, dividend = a*b. */
function factId(a: number, b: number): string {
  return `${a * b}${DIVIDE_SYMBOL}${b}`
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
        answer: a,
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

  // Plausible mistakes stay in quotient range: off-by-one/two quotients,
  // or answering with (near) the divisor.
  const mistakes = [
    correct + 1,
    correct - 1,
    correct + 2,
    correct - 2,
    fact.b,
    fact.b + 1,
    fact.b - 1,
  ].filter((n) => n >= TIMES_TABLES.min && n <= TIMES_TABLES.max && n !== correct)

  for (const mistake of shuffle(mistakes)) {
    if (choices.size >= count) break
    choices.add(mistake)
  }

  while (choices.size < count) {
    const random = Math.floor(Math.random() * TIMES_TABLES.max) + 1
    if (random !== correct) choices.add(random)
  }

  return shuffle(Array.from(choices))
}

export const divideOperation: Operation = {
  id: 'divide',
  symbol: DIVIDE_SYMBOL,
  copy: {
    label: 'Division',
    tablePickerTitle: 'Choose a Number to Divide By',
    focusTitle: 'Focus Divisors',
    tableLabel: (table) => `Dividing by ${table}`,
    tableMasteryText: (table) => `You mastered dividing by ${table}!`,
    focusSummary: (tables) => `Practicing: dividing by ${tables.join(', ')}`,
  },
  factId,
  tableOf: (fact) => fact.b,
  matchesTable: (fact, table) => fact.b === table,
  generateFacts,
  formatProblem: (fact) => ({ left: fact.a * fact.b, symbol: DIVIDE_SYMBOL, right: fact.b }),
  generateChoices,
  getStrategies: getStrategiesForDivisionFact,
  speakProblem: (fact) => speakDivisionProblem(fact.a * fact.b, fact.b),
  speakFact: (fact) => speakDivisionFact(fact.a * fact.b, fact.b, fact.a),
}
```

- [ ] **Step 4: Register it**

In `src/lib/operations/index.ts`:

(a) Add the import:

```ts
import { divideOperation } from './divide'
```

(b) Change the export line `export { multiplyOperation }` to:

```ts
export { multiplyOperation }
export { divideOperation }
```

(c) Replace the registry entry (and its Task 3 comment):

```ts
const OPERATIONS: Record<CurriculumId, Operation> = {
  multiply: multiplyOperation,
  divide: divideOperation,
}
```

- [ ] **Step 5: Extend the registry test**

In `src/lib/operations/registry.test.ts`, add inside the describe block:

```ts
  it('resolves the divide operation', () => {
    expect(getOperation('divide').id).toBe('divide')
    expect(getOperation('divide').symbol).toBe('÷')
  })
```

- [ ] **Step 6: Run tests, lint, build**

Run: `bun run test` — Expected: PASS (all suites).
Run: `bun run lint && bun run build` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/operations
git commit -m "feat: add divideOperation with quotient-range choices"
```

---

### Task 4: `curriculumStore` + hook + storage keys

**Files:**
- Modify: `src/lib/storage.ts`
- Create: `src/stores/curriculumStore.ts`
- Modify: `src/hooks/useActiveOperation.ts`
- Modify: `src/stores/index.ts`
- Modify: `src/App.tsx` (initialize curriculum first)
- Test: `src/stores/curriculumStore.test.ts`

**Interfaces:**
- Produces:
  - Storage keys: `curriculum → 'ttt_curriculum'`, `progressDivide → 'ttt_progress_divide'`, `progressViewDivide → 'ttt_progress_view_divide'`, `focusTablesDivide → 'ttt_focus_tables_divide'`; `function clearFromStorage(key: keyof typeof STORAGE_KEYS): void`
  - `useCurriculumStore`: `{ active: CurriculumId; initialize(): void; setActive(id: CurriculumId): void }` — `setActive` persists the pref only; the full store swap is `switchCurriculum` (Task 8)
  - `useActiveOperation()` now returns `getOperation(active)` reactively
- Consumes: `CurriculumId`, `getOperation` (Tasks 1/3).

- [ ] **Step 1: Write the failing test**

Create `src/stores/curriculumStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCurriculumStore } from './curriculumStore'

describe('curriculumStore', () => {
  beforeEach(() => {
    useCurriculumStore.setState({ active: 'multiply' })
  })

  it('defaults to multiply', () => {
    useCurriculumStore.getState().initialize()
    expect(useCurriculumStore.getState().active).toBe('multiply')
  })

  it('persists and restores the active curriculum', () => {
    useCurriculumStore.getState().setActive('divide')
    useCurriculumStore.setState({ active: 'multiply' })
    useCurriculumStore.getState().initialize()
    expect(useCurriculumStore.getState().active).toBe('divide')
  })

  it('ignores corrupt persisted values', () => {
    localStorage.setItem('ttt_curriculum', JSON.stringify('subtract'))
    useCurriculumStore.getState().initialize()
    expect(useCurriculumStore.getState().active).toBe('multiply')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/stores/curriculumStore.test.ts`
Expected: FAIL — cannot resolve `./curriculumStore`.

- [ ] **Step 3: Add the storage keys and `clearFromStorage`**

In `src/lib/storage.ts`, replace the `STORAGE_KEYS` object with:

```ts
const STORAGE_KEYS = {
  progress: 'ttt_progress',
  progressDivide: 'ttt_progress_divide',
  garden: 'ttt_garden',
  session: 'ttt_session',
  settings: 'ttt_settings',
  focusTables: 'ttt_focus_tables',
  focusTablesDivide: 'ttt_focus_tables_divide',
  attempts: 'ttt_attempts',
  pendingAttempts: 'ttt_pending_attempts',
  progressView: 'ttt_progress_view',
  progressViewDivide: 'ttt_progress_view_divide',
  curriculum: 'ttt_curriculum',
} as const
```

and add below `loadFromStorage`:

```ts
export function clearFromStorage(key: keyof typeof STORAGE_KEYS): void {
  try {
    localStorage.removeItem(STORAGE_KEYS[key])
  } catch (e) {
    console.error(`Failed to clear ${key} from storage:`, e)
  }
}
```

(`clearStorage` already iterates `Object.values(STORAGE_KEYS)`, so a full reset now covers the new keys automatically.)

- [ ] **Step 4: Create the store**

Create `src/stores/curriculumStore.ts`:

```ts
import { create } from 'zustand'
import type { CurriculumId } from '../lib/operations'
import { saveToStorage, loadFromStorage } from '../lib/storage'

type CurriculumState = {
  active: CurriculumId
}

type CurriculumActions = {
  initialize: () => void
  /** Persists the preference only. Use lib/switchCurriculum to swap store slices too. */
  setActive: (id: CurriculumId) => void
}

export const useCurriculumStore = create<CurriculumState & CurriculumActions>((set) => ({
  active: 'multiply',

  initialize: () => {
    const saved = loadFromStorage<CurriculumId>('curriculum')
    if (saved === 'multiply' || saved === 'divide') {
      set({ active: saved })
    }
  },

  setActive: (id) => {
    set({ active: id })
    saveToStorage('curriculum', id)
  },
}))
```

- [ ] **Step 5: Route the hook through the store**

Replace `src/hooks/useActiveOperation.ts` with:

```ts
import { useCurriculumStore } from '../stores/curriculumStore'
import { getOperation } from '../lib/operations'
import type { Operation } from '../lib/operations'

/**
 * Returns the operation for the active curriculum. Operations are module
 * singletons, so the returned reference is stable per curriculum and safe
 * in useMemo/useCallback dependency arrays.
 */
export function useActiveOperation(): Operation {
  const active = useCurriculumStore((s) => s.active)
  return getOperation(active)
}
```

- [ ] **Step 6: Export the store and initialize it first**

In `src/stores/index.ts`, add:

```ts
export { useCurriculumStore } from './curriculumStore'
```

In `src/App.tsx`:

(a) Add `useCurriculumStore` to the existing `./stores` import list.

(b) Add below the other store hooks in the component:

```ts
  const { initialize: initCurriculum } = useCurriculumStore()
```

(c) Make it the FIRST call in the init effect (the later store initializers read the active curriculum to pick their storage keys), and add it to the dependency array:

```ts
  useEffect(() => {
    initCurriculum()
    initProgress()
    initGarden()
    initFocusTables()
    initProgressView()
    initializeAttempts()
    initSettings()
  }, [initCurriculum, initProgress, initGarden, initFocusTables, initProgressView, initializeAttempts, initSettings])
```

- [ ] **Step 7: Run tests, lint, build**

Run: `bun run test` — Expected: PASS.
Run: `bun run lint && bun run build` — Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/storage.ts src/stores/curriculumStore.ts src/stores/curriculumStore.test.ts src/stores/index.ts src/hooks/useActiveOperation.ts src/App.tsx
git commit -m "feat: add curriculumStore and route useActiveOperation through it"
```

---

### Task 5: `progressStore` curriculum slices

**Files:**
- Create: `src/lib/factConfidence.ts` (extraction — brings progressStore under the 300-line cap)
- Modify: `src/stores/progressStore.ts`
- Modify: `src/lib/resetStores.ts`
- Test: `src/stores/progressStore.test.ts` (extend), `src/lib/factConfidence.test.ts` (move-safety)

**Interfaces:**
- Produces:
  - `src/lib/factConfidence.ts`: `calculateConfidence(fact: FactProgress): Confidence`, `migrateRecentAttempts(attempts: unknown[]): RecentAttempt[]`, `migrateFacts(facts: Record<string, FactProgress>): Record<string, FactProgress>` — bodies moved VERBATIM from `progressStore.ts`
  - `useProgressStore` gains `curriculum: CurriculumId` state and `loadCurriculum(id: CurriculumId): void`; `initialize()` now loads the slice for `useCurriculumStore`'s active curriculum
  - `toSyncPayload` returns `null` when the active curriculum is not `'multiply'` (Phase 3 lifts this)
  - `loadFromServer` always persists to the multiply key and only replaces in-memory `facts` when multiply is active
- Consumes: `getOperation`, `CurriculumId` (Tasks 1/3), `useCurriculumStore` + `progressDivide` key + `clearFromStorage` (Task 4).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/factConfidence.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calculateConfidence, migrateRecentAttempts } from './factConfidence'
import { makeFact } from '../test/factories'
import type { RecentAttempt } from '../types'

function npCorrect(ms: number): RecentAttempt {
  return { correct: true, inputMethod: 'number_pad', responseTimeMs: ms, timestamp: new Date().toISOString() }
}

describe('calculateConfidence', () => {
  it('returns new with no attempts', () => {
    expect(calculateConfidence(makeFact(7, 8))).toBe('new')
  })

  it('returns mastered after 5 fast correct number-pad attempts', () => {
    const fact = { ...makeFact(7, 8), recentAttempts: Array.from({ length: 5 }, () => npCorrect(2000)) }
    expect(calculateConfidence(fact)).toBe('mastered')
  })
})

describe('migrateRecentAttempts', () => {
  it('converts legacy boolean arrays', () => {
    const migrated = migrateRecentAttempts([true, false])
    expect(migrated).toHaveLength(2)
    expect(migrated[0]).toMatchObject({ correct: true, inputMethod: 'multiple_choice' })
  })
})
```

Extend `src/stores/progressStore.test.ts` — replace the whole file with:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from './progressStore'
import { useCurriculumStore } from './curriculumStore'

describe('progressStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurriculumStore.setState({ active: 'multiply' })
    useProgressStore.setState({ facts: {}, initialized: false, curriculum: 'multiply' })
  })

  it('generates all 144 multiplication facts on a fresh start', () => {
    useProgressStore.getState().initialize()
    const facts = useProgressStore.getState().facts
    expect(Object.keys(facts)).toHaveLength(144)
    expect(facts['7x8'].answer).toBe(56)
    expect(facts['12x12'].answer).toBe(144)
  })

  it('loads a legacy ttt_progress payload as the multiply slice', () => {
    useProgressStore.getState().initialize()
    const saved = localStorage.getItem('ttt_progress')
    expect(saved).not.toBeNull()
    expect(Object.keys(JSON.parse(saved as string))).toHaveLength(144)
  })

  it('keeps the two curricula fully isolated', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().recordAttempt({
      fact: '7x8', correct: true, inputMethod: 'multiple_choice', responseTimeMs: 3000,
    })
    const multiplyCorrect = useProgressStore.getState().facts['7x8'].correctCount
    expect(multiplyCorrect).toBe(1)

    useProgressStore.getState().loadCurriculum('divide')
    const divideFacts = useProgressStore.getState().facts
    expect(Object.keys(divideFacts)).toHaveLength(144)
    expect(divideFacts['56÷7'].answer).toBe(8)
    expect(divideFacts['7x8']).toBeUndefined()

    useProgressStore.getState().recordAttempt({
      fact: '56÷7', correct: true, inputMethod: 'multiple_choice', responseTimeMs: 3000,
    })
    expect(useProgressStore.getState().facts['56÷7'].correctCount).toBe(1)

    useProgressStore.getState().loadCurriculum('multiply')
    expect(useProgressStore.getState().facts['7x8'].correctCount).toBe(multiplyCorrect)
    expect(useProgressStore.getState().facts['56÷7']).toBeUndefined()
  })

  it('computes division table mastery by divisor', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    const facts = useProgressStore.getState().facts
    const mastered = Object.fromEntries(
      Object.entries(facts).map(([key, fact]) => [
        key,
        fact.b === 7 ? { ...fact, confidence: 'mastered' as const } : fact,
      ])
    )
    useProgressStore.setState({ facts: mastered })
    expect(useProgressStore.getState().getMasteredTables()).toEqual([7])
  })

  it('refuses to build sync payloads for division facts', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    expect(useProgressStore.getState().toSyncPayload('56÷7')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `bun run test src/stores/progressStore.test.ts src/lib/factConfidence.test.ts`
Expected: FAIL — `factConfidence` module missing; `curriculum`/`loadCurriculum` missing; division assertions fail.

- [ ] **Step 3: Extract `factConfidence.ts`**

Create `src/lib/factConfidence.ts` containing, VERBATIM (bodies unchanged), the three functions currently in `src/stores/progressStore.ts`: `calculateConfidence` (with its doc comment), `migrateRecentAttempts` (with its doc comment), and `migrateFacts` (with its doc comment) — each marked `export`. File header imports:

```ts
import type { FactProgress, Confidence, RecentAttempt, InputMethod } from '../types'
import { CONFIDENCE_THRESHOLDS } from './constants'
```

Then delete those three functions from `progressStore.ts` and import them there:

```ts
import { calculateConfidence, migrateRecentAttempts, migrateFacts } from '../lib/factConfidence'
```

- [ ] **Step 4: Rework `progressStore.ts` for curriculum slices**

Apply these changes to `src/stores/progressStore.ts`:

(a) Imports — replace the operations import and add the curriculum store:

```ts
import { getOperation, multiplyOperation } from '../lib/operations'
import type { CurriculumId } from '../lib/operations'
import { useCurriculumStore } from './curriculumStore'
```

(b) State — add the curriculum field:

```ts
type ProgressState = {
  facts: Record<string, FactProgress>
  initialized: boolean
  /** Which curriculum the in-memory facts slice belongs to. */
  curriculum: CurriculumId
}
```

and add to `ProgressActions`:

```ts
  loadCurriculum: (id: CurriculumId) => void
```

(c) Add a key helper above the store definition:

```ts
function progressKeyFor(id: CurriculumId): 'progress' | 'progressDivide' {
  return id === 'divide' ? 'progressDivide' : 'progress'
}
```

(d) Replace the multiplication-string-keyed mastery helpers with generic ones (delete the old `checkTableMastery` and `getMasteredTablesFromFacts`, and the now-unused `TIMES_TABLES` import if nothing else uses it):

```ts
type MatchesTable = (fact: FactProgress, table: number) => boolean

function checkTableMastery(
  facts: Record<string, FactProgress>,
  table: number,
  matchesTable: MatchesTable
): boolean {
  const tableFacts = Object.values(facts).filter((f) => matchesTable(f, table))
  return tableFacts.length > 0 && tableFacts.every((f) => f.confidence === 'mastered')
}

function getMasteredTablesFromFacts(
  facts: Record<string, FactProgress>,
  matchesTable: MatchesTable
): number[] {
  const mastered: number[] = []
  for (let table = TIMES_TABLES.min; table <= TIMES_TABLES.max; table++) {
    if (checkTableMastery(facts, table, matchesTable)) {
      mastered.push(table)
    }
  }
  return mastered
}
```

(NOTE: `TIMES_TABLES` stays imported — `getMasteredTablesFromFacts` still uses it.)

(e) Initial state + initialize + loadCurriculum:

```ts
  facts: {},
  initialized: false,
  curriculum: 'multiply',

  initialize: () => {
    get().loadCurriculum(useCurriculumStore.getState().active)
  },

  loadCurriculum: (id) => {
    const key = progressKeyFor(id)
    const saved = loadFromStorage<Record<string, FactProgress>>(key)
    if (saved) {
      const migrated = migrateFacts(saved)
      set({ facts: migrated, initialized: true, curriculum: id })
      saveToStorage(key, migrated)
    } else {
      const facts = getOperation(id).generateFacts()
      set({ facts, initialized: true, curriculum: id })
      saveToStorage(key, facts)
    }
  },
```

(f) `recordAttempt` — replace every `saveToStorage('progress', facts)` in the store with `saveToStorage(progressKeyFor(state.curriculum), facts)` (two call sites: `recordAttempt`, `setPreferredStrategy`), and replace the table-mastery block (from `// Check if this completes a table mastery` through the second `if (tableA !== tableB ...)` block) with:

```ts
      // Check if this attempt completes a table mastery (operation-defined membership)
      const operation = getOperation(state.curriculum)
      const candidateTables = [...new Set([current.a, current.b])].filter((t) =>
        operation.matchesTable(current, t)
      )
      const gardenStore = useGardenStore.getState()
      for (const table of candidateTables) {
        const wasMastered = checkTableMastery(state.facts, table, operation.matchesTable)
        const nowMastered = checkTableMastery(facts, table, operation.matchesTable)
        if (nowMastered && !wasMastered) {
          const totalMastered = getMasteredTablesFromFacts(facts, operation.matchesTable).length
          const reward = getMasteryReward(table, totalMastered)
          gardenStore.addCoins(REWARDS.masteredTable)
          gardenStore.addItem({
            type: reward.type,
            itemId: reward.itemId,
            position: getRandomPosition(),
            earnedFor: `mastered_${table}x`,
          })
        }
      }
```

(For multiply this is behavior-identical: `matchesTable` is `a===t || b===t`, so "all matching facts mastered" equals the old row+column check, and both factors are candidates. For divide only the divisor is a candidate. `earnedFor` keeps the legacy `x` suffix — it is an opaque tag for the legacy garden.)

(g) `getMasteredTables`:

```ts
  getMasteredTables: () => {
    const { facts, curriculum } = get()
    return getMasteredTablesFromFacts(facts, getOperation(curriculum).matchesTable)
  },
```

(h) `loadFromServer` — the server only knows multiplication in Phase 2. Keep the body as-is (it already builds `factMap` with `multiplyOperation.generateFacts()` defaults) but replace the final `set(...)` line with:

```ts
    // Server data is multiply-only in Phase 2: always persist it to the multiply
    // key; only swap it into memory when multiply is the active slice.
    saveToStorage('progress', factMap)
    if (get().curriculum === 'multiply') {
      set({ facts: factMap, initialized: true })
    }
```

(i) `toSyncPayload` — guard the top:

```ts
  toSyncPayload: (factKey) => {
    // Division sync lands in Phase 3 (needs the curriculum column in D1).
    if (get().curriculum !== 'multiply') return null
    const fact = get().facts[factKey]
    ...
```

(rest of the body unchanged)

- [ ] **Step 5: Clear division data on profile switch**

Replace `src/lib/resetStores.ts` with:

```ts
import { useSessionStore } from '../stores/sessionStore'
import { useAttemptsStore } from '../stores/attemptsStore'
import { useProgressViewStore } from '../stores/progressViewStore'
import { useProgressStore } from '../stores/progressStore'
import { useCurriculumStore } from '../stores/curriculumStore'
import { clearFromStorage } from './storage'

/**
 * Reset all per-user stores when switching profiles.
 * Centralized here so profileStore doesn't need to import every store
 * (which risks circular deps, e.g. gardenStore -> profileStore).
 */
export function resetStoresForProfileSwitch(): void {
  useSessionStore.getState().resetProgress()
  useAttemptsStore.getState().clearForProfileSwitch()
  useProgressViewStore.getState().reset()

  // Division progress is device-local until Phase 3 sync; drop it so it
  // cannot leak into the next profile. (Multiply is replaced by
  // loadFromServer after the next profile verifies.)
  clearFromStorage('progressDivide')
  if (useCurriculumStore.getState().active === 'divide') {
    useProgressStore.getState().loadCurriculum('divide')
  }
}
```

(Task 6 extends this again for the progress-view and focus-table divide slices.)

- [ ] **Step 6: Run tests, lint, build; check the line cap**

Run: `bun run test` — Expected: PASS (all suites, including the new isolation/mastery/sync tests).
Run: `bun run lint && bun run build` — Expected: clean.
Run: `wc -l src/stores/progressStore.ts` — Expected: **under 300**.

- [ ] **Step 7: Commit**

```bash
git add src/lib/factConfidence.ts src/lib/factConfidence.test.ts src/stores/progressStore.ts src/stores/progressStore.test.ts src/lib/resetStores.ts
git commit -m "feat: curriculum-keyed fact slices in progressStore"
```

---

### Task 6: `focusTablesStore` + `progressViewStore` curriculum slices

**Files:**
- Modify: `src/stores/focusTablesStore.ts`
- Modify: `src/stores/progressViewStore.ts`
- Modify: `src/lib/resetStores.ts` (progress-view divide slice)
- Test: `src/stores/focusTablesStore.test.ts` (create), `src/stores/progressViewStore.test.ts` (create)

**Interfaces:**
- Produces: both stores gain `curriculum: CurriculumId` state and `loadCurriculum(id: CurriculumId): void`; `initialize()` loads the active curriculum's slice. All persistence goes to the curriculum's key (`focusTables`/`focusTablesDivide`, `progressView`/`progressViewDivide`). Existing public APIs are otherwise unchanged.
- Consumes: `useCurriculumStore` (Task 4), storage keys (Task 4), progressStore active slice (Task 5 — progressView derives counts from it).

- [ ] **Step 1: Write the failing tests**

Create `src/stores/focusTablesStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useFocusTablesStore } from './focusTablesStore'
import { useCurriculumStore } from './curriculumStore'

describe('focusTablesStore curriculum slices', () => {
  beforeEach(() => {
    useCurriculumStore.setState({ active: 'multiply' })
    useFocusTablesStore.setState({ focusTables: [], isEnabled: true, curriculum: 'multiply' })
  })

  it('keeps focus selections independent per curriculum', () => {
    useFocusTablesStore.getState().toggleTable(7)
    expect(useFocusTablesStore.getState().focusTables).toEqual([7])

    useFocusTablesStore.getState().loadCurriculum('divide')
    expect(useFocusTablesStore.getState().focusTables).toEqual([])
    useFocusTablesStore.getState().toggleTable(3)

    useFocusTablesStore.getState().loadCurriculum('multiply')
    expect(useFocusTablesStore.getState().focusTables).toEqual([7])

    useFocusTablesStore.getState().loadCurriculum('divide')
    expect(useFocusTablesStore.getState().focusTables).toEqual([3])
  })
})
```

Create `src/stores/progressViewStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressViewStore } from './progressViewStore'
import { useProgressStore } from './progressStore'
import { useCurriculumStore } from './curriculumStore'

describe('progressViewStore curriculum slices', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurriculumStore.setState({ active: 'multiply' })
    useProgressStore.setState({ facts: {}, initialized: false, curriculum: 'multiply' })
    useProgressStore.getState().initialize()
    useProgressViewStore.setState({
      peakRevealedCount: 0, lastRevealedCount: 0, revealedTables: [],
      peakTier: 0, sessionsCompleted: 0, curriculum: 'multiply',
    })
  })

  it('keeps reveal state independent per curriculum', () => {
    useProgressViewStore.getState().markRevealed(10, [7], 1)
    expect(useProgressViewStore.getState().revealedTables).toEqual([7])

    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')
    expect(useProgressViewStore.getState().revealedTables).toEqual([])
    expect(useProgressViewStore.getState().peakRevealedCount).toBe(0)

    useProgressStore.getState().loadCurriculum('multiply')
    useProgressViewStore.getState().loadCurriculum('multiply')
    expect(useProgressViewStore.getState().revealedTables).toEqual([7])
    expect(useProgressViewStore.getState().peakRevealedCount).toBe(10)
  })

  it('counts pending reveals from the active slice only', () => {
    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')
    useProgressStore.getState().recordAttempt({
      fact: '56÷7', correct: true, inputMethod: 'multiple_choice', responseTimeMs: 3000,
    })
    expect(useProgressViewStore.getState().getPendingReveals().newDetails).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/stores/focusTablesStore.test.ts src/stores/progressViewStore.test.ts`
Expected: FAIL — `curriculum`/`loadCurriculum` do not exist on either store.

- [ ] **Step 3: Slice `focusTablesStore`**

Replace `src/stores/focusTablesStore.ts` with:

```ts
import { create } from 'zustand'
import type { CurriculumId } from '../lib/operations'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useCurriculumStore } from './curriculumStore'

type FocusTablesState = {
  focusTables: number[]
  isEnabled: boolean
  /** Which curriculum the in-memory selection belongs to. */
  curriculum: CurriculumId
}

type PersistedFocusTables = Pick<FocusTablesState, 'focusTables' | 'isEnabled'>

type FocusTablesActions = {
  initialize: () => void
  loadCurriculum: (id: CurriculumId) => void
  toggleTable: (table: number) => void
  setTables: (tables: number[]) => void
  clearTables: () => void
  setEnabled: (enabled: boolean) => void
}

const initialState: PersistedFocusTables = {
  focusTables: [],
  isEnabled: true,
}

function focusKeyFor(id: CurriculumId): 'focusTables' | 'focusTablesDivide' {
  return id === 'divide' ? 'focusTablesDivide' : 'focusTables'
}

function saveState(state: FocusTablesState): void {
  saveToStorage(focusKeyFor(state.curriculum), {
    focusTables: state.focusTables,
    isEnabled: state.isEnabled,
  })
}

export const useFocusTablesStore = create<FocusTablesState & FocusTablesActions>((set) => ({
  ...initialState,
  curriculum: 'multiply',

  initialize: () => {
    const id = useCurriculumStore.getState().active
    const saved = loadFromStorage<PersistedFocusTables>(focusKeyFor(id))
    set({ ...(saved ?? initialState), curriculum: id })
  },

  loadCurriculum: (id) => {
    const saved = loadFromStorage<PersistedFocusTables>(focusKeyFor(id))
    set({ ...(saved ?? initialState), curriculum: id })
  },

  toggleTable: (table) => {
    set(state => {
      const focusTables = state.focusTables.includes(table)
        ? state.focusTables.filter(t => t !== table)
        : [...state.focusTables, table].sort((a, b) => a - b)
      const newState = { ...state, focusTables }
      saveState(newState)
      return newState
    })
  },

  setTables: (tables) => {
    set(state => {
      const newState = { ...state, focusTables: tables.sort((a, b) => a - b) }
      saveState(newState)
      return newState
    })
  },

  clearTables: () => {
    set(state => {
      const newState = { ...state, focusTables: [] }
      saveState(newState)
      return newState
    })
  },

  setEnabled: (enabled) => {
    set(state => {
      const newState = { ...state, isEnabled: enabled }
      saveState(newState)
      return newState
    })
  },
}))
```

- [ ] **Step 4: Slice `progressViewStore`**

Apply these changes to `src/stores/progressViewStore.ts`:

(a) Add imports:

```ts
import type { CurriculumId } from '../lib/operations'
import { useCurriculumStore } from './curriculumStore'
```

(b) Add `curriculum: CurriculumId` to `ProgressViewState` (comment: `// Which curriculum this reveal state belongs to`), and add `loadCurriculum: (id: CurriculumId) => void` to `ProgressViewActions`.

(c) Add to `initialState`: `curriculum: 'multiply' as CurriculumId,` and replace the constant `const STORAGE_KEY = 'progressView'` with:

```ts
function progressViewKeyFor(id: CurriculumId): 'progressView' | 'progressViewDivide' {
  return id === 'divide' ? 'progressViewDivide' : 'progressView'
}
```

(d) Replace `initialize` and add `loadCurriculum`:

```ts
    initialize: () => {
      get().loadCurriculum(useCurriculumStore.getState().active)
    },

    loadCurriculum: (id) => {
      const saved = loadFromStorage<ProgressViewState | LegacyState>(progressViewKeyFor(id))
      if (saved) {
        const state = { ...(isLegacyState(saved) ? migrateLegacy(saved) : saved), curriculum: id }

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
```

(NOTE: `migrateLegacy` returns a state without `curriculum`; the spread above adds it. `loadCurriculum` assumes `progressStore.loadCurriculum(id)` already ran — `switchCurriculum` in Task 8 guarantees the order.)

(e) Replace every remaining `saveToStorage(STORAGE_KEY, ...)` call (in `resync`, `markRevealed`, `incrementSessions`, `reset`) with `saveToStorage(progressViewKeyFor(get().curriculum), ...)`. In `resync`, also carry the field through the synced object: add `curriculum: current.curriculum,` to the `synced` literal. In `reset`, replace `set(initialState)` / `saveToStorage(...)` with:

```ts
    reset: () => {
      set(state => {
        const fresh = { ...initialState, curriculum: state.curriculum }
        saveToStorage(progressViewKeyFor(state.curriculum), fresh)
        return fresh
      })
    },
```

(f) `migrateLegacy` return type: change its signature to `function migrateLegacy(legacy: LegacyState): Omit<ProgressViewState, 'curriculum'>`.

- [ ] **Step 5: Clear the divide reveal slice on profile switch**

In `src/lib/resetStores.ts`, extend the division cleanup block (added in Task 5) to:

```ts
  // Division progress is device-local until Phase 3 sync; drop it so it
  // cannot leak into the next profile. (Multiply is replaced by
  // loadFromServer after the next profile verifies.)
  clearFromStorage('progressDivide')
  clearFromStorage('progressViewDivide')
  if (useCurriculumStore.getState().active === 'divide') {
    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')
  }
```

(Focus-table selections are device preferences, not learner data — both slices survive profile switches, matching today's multiply behavior.)

- [ ] **Step 6: Run tests, lint, build**

Run: `bun run test` — Expected: PASS (all suites).
Run: `bun run lint && bun run build` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/stores/focusTablesStore.ts src/stores/focusTablesStore.test.ts src/stores/progressViewStore.ts src/stores/progressViewStore.test.ts src/lib/resetStores.ts
git commit -m "feat: curriculum-keyed slices for focus tables and reveal state"
```

---

### Task 7: Focus filter via `matchesTable`

**Files:**
- Modify: `src/lib/adaptive.ts` (`selectNextFact` signature)
- Modify: `src/views/PracticeView.tsx` (pass the predicate)
- Test: `src/lib/adaptive.test.ts` (create)

**Interfaces:**
- Produces: `selectNextFact(facts, recentFacts, focusTables, context, matchesTable?)` — 5th parameter `matchesTable: (fact: FactProgress, table: number) => boolean`, defaulting to the multiplication rule `(f, t) => f.a === t || f.b === t` so existing call sites keep their behavior.
- Consumes: `operation.matchesTable` (Task 1/3).

- [ ] **Step 1: Write the failing test**

Create `src/lib/adaptive.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { selectNextFact } from './adaptive'
import { divideOperation, multiplyOperation } from './operations'

describe('selectNextFact focus filter', () => {
  it('defaults to multiplication table membership', () => {
    const facts = multiplyOperation.generateFacts()
    for (let i = 0; i < 10; i++) {
      const next = selectNextFact(facts, [], [7], {})
      expect(next && (next.a === 7 || next.b === 7)).toBe(true)
    }
  })

  it('filters division facts by divisor when given the divide predicate', () => {
    const facts = divideOperation.generateFacts()
    for (let i = 0; i < 10; i++) {
      const next = selectNextFact(facts, [], [7], {}, divideOperation.matchesTable)
      expect(next?.b).toBe(7)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify the divide case fails**

Run: `bun run test src/lib/adaptive.test.ts`
Expected: FAIL — `selectNextFact` accepts no 5th argument, so division focus falls back to `a===7 || b===7` and eventually picks a fact with `b !== 7` (and TypeScript rejects the extra argument at build time).

- [ ] **Step 3: Add the parameter**

In `src/lib/adaptive.ts`, change the `selectNextFact` signature and the focus filter:

```ts
export function selectNextFact(
  facts: Record<string, FactProgress>,
  recentFacts: string[] = [],
  focusTables: number[] = [],
  context: SelectionContext = {},
  matchesTable: (fact: FactProgress, table: number) => boolean = (f, t) => f.a === t || f.b === t
): FactProgress | null {
  const allFacts = Object.values(facts)

  // Filter to focus tables if specified
  const eligibleFacts = focusTables.length > 0
    ? allFacts.filter(f => focusTables.some(t => matchesTable(f, t)))
    : allFacts
```

(Everything below the filter is unchanged.)

- [ ] **Step 4: Pass the operation predicate from PracticeView**

In `src/views/PracticeView.tsx`, both `selectNextFact` call sites gain the predicate:

(a) In `nextProblem`:

```ts
    const next = selectNextFact(facts, recentFacts, activeFocusTables, {
      newFactsIntroduced,
      sessionAccuracy: getSessionAccuracy(),
      consecutiveWrong: countConsecutiveWrong(),
      nearGoalEnd: progress >= goal - 1,
    }, operation.matchesTable)
```

(b) The synchronous `initialFact` computation:

```ts
  const initialFact = shouldInitialize ? selectNextFact(facts, recentFacts, activeFocusTables, {
    newFactsIntroduced,
    sessionAccuracy: getSessionAccuracy(),
  }, operation.matchesTable) : null
```

(`operation` is already in `nextProblem`'s dependency array from Phase 1.)

- [ ] **Step 5: Run tests, lint, build**

Run: `bun run test` — Expected: PASS.
Run: `bun run lint && bun run build` — Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/adaptive.ts src/lib/adaptive.test.ts src/views/PracticeView.tsx
git commit -m "feat: focus filter delegates table membership to the operation"
```

---

### Task 8: `switchCurriculum` + header toggle + view remount keys

**Files:**
- Create: `src/lib/switchCurriculum.ts`
- Create: `src/components/common/CurriculumToggle.tsx`
- Modify: `src/components/common/Layout.tsx`
- Modify: `src/components/common/index.ts`
- Modify: `src/App.tsx` (key views by curriculum)
- Test: `src/lib/switchCurriculum.test.ts`

**Interfaces:**
- Produces: `function switchCurriculum(next: CurriculumId): void` — persists the pref, swaps the three sliced stores **in order** (progress before progressView, which derives from it), and resets the in-flight session run. `CurriculumToggle` is the only UI caller.
- Consumes: `useCurriculumStore` (4), `loadCurriculum` on progress/focus/progressView stores (5, 6), `sessionStore.resetProgress`, `getOperation` (1/3).

- [ ] **Step 1: Write the failing test**

Create `src/lib/switchCurriculum.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { switchCurriculum } from './switchCurriculum'
import { useCurriculumStore } from '../stores/curriculumStore'
import { useProgressStore } from '../stores/progressStore'
import { useFocusTablesStore } from '../stores/focusTablesStore'
import { useSessionStore } from '../stores/sessionStore'

describe('switchCurriculum', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurriculumStore.setState({ active: 'multiply' })
    useProgressStore.setState({ facts: {}, initialized: false, curriculum: 'multiply' })
    useProgressStore.getState().initialize()
    useFocusTablesStore.setState({ focusTables: [], isEnabled: true, curriculum: 'multiply' })
    useSessionStore.getState().resetProgress()
  })

  it('swaps every sliced store and resets the in-flight run', () => {
    useSessionStore.getState().incrementProgress()
    useSessionStore.getState().incrementStreak()
    useFocusTablesStore.getState().toggleTable(7)

    switchCurriculum('divide')

    expect(useCurriculumStore.getState().active).toBe('divide')
    expect(useProgressStore.getState().facts['56÷7']).toBeDefined()
    expect(useFocusTablesStore.getState().focusTables).toEqual([])
    expect(useSessionStore.getState().progress).toBe(0)
    expect(useSessionStore.getState().streakCount).toBe(0)

    switchCurriculum('multiply')
    expect(useProgressStore.getState().facts['7x8']).toBeDefined()
    expect(useFocusTablesStore.getState().focusTables).toEqual([7])
  })

  it('is a no-op when the curriculum is already active', () => {
    useSessionStore.getState().incrementProgress()
    switchCurriculum('multiply')
    expect(useSessionStore.getState().progress).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/lib/switchCurriculum.test.ts`
Expected: FAIL — cannot resolve `./switchCurriculum`.

- [ ] **Step 3: Create the switch routine**

Create `src/lib/switchCurriculum.ts`:

```ts
import type { CurriculumId } from './operations'
import { useCurriculumStore } from '../stores/curriculumStore'
import { useProgressStore } from '../stores/progressStore'
import { useFocusTablesStore } from '../stores/focusTablesStore'
import { useProgressViewStore } from '../stores/progressViewStore'
import { useSessionStore } from '../stores/sessionStore'

/**
 * Switch the active curriculum: persist the preference, swap every
 * curriculum-sliced store (progress BEFORE progressView, which derives
 * its counts from it), and reset the in-flight session run so new-fact
 * pacing doesn't bleed across tracks. The daily streak (attemptsStore)
 * is account-global and untouched.
 */
export function switchCurriculum(next: CurriculumId): void {
  if (useCurriculumStore.getState().active === next) return

  useCurriculumStore.getState().setActive(next)
  useProgressStore.getState().loadCurriculum(next)
  useFocusTablesStore.getState().loadCurriculum(next)
  useProgressViewStore.getState().loadCurriculum(next)
  useSessionStore.getState().resetProgress()
}
```

- [ ] **Step 4: Create the toggle**

Create `src/components/common/CurriculumToggle.tsx`:

```tsx
import { useCurriculumStore } from '../../stores/curriculumStore'
import { switchCurriculum } from '../../lib/switchCurriculum'
import { getOperation } from '../../lib/operations'
import type { CurriculumId } from '../../lib/operations'

const CURRICULA: CurriculumId[] = ['multiply', 'divide']

export function CurriculumToggle() {
  const active = useCurriculumStore((s) => s.active)

  return (
    <div
      role="group"
      aria-label="Choose what to practice"
      className="flex bg-gray-100 rounded-xl p-1"
    >
      {CURRICULA.map((id) => {
        const operation = getOperation(id)
        const isActive = id === active
        return (
          <button
            key={id}
            onClick={() => switchCurriculum(id)}
            aria-pressed={isActive}
            aria-label={operation.copy.label}
            className={`w-14 h-10 rounded-lg text-xl font-bold transition-colors ${
              isActive
                ? 'bg-white text-garden-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {operation.symbol}
          </button>
        )
      })}
    </div>
  )
}
```

In `src/components/common/index.ts`, add:

```ts
export { CurriculumToggle } from './CurriculumToggle'
```

- [ ] **Step 5: Host it in the Layout header**

Replace `src/components/common/Layout.tsx` with:

```tsx
import type { ReactNode } from 'react'
import { Navigation } from './Navigation'
import { CurriculumToggle } from './CurriculumToggle'

type LayoutProps = {
  children: ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      <header className="sticky top-0 z-40 flex justify-center py-2 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <CurriculumToggle />
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {showNav && <Navigation />}
    </div>
  )
}
```

- [ ] **Step 6: Remount views on switch**

In `src/App.tsx`:

(a) Read the active curriculum (below the other store hooks):

```ts
  const activeCurriculum = useCurriculumStore((s) => s.active)
```

(b) Key the views so a mid-problem toggle discards stale local state (current fact, selected table, reveal overrides) instead of rendering facts from the wrong curriculum:

```tsx
      {mode === 'learn' && <LearnView key={activeCurriculum} />}
      {mode === 'practice' && <PracticeView key={activeCurriculum} />}
      {mode === 'garden' && <GardenViewPage key={activeCurriculum} />}
```

- [ ] **Step 7: Run tests, lint, build**

Run: `bun run test` — Expected: PASS.
Run: `bun run lint && bun run build` — Expected: clean.

- [ ] **Step 8: Manual smoke**

Run: `bun run dev`. Verify: the `× | ÷` control sits in a header above all three tabs; tapping `÷` mid-problem lands on a fresh division problem (`56 ÷ 7` style, dividend ÷ divisor); goal progress resets on switch; tapping `×` restores the multiplication track exactly where it was (fact confidences intact); reload restores the last-chosen curriculum.

- [ ] **Step 9: Commit**

```bash
git add src/lib/switchCurriculum.ts src/lib/switchCurriculum.test.ts src/components/common/CurriculumToggle.tsx src/components/common/index.ts src/components/common/Layout.tsx src/App.tsx
git commit -m "feat: curriculum header toggle with clean store swap"
```

---

### Task 9: Operation-aware Learn, Settings, MasteryGrid, and array captions

**Files:**
- Modify: `src/views/LearnView.tsx`
- Modify: `src/components/common/SettingsModal.tsx`
- Modify: `src/components/common/FocusTablePicker.tsx`
- Modify: `src/components/progress/MasteryGrid.tsx`
- Modify: `src/components/practice/VisualArray.tsx`
- Modify: `src/components/practice/HintPanel.tsx`
- Modify: `src/components/learn/VisualExplainer.tsx`

**Interfaces:**
- Consumes: `operation.copy.*`, `operation.tableOf`, `operation.factId` (Tasks 1/3), `formatEquation`, `StrategyHint.arrayCaption` (Task 2).
- Produces: `VisualArray` gains `caption?: string` (default: the existing multiplication rows × columns line).

- [ ] **Step 1: Rewire `LearnView.tsx`**

In `src/views/LearnView.tsx`:

(a) Add the hook import and resolve the operation:

```tsx
import { useActiveOperation } from '../hooks'
```

and inside the component, after `const { facts } = useProgressStore()`:

```tsx
  const operation = useActiveOperation()
```

(b) Group facts through the operation — replace `getTableFacts` with:

```tsx
  const getTableFacts = (table: number) =>
    Object.values(facts).filter(f => operation.tableOf(f) === table)
```

(c) Replace the two copy strings:

```tsx
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          {operation.copy.tablePickerTitle}
        </h2>
```

```tsx
              <h3 className="text-lg font-semibold text-gray-800">
                {operation.copy.tableLabel(selectedTable)}
              </h3>
```

(d) Replace the empty-state line with a curriculum-neutral prompt:

```tsx
          <div className="text-center text-gray-500 py-8">
            Pick a number above to see its facts
          </div>
```

- [ ] **Step 2: Rewire `SettingsModal.tsx`**

In `src/components/common/SettingsModal.tsx`:

(a) Add:

```tsx
import { useActiveOperation } from '../../hooks'
```

and inside the component:

```tsx
  const operation = useActiveOperation()
```

(b) Replace the focus heading text `Focus Tables` with `{operation.copy.focusTitle}`.

(c) Replace the summary paragraph body:

```tsx
              {hasSelection
                ? operation.copy.focusSummary(focusTables)
                : 'Select numbers to focus on, or practice all'}
```

- [ ] **Step 3: Rewire `FocusTablePicker.tsx` aria labels**

In `src/components/common/FocusTablePicker.tsx`:

(a) Add:

```tsx
import { useActiveOperation } from '../../hooks'
```

(b) Inside the component, resolve the operation and use it for the button's label:

```tsx
  const operation = useActiveOperation()
```

and change `aria-label={`${table} times table`}` to:

```tsx
            aria-label={operation.copy.tableLabel(table)}
```

- [ ] **Step 4: Rewire `MasteryGrid.tsx`**

In `src/components/progress/MasteryGrid.tsx`:

(a) Add imports:

```tsx
import { useActiveOperation } from '../../hooks'
import { formatEquation } from '../../lib/operations'
```

(b) Inside the component, after the `facts` selector:

```tsx
  const operation = useActiveOperation()
```

(c) In the cell loop, replace the key construction and aria label:

```tsx
              {tables.map(col => {
                const factKey = operation.factId(row, col)
                const fact = facts[factKey]
                if (!fact) return null

                return (
                  <motion.button
                    key={factKey}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFactSelect(fact)}
                    aria-label={`${formatEquation(operation, fact)}, ${confidenceLabels[fact.confidence]}`}
```

(the rest of the button is unchanged; for division, rows are quotients and columns are divisors, so cell (8, 7) is `56÷7`).

- [ ] **Step 5: Caption the array visual**

(a) In `src/components/practice/VisualArray.tsx`, add the prop and use it:

```tsx
type VisualArrayProps = {
  rows: number
  cols: number
  /** Overrides the default multiplication rows x columns caption. */
  caption?: string
}

export function VisualArray({ rows, cols, caption }: VisualArrayProps) {
```

and replace the bottom paragraph with:

```tsx
      <p className="text-sm text-gray-600 mt-2">
        {caption ?? (
          <>
            {rows} rows × {cols} columns = <span className="font-bold text-garden-600">?</span>
          </>
        )}
      </p>
```

(b) In `src/components/practice/HintPanel.tsx`, pass the strategy's caption:

```tsx
          {strategy.visual === 'array' && rows && cols && (
            <VisualArray rows={rows} cols={cols} caption={strategy.arrayCaption} />
          )}
```

(c) In `src/components/learn/VisualExplainer.tsx`, same:

```tsx
            {currentStrategy.visual === 'array' && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                <VisualArray rows={fact.a} cols={fact.b} caption={currentStrategy.arrayCaption} />
              </div>
            )}
```

(For a division fact the grid is `a` rows of `b` dots = the dividend, and the caption asks for the row count — the quotient.)

- [ ] **Step 6: Run tests, lint, build**

Run: `bun run test && bun run lint && bun run build`
Expected: all clean. No existing test asserts the old copy strings.

- [ ] **Step 7: Manual smoke**

Run: `bun run dev`. On `÷`: Learn shows "Choose a Number to Divide By", family headers like "Dividing by 7" with 12 facts (`7 ÷ 7` … `84 ÷ 7` cards), and the explainer's array caption reads "56 dots in rows of 7 — how many rows?". Settings shows "Focus Divisors" and "Practicing: dividing by 3, 5" when selected. Progress → Stats grid opens division fact details with `56 ÷ 7 = 8` headers. On `×`: everything reads exactly as before.

- [ ] **Step 8: Commit**

```bash
git add src/views/LearnView.tsx src/components/common/SettingsModal.tsx src/components/common/FocusTablePicker.tsx src/components/progress/MasteryGrid.tsx src/components/practice/VisualArray.tsx src/components/practice/HintPanel.tsx src/components/learn/VisualExplainer.tsx
git commit -m "feat: operation-aware Learn, Settings, mastery grid, and hint captions"
```

---

### Task 10: Scene theme plumbing (multiply visuals unchanged)

**Files:**
- Modify: `src/components/progress/p5/types.ts`
- Modify: `src/components/progress/p5/colors.ts`
- Modify: `src/components/progress/p5/elements.ts`
- Modify: `src/components/progress/p5/animals.ts`
- Create: `src/components/progress/p5/drawAnimal.ts`
- Modify: `src/components/progress/p5/scene.ts`
- Modify: `src/components/progress/p5/useP5.ts`
- Create: `src/components/progress/sceneThemes.ts`
- Modify: `src/components/progress/ProgressScene.tsx`
- Modify: `src/components/progress/CharacterBar.tsx`
- Modify: `src/components/progress/RevealSequence.tsx`
- Modify: `src/components/progress/ProgressView.tsx`
- Modify: `src/stores/progressViewStore.ts` (drop the `TABLE_CHARACTERS` export)
- Test: `src/components/progress/sceneThemes.test.ts`

**Interfaces:**
- Produces:
  - `p5/types.ts`: `HSB = { h: number; s: number; b: number }`; `ScenePalette = { sky: HSB[]; tree: { trunk: HSB; canopy: HSB }; grass: HSB; flowers: HSB[]; ground: HSB }`; `AnimalDrawer = (p: p5, s: number, sat: number, time: number) => void`; `SceneVisuals = { palette: ScenePalette; animals: Array<{ type: AnimalType; scale: number }> }`; `SketchParams` gains `visuals: SceneVisuals`
  - `p5/drawAnimal.ts`: `drawAnimal(ctx, animal)` + `getAnimalPositions(width, height, animals)` (moved out of `animals.ts`)
  - `p5/animals.ts`: `FOREST_DRAWERS: Record<AnimalType, AnimalDrawer>` (Task 11 narrows the key type to `ForestAnimalType`)
  - `sceneThemes.ts`: `SceneCharacter = { table: number; name: string; icon: LucideIcon }`; `SceneTheme = { visuals: SceneVisuals; characters: SceneCharacter[]; tierMessages: string[]; landmarkJoinText: string; emptyState: { title: string; subtitle: string } }`; `getSceneTheme(id: CurriculumId): SceneTheme`
- Consumes: `CurriculumId` (Task 1), `useActiveOperation` (Task 4).
- **Zero visual change for multiplication** — this task only threads parameters; every multiply value is the current hardcoded one, moved.

- [ ] **Step 1: Write the failing theme test**

Create `src/components/progress/sceneThemes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getSceneTheme } from './sceneThemes'

describe('scene themes', () => {
  it('provides a complete multiply theme', () => {
    const theme = getSceneTheme('multiply')
    expect(theme.characters).toHaveLength(12)
    expect(theme.characters.map((c) => c.table)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(theme.visuals.animals).toHaveLength(12)
    expect(theme.visuals.palette.sky).toHaveLength(5)
    expect(theme.tierMessages).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/components/progress/sceneThemes.test.ts`
Expected: FAIL — cannot resolve `./sceneThemes`.

- [ ] **Step 3: Extend the p5 types**

In `src/components/progress/p5/types.ts`:

(a) Add at the top (type-only p5 import for the drawer signature):

```ts
import type p5 from 'p5'
```

(b) Add below the `REF_WIDTH`/`REF_HEIGHT` constants:

```ts
export type HSB = { h: number; s: number; b: number }

export type ScenePalette = {
  sky: HSB[] // one entry per tier (5)
  tree: { trunk: HSB; canopy: HSB }
  grass: HSB
  flowers: HSB[]
  ground: HSB
}

export type AnimalDrawer = (p: p5, s: number, sat: number, time: number) => void

export type SceneVisuals = {
  palette: ScenePalette
  /** 12 entries, one per character slot (slot i unlocks with table i+1). */
  animals: Array<{ type: AnimalType; scale: number }>
}
```

(c) `SketchParams` gains the visuals:

```ts
export type SketchParams = {
  scene: SceneState
  animatingCharacter: number | null
  width: number
  height: number
  visuals: SceneVisuals
}
```

(d) `AnimalData` loses nothing — keep it as-is.

- [ ] **Step 4: Type the palette**

In `src/components/progress/p5/colors.ts`, type the existing constant (values unchanged):

```ts
import type { ScenePalette } from './types'

/**
 * Color palette matching app theme (HSB: 360, 100, 100)
 */
export const PALETTE: ScenePalette = {
  ...existing object body, unchanged...
}
```

- [ ] **Step 5: Draw from `ctx.palette`**

In `src/components/progress/p5/elements.ts`:

(a) Remove `PALETTE` from the colors import (keep `getWarmthSaturation`, `getVibrancySaturation`, `applyWarmth`) and add `ScenePalette` to the types import.

(b) `DrawContext` gains the palette:

```ts
export type DrawContext = {
  p: p5
  palette: ScenePalette
  warmth: number // 0-1, effort-based (sky/ground saturation)
  vibrancy: number // 0.3-1.0, confidence-based (element saturation)
  tier: number
  time: number
  centerX: number
  centerY: number
  width: number
  height: number
}
```

(c) Replace every palette read:
- `drawSky`: `const skyColor = ctx.palette.sky[tier]` (destructure `palette` alongside the others: `const { p, palette, warmth, tier, height, width } = ctx`)
- `drawGround`: `applyWarmth(palette.ground.h, tier)`
- `drawTree`: `applyWarmth(palette.tree.trunk.h, tier)` and `applyWarmth(palette.tree.canopy.h, tier)`
- `drawGrass`: `applyWarmth(palette.grass.h + ((g.sway * 10) % 20), tier)` (multiply's `grass.h` is 105, so identical output)

- [ ] **Step 6: Split animal dispatch from the forest drawers**

(a) In `src/components/progress/p5/animals.ts`, DELETE the `drawAnimal` function (lines 6–56) and the `getAnimalPositions` function at the bottom (with its doc comment), remove the now-unused imports (`REF_WIDTH`, `REF_HEIGHT`, `AnimalData`, `getVibrancySaturation`, `DrawContext`), keep all 12 `drawX` functions exactly as they are, and add at the bottom:

```ts
export const FOREST_DRAWERS: Record<AnimalType, AnimalDrawer> = {
  ladybug: drawLadybug,
  butterfly: drawButterfly,
  robin: drawRobin,
  squirrel: drawSquirrel,
  rabbit: drawRabbit,
  fox: drawFox,
  owl: drawOwl,
  deer: drawDeer,
  hedgehog: drawHedgehog,
  bluebird: drawBluebird,
  badger: drawBadger,
  cat: drawCat,
}
```

with the import line at the top:

```ts
import type { AnimalType, AnimalDrawer } from './types'
```

(Drawers with fewer parameters — e.g. `drawLadybug(p, s, sat)` — are assignable to `AnimalDrawer`; extra call arguments are ignored.)

(b) Create `src/components/progress/p5/drawAnimal.ts`:

```ts
import { REF_WIDTH, REF_HEIGHT } from './types'
import type { AnimalData, AnimalType, AnimalDrawer, SceneVisuals } from './types'
import { getVibrancySaturation } from './colors'
import type { DrawContext } from './elements'
import { FOREST_DRAWERS } from './animals'

// Task 11 merges TWILIGHT_DRAWERS into this map.
const DRAWERS: Record<AnimalType, AnimalDrawer> = {
  ...FOREST_DRAWERS,
}

/** Canvas positions for the 12 character slots (slot i unlocks with table i+1). */
const ANIMAL_SLOTS = [
  { x: 0.08, y: 0.88 },
  { x: 0.85, y: 0.45 },
  { x: 0.62, y: 0.32 },
  { x: 0.38, y: 0.5 },
  { x: 0.88, y: 0.85 },
  { x: 0.15, y: 0.82 },
  { x: 0.5, y: 0.22 },
  { x: 0.78, y: 0.8 },
  { x: 0.25, y: 0.9 },
  { x: 0.3, y: 0.28 },
  { x: 0.7, y: 0.88 },
  { x: 0.55, y: 0.78 },
] as const

export function getAnimalPositions(
  width: number,
  height: number,
  animals: SceneVisuals['animals']
): AnimalData[] {
  return ANIMAL_SLOTS.map((slot, i) => ({
    x: width * slot.x,
    y: height * slot.y,
    type: animals[i].type,
    scale: animals[i].scale,
  }))
}

export function drawAnimal(ctx: DrawContext, animal: AnimalData): void {
  const { p, warmth, vibrancy, time, centerX, centerY, width, height } = ctx
  const sat = getVibrancySaturation(animal.x, animal.y, centerX, centerY, width, height, warmth, vibrancy)
  // Scale animal size proportionally to canvas
  const canvasScale = Math.min(width / REF_WIDTH, height / REF_HEIGHT)
  const s = animal.scale * 18 * canvasScale

  p.push()
  p.translate(animal.x, animal.y)
  DRAWERS[animal.type](p, s, sat, time)
  p.pop()
}
```

- [ ] **Step 7: Thread visuals through the scene**

In `src/components/progress/p5/scene.ts`:

(a) Change the animals import to `import { drawAnimal, getAnimalPositions } from './drawAnimal'`, remove the `PALETTE` import from `./colors`, and add `SceneVisuals` to the types import.

(b) Signature: `export function generateScene(width: number, height: number, visuals: SceneVisuals): SceneElements`.

(c) Flower hues come from the theme — in the flowers loop replace the `hue:` line with:

```ts
      hue: visuals.palette.flowers[Math.floor(rand() * visuals.palette.flowers.length)].h,
```

(d) Leaf hues follow the canopy — in the leaves loop replace `hue: 90 + rand() * 50,` with:

```ts
      hue: visuals.palette.tree.canopy.h - 25 + rand() * 50,
```

(multiply's canopy hue is 115, so this is the same 90–140 range as before).

(e) The animals entry becomes:

```ts
    animals: getAnimalPositions(width, height, visuals.animals),
```

(f) In `drawScene`, add `palette: params.visuals.palette,` to the `ctx` object literal.

(g) In `src/components/progress/p5/useP5.ts`, both `generateScene` call sites pass the visuals:

```ts
        elementsRef.current = generateScene(width, height, paramsRef.current.visuals)
```

(setup) and in the resize effect:

```ts
      elementsRef.current = generateScene(width, height, params.visuals)
```

(A curriculum switch remounts `ProgressScene` — the views are keyed by curriculum in `App` — so the sketch is rebuilt with the new theme; no live-swap effect is needed.)

- [ ] **Step 8: Create the theme registry (multiply entry)**

Create `src/components/progress/sceneThemes.ts`:

```ts
import type { LucideIcon } from 'lucide-react'
import {
  Bug,
  Bird,
  Rabbit,
  Squirrel,
  Cat,
  Flower2,
  Fish,
  Egg,
  Leaf,
  Shell,
  Snail,
} from 'lucide-react'
import type { CurriculumId } from '../../lib/operations'
import type { SceneVisuals } from './p5/types'
import { PALETTE } from './p5/colors'

export type SceneCharacter = {
  table: number
  name: string
  icon: LucideIcon
}

export type SceneTheme = {
  visuals: SceneVisuals
  characters: SceneCharacter[]
  /** One message per tier (0-4); tier 0 is never shown. */
  tierMessages: string[]
  /** "<Name> joins your <landmarkJoinText>!" in the reveal modal. */
  landmarkJoinText: string
  emptyState: { title: string; subtitle: string }
}

const MULTIPLY_THEME: SceneTheme = {
  visuals: {
    palette: PALETTE,
    animals: [
      { type: 'ladybug', scale: 1 },
      { type: 'butterfly', scale: 1.2 },
      { type: 'robin', scale: 1 },
      { type: 'squirrel', scale: 1.1 },
      { type: 'rabbit', scale: 1.2 },
      { type: 'fox', scale: 1.3 },
      { type: 'owl', scale: 1.2 },
      { type: 'deer', scale: 1.5 },
      { type: 'hedgehog', scale: 1 },
      { type: 'bluebird', scale: 0.9 },
      { type: 'badger', scale: 1.1 },
      { type: 'cat', scale: 1.2 },
    ],
  },
  characters: [
    { table: 1, name: 'Ladybug', icon: Bug },
    { table: 2, name: 'Butterfly', icon: Flower2 },
    { table: 3, name: 'Robin', icon: Bird },
    { table: 4, name: 'Squirrel', icon: Squirrel },
    { table: 5, name: 'Rabbit', icon: Rabbit },
    { table: 6, name: 'Fox', icon: Leaf },
    { table: 7, name: 'Owl', icon: Egg },
    { table: 8, name: 'Deer', icon: Fish },
    { table: 9, name: 'Hedgehog', icon: Snail },
    { table: 10, name: 'Bluebird', icon: Shell },
    { table: 11, name: 'Badger', icon: Cat },
    { table: 12, name: 'Cat', icon: Cat },
  ],
  tierMessages: [
    '',
    'Dawn breaks over your meadow!',
    'The morning sun warms your tree!',
    'Afternoon light fills the clearing!',
    'Golden hour arrives - your tree is complete!',
  ],
  landmarkJoinText: 'tree',
  emptyState: {
    title: 'Your tree is waiting to grow!',
    subtitle: 'Practice your times tables to bring it to life.',
  },
}

export function getSceneTheme(id: CurriculumId): SceneTheme {
  // Task 11 gives division its own twilight theme; until then it shares the meadow.
  void id
  return MULTIPLY_THEME
}
```

(Character names and icons are moved verbatim from `progressViewStore.TABLE_CHARACTERS` and `CharacterBar.CHARACTER_ICONS`. The old `position` data on `TABLE_CHARACTERS` was consumed by nothing — dropped.)

- [ ] **Step 9: Consume the theme**

(a) `src/components/progress/ProgressScene.tsx` — resolve the theme and pass visuals:

```tsx
import { useActiveOperation } from '../../hooks'
import { getSceneTheme } from './sceneThemes'
```

and inside the component:

```tsx
  const theme = getSceneTheme(useActiveOperation().id)
```

then extend the hook call:

```tsx
  const { isReady, error } = useP5(containerRef, {
    scene,
    animatingCharacter: animatingCharacter ?? null,
    width: dimensions.width,
    height: dimensions.height,
    visuals: theme.visuals,
  })
```

(b) `src/components/progress/CharacterBar.tsx` — replace the lucide import block, the `TABLE_CHARACTERS` import, and the whole `CHARACTER_ICONS` map with:

```tsx
import { motion } from 'framer-motion'
import { CircleDashed } from 'lucide-react'
import { useActiveOperation } from '../../hooks'
import { getSceneTheme } from './sceneThemes'
```

Inside the component add `const theme = getSceneTheme(useActiveOperation().id)`, map over `theme.characters` instead of `TABLE_CHARACTERS`, and replace `const Icon = CHARACTER_ICONS[char.table] || CircleDashed` with `const Icon = char.icon`.

(c) `src/components/progress/RevealSequence.tsx` — replace the `TABLE_CHARACTERS` import with:

```tsx
import { useActiveOperation } from '../../hooks'
import { getSceneTheme } from './sceneThemes'
```

Delete the module-level `TIER_MESSAGES` constant. In `RevealSequence`, add:

```tsx
  const operation = useActiveOperation()
  const theme = getSceneTheme(operation.id)
```

and change the tier overlay text to `{theme.tierMessages[pending.newTier]}`. Pass what the modal needs: `<LandmarkModal table={...} onDismiss={...} />` becomes

```tsx
          <LandmarkModal
            table={pending.newLandmarks[landmarkIdx]}
            character={theme.characters.find((c) => c.table === pending.newLandmarks[landmarkIdx])}
            joinText={theme.landmarkJoinText}
            masteryText={operation.copy.tableMasteryText(pending.newLandmarks[landmarkIdx])}
            onDismiss={handleLandmarkDismiss}
          />
```

and `LandmarkModal` becomes presentational:

```tsx
function LandmarkModal({
  table,
  character,
  joinText,
  masteryText,
  onDismiss,
}: {
  table: number
  character: { table: number; name: string } | undefined
  joinText: string
  masteryText: string
  onDismiss: () => void
}) {
  void table
  if (!character) return null
  ...unchanged JSX, except:
        <p className="text-gray-600 mt-1">
          <span className="font-bold text-garden-600">{character.name}</span> joins your {joinText}!
        </p>
        <p className="text-sm text-gray-500 mt-1">{masteryText}</p>
  ...
}
```

(d) `src/components/progress/ProgressView.tsx` — add the same two imports plus `const theme = getSceneTheme(useActiveOperation().id)` in the component, and replace the empty-state copy:

```tsx
              <p className="text-gray-600">{theme.emptyState.title}</p>
              <p className="text-sm text-gray-500 mt-2">{theme.emptyState.subtitle}</p>
```

(e) `src/stores/progressViewStore.ts` — delete the `TABLE_CHARACTERS` export (nothing imports it anymore).

- [ ] **Step 10: Run tests, lint, build; verify zero visual change**

Run: `bun run test && bun run lint && bun run build` — Expected: all clean.
Run: `bun run dev` → Progress tab on `×`: the meadow scene, characters, reveal toasts, and tier messages must look pixel-identical to before this task.

- [ ] **Step 11: Commit**

```bash
git add src/components/progress src/stores/progressViewStore.ts
git commit -m "refactor: parameterize the p5 scene by a curriculum theme"
```

---

### Task 11: Twilight-pond division theme (palette + 12 characters)

**Files:**
- Modify: `src/components/progress/p5/types.ts` (twilight animal types)
- Modify: `src/components/progress/p5/colors.ts` (`TWILIGHT_PALETTE`)
- Create: `src/components/progress/p5/animalsTwilight.ts`
- Modify: `src/components/progress/p5/animals.ts` (narrow `FOREST_DRAWERS` key type)
- Modify: `src/components/progress/p5/drawAnimal.ts` (merge drawer maps)
- Modify: `src/components/progress/sceneThemes.ts` (divide theme + real registry)
- Test: `src/components/progress/sceneThemes.test.ts` (extend)

**Interfaces:**
- Produces: `TwilightAnimalType` (12 new types), `AnimalType = ForestAnimalType | TwilightAnimalType`, `TWILIGHT_DRAWERS: Record<TwilightAnimalType, AnimalDrawer>`, `TWILIGHT_PALETTE: ScenePalette`, and `getSceneTheme('divide')` returning the twilight theme.
- Consumes: everything Task 10 produced. Purely additive — multiply's theme object is untouched.

- [ ] **Step 1: Extend the theme test**

Add to `src/components/progress/sceneThemes.test.ts`:

```ts
  it('provides a complete, distinct divide theme', () => {
    const divide = getSceneTheme('divide')
    const multiply = getSceneTheme('multiply')
    expect(divide.characters).toHaveLength(12)
    expect(divide.characters.map((c) => c.table)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(divide.visuals.animals).toHaveLength(12)
    expect(divide.visuals.palette.sky).toHaveLength(5)
    expect(divide.tierMessages).toHaveLength(5)
    expect(divide).not.toBe(multiply)
    expect(divide.visuals.palette.sky[0]).not.toEqual(multiply.visuals.palette.sky[0])
    const multiplyNames = new Set(multiply.characters.map((c) => c.name))
    expect(divide.characters.every((c) => !multiplyNames.has(c.name))).toBe(true)
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/components/progress/sceneThemes.test.ts`
Expected: FAIL — `getSceneTheme('divide')` still returns the multiply theme (`divide).not.toBe(multiply)` fails).

- [ ] **Step 3: Add the twilight animal types**

In `src/components/progress/p5/types.ts`, replace the existing `AnimalType` union with:

```ts
export type ForestAnimalType =
  | 'ladybug'
  | 'butterfly'
  | 'robin'
  | 'squirrel'
  | 'rabbit'
  | 'fox'
  | 'owl'
  | 'deer'
  | 'hedgehog'
  | 'bluebird'
  | 'badger'
  | 'cat'

export type TwilightAnimalType =
  | 'frog'
  | 'dragonfly'
  | 'turtle'
  | 'duck'
  | 'mouse'
  | 'raccoon'
  | 'heron'
  | 'otter'
  | 'snail'
  | 'moth'
  | 'beaver'
  | 'bat'

export type AnimalType = ForestAnimalType | TwilightAnimalType
```

In `src/components/progress/p5/animals.ts`, change the map's type (and import) to the narrower key set:

```ts
import type { ForestAnimalType, AnimalDrawer } from './types'
```
```ts
export const FOREST_DRAWERS: Record<ForestAnimalType, AnimalDrawer> = {
```

- [ ] **Step 4: Add the twilight palette**

In `src/components/progress/p5/colors.ts`, add below `PALETTE`:

```ts
/** Division track: a pond at dusk. Same tier mechanics, cooler light. */
export const TWILIGHT_PALETTE: ScenePalette = {
  sky: [
    { h: 285, s: 30, b: 82 }, // Tier 0: Early dusk
    { h: 272, s: 45, b: 72 }, // Tier 1: Lavender twilight
    { h: 260, s: 55, b: 62 }, // Tier 2: Deep twilight
    { h: 248, s: 62, b: 52 }, // Tier 3: Moonrise
    { h: 238, s: 68, b: 45 }, // Tier 4: Starlight
  ],
  tree: {
    trunk: { h: 20, s: 45, b: 28 },
    canopy: { h: 160, s: 55, b: 42 },
  },
  grass: { h: 150, s: 55, b: 42 },
  flowers: [
    { h: 200, s: 70, b: 85 }, // Blue moonflower
    { h: 280, s: 65, b: 82 }, // Violet
    { h: 320, s: 60, b: 85 }, // Evening pink
    { h: 180, s: 60, b: 88 }, // Pale cyan
    { h: 55, s: 70, b: 90 }, // Evening primrose
  ],
  ground: { h: 140, s: 45, b: 45 },
}
```

- [ ] **Step 5: Draw the 12 twilight animals**

Create `src/components/progress/p5/animalsTwilight.ts`:

```ts
import type p5 from 'p5'
import type { TwilightAnimalType, AnimalDrawer } from './types'

function drawFrog(p: p5, s: number, sat: number): void {
  p.fill(110, sat * 0.7, 55)
  p.ellipse(0, 0, s * 1.1, s * 0.8)
  p.ellipse(-s * 0.45, s * 0.25, s * 0.4, s * 0.25)
  p.ellipse(s * 0.45, s * 0.25, s * 0.4, s * 0.25)
  p.ellipse(0, -s * 0.45, s * 0.9, s * 0.6)
  p.fill(0, 0, 95)
  p.ellipse(-s * 0.28, -s * 0.7, s * 0.3)
  p.ellipse(s * 0.28, -s * 0.7, s * 0.3)
  p.fill(0, 0, 10)
  p.ellipse(-s * 0.28, -s * 0.7, s * 0.12)
  p.ellipse(s * 0.28, -s * 0.7, s * 0.12)
  p.fill(110, sat * 0.5, 70)
  p.ellipse(0, -s * 0.3, s * 0.55, s * 0.3)
  p.stroke(0, 0, 20)
  p.strokeWeight(1.5)
  p.noFill()
  p.arc(0, -s * 0.42, s * 0.35, s * 0.2, 0, p.PI)
  p.noStroke()
}

function drawDragonfly(p: p5, s: number, sat: number, time: number): void {
  const flutter = Math.sin(time * 10) * 0.15
  p.fill(190, sat * 0.5, 85, 0.7)
  p.push()
  p.rotate(-0.5 + flutter)
  p.ellipse(-s * 0.5, -s * 0.1, s * 1.1, s * 0.28)
  p.pop()
  p.push()
  p.rotate(0.5 - flutter)
  p.ellipse(s * 0.5, -s * 0.1, s * 1.1, s * 0.28)
  p.pop()
  p.push()
  p.rotate(-0.2 + flutter)
  p.ellipse(-s * 0.45, s * 0.1, s * 0.9, s * 0.22)
  p.pop()
  p.push()
  p.rotate(0.2 - flutter)
  p.ellipse(s * 0.45, s * 0.1, s * 0.9, s * 0.22)
  p.pop()
  p.fill(210, sat * 0.8, 65)
  p.ellipse(0, s * 0.15, s * 0.18, s * 1.1)
  p.ellipse(0, -s * 0.35, s * 0.35, s * 0.4)
  p.fill(0, 0, 15)
  p.ellipse(-s * 0.09, -s * 0.55, s * 0.16)
  p.ellipse(s * 0.09, -s * 0.55, s * 0.16)
}

function drawTurtle(p: p5, s: number, sat: number): void {
  p.fill(75, sat * 0.5, 60)
  p.ellipse(s * 0.7, -s * 0.1, s * 0.4, s * 0.35)
  p.ellipse(-s * 0.55, s * 0.05, s * 0.3, s * 0.18)
  p.ellipse(-s * 0.3, s * 0.12, s * 0.25, s * 0.18)
  p.ellipse(s * 0.3, s * 0.12, s * 0.25, s * 0.18)
  p.fill(95, sat * 0.6, 42)
  p.arc(0, s * 0.1, s * 1.3, s * 1.1, p.PI, 0, p.CHORD)
  p.fill(95, sat * 0.5, 55)
  p.ellipse(0, -s * 0.18, s * 0.5, s * 0.35)
  p.ellipse(-s * 0.38, -s * 0.02, s * 0.3, s * 0.25)
  p.ellipse(s * 0.38, -s * 0.02, s * 0.3, s * 0.25)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.78, -s * 0.18, s * 0.08)
}

function drawDuck(p: p5, s: number, sat: number): void {
  p.fill(45, sat * 0.35, 88)
  p.ellipse(0, 0, s * 1.1, s * 0.8)
  p.fill(45, sat * 0.3, 82)
  p.ellipse(-s * 0.25, -s * 0.05, s * 0.5, s * 0.4)
  p.fill(45, sat * 0.35, 90)
  p.ellipse(s * 0.4, -s * 0.5, s * 0.5, s * 0.45)
  p.fill(35, sat * 0.9, 80)
  p.triangle(s * 0.6, -s * 0.5, s * 0.9, -s * 0.42, s * 0.6, -s * 0.35)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.47, -s * 0.56, s * 0.09)
  p.stroke(200, sat * 0.4, 70)
  p.strokeWeight(1.5)
  p.noFill()
  p.arc(0, s * 0.42, s * 1.5, s * 0.25, 0, p.PI)
  p.noStroke()
}

function drawMouse(p: p5, s: number, sat: number): void {
  p.fill(25, sat * 0.3, 62)
  p.ellipse(0, 0, s * 1.05, s * 0.7)
  p.ellipse(s * 0.4, -s * 0.15, s * 0.5, s * 0.4)
  p.fill(350, sat * 0.35, 80)
  p.ellipse(s * 0.3, -s * 0.5, s * 0.3)
  p.ellipse(s * 0.55, -s * 0.45, s * 0.3)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.55, -s * 0.2, s * 0.08)
  p.ellipse(s * 0.68, -s * 0.1, s * 0.07)
  p.stroke(25, sat * 0.3, 45)
  p.strokeWeight(1.5)
  p.noFill()
  p.arc(-s * 0.5, 0, s * 0.8, s * 0.6, p.HALF_PI, p.PI)
  p.noStroke()
}

function drawRaccoon(p: p5, s: number, _sat: number): void {
  // Raccoon reads as grayscale at night, sat intentionally unused
  void _sat
  p.fill(0, 0, 45)
  p.ellipse(0, 0, s * 1.25, s * 0.8)
  p.fill(0, 0, 40)
  p.ellipse(-s * 0.75, s * 0.05, s * 0.6, s * 0.3)
  p.fill(0, 0, 25)
  p.ellipse(-s * 0.65, s * 0.05, s * 0.15, s * 0.28)
  p.ellipse(-s * 0.9, s * 0.05, s * 0.14, s * 0.24)
  p.fill(0, 0, 50)
  p.ellipse(s * 0.5, -s * 0.3, s * 0.55, s * 0.45)
  p.triangle(s * 0.3, -s * 0.5, s * 0.28, -s * 0.75, s * 0.45, -s * 0.5)
  p.triangle(s * 0.62, -s * 0.5, s * 0.72, -s * 0.75, s * 0.75, -s * 0.48)
  p.fill(0, 0, 20)
  p.ellipse(s * 0.4, -s * 0.32, s * 0.22, s * 0.15)
  p.ellipse(s * 0.62, -s * 0.32, s * 0.22, s * 0.15)
  p.fill(0, 0, 95)
  p.ellipse(s * 0.5, -s * 0.15, s * 0.3, s * 0.18)
  p.ellipse(s * 0.4, -s * 0.32, s * 0.09)
  p.ellipse(s * 0.62, -s * 0.32, s * 0.09)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.52, -s * 0.13, s * 0.09, s * 0.07)
}

function drawHeron(p: p5, s: number, sat: number): void {
  p.fill(215, sat * 0.35, 70)
  p.ellipse(0, 0, s * 0.9, s * 0.65)
  p.stroke(215, sat * 0.35, 65)
  p.strokeWeight(3)
  p.line(s * 0.25, -s * 0.25, s * 0.35, -s * 0.9)
  p.line(-s * 0.05, s * 0.3, -s * 0.05, s * 0.95)
  p.line(s * 0.15, s * 0.3, s * 0.15, s * 0.95)
  p.noStroke()
  p.fill(215, sat * 0.35, 72)
  p.ellipse(s * 0.38, -s * 0.95, s * 0.32, s * 0.28)
  p.fill(45, sat * 0.8, 78)
  p.triangle(s * 0.5, -s * 0.98, s * 0.85, -s * 0.92, s * 0.5, -s * 0.88)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.42, -s * 0.98, s * 0.07)
  p.fill(215, sat * 0.3, 60)
  p.ellipse(-s * 0.15, -s * 0.05, s * 0.5, s * 0.4)
}

function drawOtter(p: p5, s: number, sat: number): void {
  p.fill(28, sat * 0.55, 45)
  p.ellipse(0, 0, s * 1.35, s * 0.65)
  p.ellipse(-s * 0.8, s * 0.1, s * 0.5, s * 0.22)
  p.ellipse(s * 0.55, -s * 0.2, s * 0.5, s * 0.42)
  p.fill(28, sat * 0.5, 50)
  p.ellipse(s * 0.4, -s * 0.45, s * 0.15)
  p.ellipse(s * 0.72, -s * 0.42, s * 0.15)
  p.fill(28, sat * 0.3, 70)
  p.ellipse(s * 0.62, -s * 0.08, s * 0.3, s * 0.2)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.48, -s * 0.28, s * 0.08)
  p.ellipse(s * 0.68, -s * 0.25, s * 0.08)
  p.ellipse(s * 0.68, -s * 0.12, s * 0.09, s * 0.07)
}

function drawSnailTwilight(p: p5, s: number, sat: number): void {
  p.fill(35, sat * 0.6, 68)
  p.ellipse(0, s * 0.25, s * 1.2, s * 0.35)
  p.ellipse(s * 0.55, s * 0.05, s * 0.35, s * 0.4)
  p.stroke(35, sat * 0.6, 60)
  p.strokeWeight(1.5)
  p.line(s * 0.6, -s * 0.15, s * 0.5, -s * 0.45)
  p.line(s * 0.68, -s * 0.13, s * 0.75, -s * 0.42)
  p.noStroke()
  p.fill(35, sat * 0.6, 62)
  p.ellipse(s * 0.5, -s * 0.45, s * 0.09)
  p.ellipse(s * 0.75, -s * 0.42, s * 0.09)
  p.fill(280, sat * 0.5, 55)
  p.ellipse(-s * 0.15, -s * 0.1, s * 0.75)
  p.noFill()
  p.stroke(280, sat * 0.4, 40)
  p.strokeWeight(2)
  p.arc(-s * 0.15, -s * 0.1, s * 0.45, s * 0.45, 0, p.PI * 1.5)
  p.noStroke()
  p.fill(0, 0, 10)
  p.ellipse(s * 0.62, 0, s * 0.06)
}

function drawMoth(p: p5, s: number, sat: number, time: number): void {
  const flap = Math.sin(time * 5) * 0.3
  p.fill(50, sat * 0.35, 85, 0.9)
  p.push()
  p.rotate(-0.35 + flap)
  p.ellipse(-s * 0.5, 0, s * 1.1, s * 0.8)
  p.pop()
  p.push()
  p.rotate(0.35 - flap)
  p.ellipse(s * 0.5, 0, s * 1.1, s * 0.8)
  p.pop()
  p.fill(50, sat * 0.5, 70)
  p.push()
  p.rotate(-0.35 + flap)
  p.ellipse(-s * 0.45, s * 0.05, s * 0.3)
  p.pop()
  p.push()
  p.rotate(0.35 - flap)
  p.ellipse(s * 0.45, s * 0.05, s * 0.3)
  p.pop()
  p.fill(40, sat * 0.4, 45)
  p.ellipse(0, 0, s * 0.25, s * 0.7)
  p.stroke(40, sat * 0.4, 45)
  p.strokeWeight(1.5)
  p.line(-s * 0.05, -s * 0.3, -s * 0.2, -s * 0.55)
  p.line(s * 0.05, -s * 0.3, s * 0.2, -s * 0.55)
  p.noStroke()
}

function drawBeaver(p: p5, s: number, sat: number): void {
  p.fill(22, sat * 0.5, 30)
  p.ellipse(-s * 0.7, s * 0.15, s * 0.55, s * 0.35)
  p.fill(22, sat * 0.65, 40)
  p.ellipse(0, 0, s * 1.1, s * 0.85)
  p.fill(22, sat * 0.65, 45)
  p.ellipse(s * 0.42, -s * 0.35, s * 0.5, s * 0.45)
  p.ellipse(s * 0.28, -s * 0.6, s * 0.16)
  p.ellipse(s * 0.6, -s * 0.58, s * 0.16)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.38, -s * 0.4, s * 0.08)
  p.ellipse(s * 0.58, -s * 0.38, s * 0.08)
  p.fill(22, sat * 0.4, 25)
  p.ellipse(s * 0.5, -s * 0.22, s * 0.14, s * 0.1)
  p.fill(0, 0, 95)
  p.rect(s * 0.44, -s * 0.16, s * 0.06, s * 0.12)
  p.rect(s * 0.51, -s * 0.16, s * 0.06, s * 0.12)
}

function drawBat(p: p5, s: number, sat: number, time: number): void {
  const flap = Math.sin(time * 7) * 0.25
  p.fill(270, sat * 0.35, 35)
  p.push()
  p.rotate(-0.2 + flap)
  p.beginShape()
  p.vertex(-s * 0.15, 0)
  p.vertex(-s * 1.0, -s * 0.35)
  p.vertex(-s * 0.75, 0)
  p.vertex(-s * 0.5, s * 0.12)
  p.endShape(p.CLOSE)
  p.pop()
  p.push()
  p.rotate(0.2 - flap)
  p.beginShape()
  p.vertex(s * 0.15, 0)
  p.vertex(s * 1.0, -s * 0.35)
  p.vertex(s * 0.75, 0)
  p.vertex(s * 0.5, s * 0.12)
  p.endShape(p.CLOSE)
  p.pop()
  p.fill(270, sat * 0.4, 42)
  p.ellipse(0, 0, s * 0.5, s * 0.6)
  p.triangle(-s * 0.18, -s * 0.25, -s * 0.22, -s * 0.5, -s * 0.02, -s * 0.3)
  p.triangle(s * 0.18, -s * 0.25, s * 0.22, -s * 0.5, s * 0.02, -s * 0.3)
  p.fill(50, sat * 0.7, 85)
  p.ellipse(-s * 0.1, -s * 0.12, s * 0.09)
  p.ellipse(s * 0.1, -s * 0.12, s * 0.09)
}

export const TWILIGHT_DRAWERS: Record<TwilightAnimalType, AnimalDrawer> = {
  frog: drawFrog,
  dragonfly: drawDragonfly,
  turtle: drawTurtle,
  duck: drawDuck,
  mouse: drawMouse,
  raccoon: drawRaccoon,
  heron: drawHeron,
  otter: drawOtter,
  snail: drawSnailTwilight,
  moth: drawMoth,
  beaver: drawBeaver,
  bat: drawBat,
}
```

- [ ] **Step 6: Merge the drawer maps**

In `src/components/progress/p5/drawAnimal.ts`, add the import and replace the `DRAWERS` declaration (dropping its Task 11 comment):

```ts
import { TWILIGHT_DRAWERS } from './animalsTwilight'
```
```ts
const DRAWERS: Record<AnimalType, AnimalDrawer> = {
  ...FOREST_DRAWERS,
  ...TWILIGHT_DRAWERS,
}
```

- [ ] **Step 7: Register the divide theme**

In `src/components/progress/sceneThemes.ts`:

(a) Extend the lucide import with the twilight icons:

```ts
import {
  Bug,
  Bird,
  Rabbit,
  Squirrel,
  Cat,
  Feather,
  Fish,
  Flower2,
  Egg,
  Leaf,
  Moon,
  Rat,
  Shell,
  Snail,
  Sparkles,
  Turtle,
  Waves,
} from 'lucide-react'
```

(b) Extend the colors import: `import { PALETTE, TWILIGHT_PALETTE } from './p5/colors'`.

(c) Add below `MULTIPLY_THEME`:

```ts
const DIVIDE_THEME: SceneTheme = {
  visuals: {
    palette: TWILIGHT_PALETTE,
    animals: [
      { type: 'frog', scale: 1 },
      { type: 'dragonfly', scale: 1.1 },
      { type: 'turtle', scale: 1.2 },
      { type: 'duck', scale: 1.1 },
      { type: 'mouse', scale: 0.9 },
      { type: 'raccoon', scale: 1.3 },
      { type: 'heron', scale: 1.4 },
      { type: 'otter', scale: 1.3 },
      { type: 'snail', scale: 0.9 },
      { type: 'moth', scale: 1 },
      { type: 'beaver', scale: 1.2 },
      { type: 'bat', scale: 1 },
    ],
  },
  characters: [
    { table: 1, name: 'Frog', icon: Leaf },
    { table: 2, name: 'Dragonfly', icon: Bug },
    { table: 3, name: 'Turtle', icon: Turtle },
    { table: 4, name: 'Duck', icon: Feather },
    { table: 5, name: 'Mouse', icon: Rat },
    { table: 6, name: 'Raccoon', icon: Cat },
    { table: 7, name: 'Heron', icon: Bird },
    { table: 8, name: 'Otter', icon: Fish },
    { table: 9, name: 'Snail', icon: Snail },
    { table: 10, name: 'Moth', icon: Sparkles },
    { table: 11, name: 'Beaver', icon: Waves },
    { table: 12, name: 'Bat', icon: Moon },
  ],
  tierMessages: [
    '',
    'Dusk settles over your pond!',
    'Twilight deepens - the pond glimmers!',
    'Moonlight spills across the water!',
    'Starlight! Your twilight pond is complete!',
  ],
  landmarkJoinText: 'pond',
  emptyState: {
    title: 'Your pond is waiting for dusk!',
    subtitle: 'Practice division to bring the twilight to life.',
  },
}
```

(d) Replace `getSceneTheme` (and delete its temporary `void id` body) with:

```ts
const THEMES: Record<CurriculumId, SceneTheme> = {
  multiply: MULTIPLY_THEME,
  divide: DIVIDE_THEME,
}

export function getSceneTheme(id: CurriculumId): SceneTheme {
  return THEMES[id]
}
```

- [ ] **Step 8: Run tests, lint, build; check line caps**

Run: `bun run test && bun run lint && bun run build` — Expected: all clean.
Run: `wc -l src/components/progress/p5/animalsTwilight.ts src/components/progress/p5/animals.ts` — Expected: both **under 300**.

- [ ] **Step 9: Manual smoke**

Run: `bun run dev` → toggle to `÷` → Progress tab: dusk-lavender sky, teal canopy, night-bloom flowers; the character bar shows 12 undiscovered twilight slots (Frog … Bat) independent of the multiplication animals. Use the dev debug panel (hidden button, top-right) to slide tiers 0→4 (sky darkens toward starlight) and animals 0→12 (frog, dragonfly, turtle… appear at their slots). Toggle back to `×`: the daytime meadow is exactly as it was.

- [ ] **Step 10: Commit**

```bash
git add src/components/progress
git commit -m "feat: twilight-pond scene theme for the division track"
```

---

### Task 12: Phase 2 integration verification

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `bun run lint && bun run build && bun run test`
Expected: all three succeed.

- [ ] **Step 2: Isolation greps**

- `grep -rn "TABLE_CHARACTERS" src` → **no matches** (moved into themes).
- `grep -rn "'ttt_progress'" src functions --include='*.ts'` → matches only in `src/lib/storage.ts` (the key map). The multiply key is untouched elsewhere.
- `grep -rn "times table" src --include='*.tsx' -i` → matches only inside multiply's `copy`/theme strings or comments — no hardcoded multiplication copy left in shared components (`Navigation` labels, `VisualArray` default caption, and `SciencePage` narrative text are acceptable exceptions; VisualArray's default only renders for multiply strategies).
- `grep -rn "getStrategiesForDivisionFact\|speakDivision" src` → consumed only by `divide.ts` (plus definitions/tests).

- [ ] **Step 3: Multiply back-compat check (data)**

In a browser with existing progress from `main`: load the app, confirm multiply facts/confidences/scene are intact (localStorage `ttt_progress`, `ttt_progress_view`, `ttt_focus_tables` unchanged in format), then toggle `÷` and confirm a fresh division track appears without touching those keys (new `ttt_progress_divide` etc. appear alongside).

- [ ] **Step 4: Full manual regression**

Run: `bun run dev`. Exercise, on **both** curricula: Practice (new fact → 4 plausible choices; wrong answer → hint with correct strategy set + equation message; TTS reads "fifty six divided by seven"), Learn (family listing, explainer, array caption), Settings (independent focus selections; focus filter honored in Practice), Progress (independent scenes, reveal sequence, character bar, mastery grid, fact detail). Switch curriculum mid-problem — no stale fact, goal resets. Reload — curriculum choice persists.

- [ ] **Step 5: Commit any verification fixes**

If steps 1–4 surfaced fixes, commit them granularly. Otherwise Phase 2 is complete: the division track is live end-to-end, local-only, awaiting Phase 3 sync.

---

## Self-Review

- **Spec coverage:** Design §1 (descriptor fields) → Tasks 1/3 (`matchesTable`, `factId`, `symbol`, copy; `scene` implemented as the theme registry per the documented deviation). §2 (fact representation, 144 distinct keys, divisor-table predicate) → Task 3 + Tasks 5/7 consumers. §3 (stores: curriculumStore, progress/progressView/focusTables slices, session reset, profile scoping) → Tasks 4–6, 8. §4 (toggle, ProblemDisplay/FactCard via operation [already Phase 1], LearnView families, choices via operation [Phase 1], scene reads active slice + theme) → Tasks 8–11. §5 (choices, strategies, speech) → Tasks 2–3. §6 (scene engine reuse, division palette + 12 characters + own progression) → Tasks 10–11 (tier thresholds shared at [0,12,36,72,108] — both tracks have 144 facts; the design's "own thresholds" allows this degenerate case and nothing consumes a per-curriculum threshold). §7 (backend) → Phase 3, with the `toSyncPayload` guard as the boundary. Testing section → tasks 3, 5, 6, 7, 8 tests map 1:1 to the spec's list.
- **Placeholder scan:** every code step carries complete code; the two intentional temporaries (`divide: multiplyOperation` registry entry in Task 1, multiply-theme fallback in Task 10) are real working states removed by Tasks 3 and 11 respectively, each marked at both ends.
- **Type consistency:** `CurriculumId`/`Operation`/`OperationCopy` (Task 1) match every consumer; `loadCurriculum(id: CurriculumId)` is spelled identically on all three sliced stores (Tasks 5–6) and called in that order by `switchCurriculum` (Task 8); `SceneVisuals`/`ScenePalette`/`AnimalDrawer`/`SceneTheme` (Task 10) match Task 11's `TWILIGHT_DRAWERS`/`TWILIGHT_PALETTE`/`DIVIDE_THEME`; `arrayCaption` (Task 2) matches the Task 9 `VisualArray` prop; `progressStore.test.ts` setState shapes include the `curriculum` field added in Task 5.




