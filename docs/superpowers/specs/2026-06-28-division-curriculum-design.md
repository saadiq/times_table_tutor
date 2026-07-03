# Division Curriculum — Design

**Date:** 2026-06-28
**Status:** Approved (design), pending implementation plan

## Goal

Add **division** to the Times Table Tutor as a **separate curriculum/track** alongside the
existing multiplication track. Division is the inverse of the times tables (e.g. `56 ÷ 7 = 8`),
divisor 1–12, quotient 1–12, **no remainders** — the same 144 `(a, b)` factor pairs reframed as
`dividend ÷ divisor`.

## Decisions (locked)

1. **Separate scene** — division gets its own scene-reveal world: own revealed facts, own 12
   characters, own tier progression, tracked independently from multiplication.
2. **Independent tracks** — both curricula are always available from day one. No gating, no
   unlock logic.
3. **Header toggle** — the learner switches tracks via a persistent segmented control (`× | ÷`)
   at the top of the screen, visible across Learn/Practice/Progress.
4. **Scope** — inverse of the times tables, no remainders (see Non-Goals).
5. **State architecture** — an `Operation` descriptor plus **curriculum-keyed slices** in the
   core stores. One API surface, one sync path, clean isolation between tracks.

## Architecture

### 1. The `Operation` descriptor (core abstraction)

A new `src/lib/operations/` module. One config object per curriculum holding *only* what differs
between operations; the rest of the engine (`adaptive.ts`, `progressStore` confidence/attempt
logic) stays generic and receives the active operation's facts.

```ts
type Operation = {
  id: 'multiply' | 'divide'
  symbol: '×' | '÷'
  label: string
  generateFacts(): Record<string, FactProgress>
  factId(a: number, b: number): string
  formatProblem(f: FactProgress): { left: number; symbol: string; right: number }
  generateChoices(f: FactProgress, count?: number): number[]
  getStrategies(f: FactProgress): StrategyHint[]
  matchesTable(f: FactProgress, table: number): boolean
  speak(f: FactProgress): { problem: string; full: string }
  scene: { palette; characters; tierThresholds }
}
```

Files: `operations/multiply.ts`, `operations/divide.ts`, `operations/index.ts`. Strategies are
split per curriculum to keep files under the 300-line cap.

### 2. Division fact representation

Division reuses `a`/`b` as the **same 1–12 factors** as multiplication, so `focusTables`,
`getFactDifficulty`, and confidence logic work unchanged. The operation *interprets* them: for a
fact `(a, b)` → dividend `a*b`, divisor `b`, quotient `a`, and `answer = a` (the value the learner
types).

- `factId(a, b) = "${a*b}÷${b}"` → `(8,7)→"56÷7"`, `(7,8)→"56÷8"`. Naturally yields **144 distinct**
  division problems — division is not commutative, so no commutative collapse.
- `matchesTable`: division "table N" = **divisor `b === N`** (the inverse N-times-table);
  multiplication keeps `a === N || b === N`. This predicate is fed into both the focus filter in
  `selectNextFact` and `checkTableMastery`, so neither needs operation-specific branches.

### 3. State stores (curriculum-keyed slices)

- **New `curriculumStore`**: `{ active, setActive() }`, persisted UI pref — orthogonal to `mode`.
- **`progressStore`**: holds `{ multiply, divide }` slices in memory; methods act on the active
  curriculum. Persistence keeps **`ttt_progress` = multiply** (unchanged key → zero migration, full
  back-compat) and adds **`ttt_progress_divide`**.
- **`progressViewStore`**: same two-slice pattern (`ttt_progress_view` + `…_divide`) — independent
  revealed facts, characters, tier, sessions per track.
- **`focusTablesStore`**: per-curriculum slices (tracks are independent — a learner might drill ×7
  but ÷3).
- **`sessionStore`**: streak stays **account-global** (daily engagement). Switching curriculum
  **resets the in-flight run** (goal progress + `newFactsIntroduced`) so new-fact pacing doesn't
  bleed across tracks. No per-curriculum session slices.
- **Profile scoping**: division slices ride the existing per-profile reset/sync paths
  (`resetStoresForProfileSwitch`, `queueProgressSync`), extended to cover the new keys.

### 4. Navigation & UI

- **New `CurriculumToggle`** — a segmented `× | ÷` control in the `Layout` header, always visible
  across Learn/Practice/Progress, writes `curriculumStore.active`.
- **`ProblemDisplay`** & **`FactCard`**: drop the hardcoded `×`, render via
  `operation.formatProblem()`.
- **`LearnView`**: iterate "tables" through the operation (division = divisors 1–12), showing
  division fact families (e.g. the ÷7 family).
- `AnswerInput` / `NumberPad` / `MultipleChoice` unchanged — they take `answer` + `choices`;
  choices now come from `operation.generateChoices`.
- **`ProgressScene`**: reads the active slice + `operation.scene` (division palette + its 12
  characters).

### 5. Division-specific content

- **Choices**: distractors built around the quotient — `a±1` (off-by-one quotient), the divisor
  `b`, neighboring-fact quotients; always includes the correct answer and is unique.
- **Strategies** (starter set, fleshed out in implementation): `inverse_multiplication`
  ("7 × ? = 56" — the anchor), `fact_family`, `skip_counting` to the dividend, `halving` (÷2),
  `÷1 / n÷n`, ÷10. New `Strategy` ids, division-only.
- **Speech**: `operation.speak()` → "fifty-six divided by seven equals eight".

### 6. Scene / reward

Reuses the existing p5 scene **engine** (not a new one) with a division-specific palette + 12
division characters and its own tier thresholds — driven entirely by the division
`progressViewStore` slice, so it advances independently of multiplication.

### 7. Backend / sync (the one backend touch)

Add a `curriculum` column to the D1 facts table (`DEFAULT 'multiply'` → existing rows stay valid).
`FactProgressSync` gains a `curriculum` field; `queueProgressSync` and the Pages Function read/write
per `(profile, curriculum)`. Minimal and additive.

## Testing

- `operations/divide` unit tests: 144 distinct facts, correct dividend/divisor/quotient, no ÷0,
  `factId` uniqueness, `generateChoices` (includes correct, 4 unique, plausible), `matchesTable`,
  strategies present for representative facts.
- Store isolation: a division attempt never mutates the multiply slice; correct storage keys;
  legacy `ttt_progress` still loads as multiply.
- Scene: division tiers advance only from division mastery.
- Regression: profile isolation holds across both curricula; existing multiplication flows
  unchanged.

## Non-Goals (YAGNI)

- No remainders, no long-division algorithm, no decimals.
- No cross-track gating or unlocking.
- No new scene engine — reuse the existing p5 engine with a new palette + characters.
- Legacy `gardenStore` untouched.
