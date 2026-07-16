# Skip Limits, Derived-Fact Hints, and Fluency Features

**Date:** 2026-07-16
**Status:** Approved

## Problem

The learner is abusing the Skip button to complete practice blocks without learning.
Skip (`PracticeView.handleSkip`) is free, unlimited, and leaves no trace: no attempt
is recorded, `lastSeen` is not updated, and no skip counter exists. The adaptive
engine prioritizes `learning` facts and trouble spots, so the learner skips every
hard fact until an easy one appears, banks it toward the goal, and repeats. Because
skips are invisible, session accuracy stays artificially high, which makes the
engine push *more* new/learning facts (`adaptive.ts` accuracy > 0.92 branch) — which
get skipped too.

Hints have a second gap: they are static text per fact. They never consult what the
learner already knows (the commuted fact is never suggested; "Use a Neighbor" always
picks (a−1)×b blind), the "work from 10×" pattern exists only for 9s/5s/10s, and a
hint-assisted correct counts identically to unaided recall in `calculateConfidence`.

## Goals

1. Skipping delays a fact but can never avoid it; skips become visible to the engine.
2. Hints anchor on facts the learner already knows (commuted facts, 10×/5×/2× chains).
3. Mastery reflects unaided recall — hint-assisted corrects don't advance it.
4. Fluency support: fact-family follow-ups in Practice, derivation ladders in Learn.

Non-goals (this round): interactive typed hint steps in Practice; cross-curriculum
anchors for division hints; persistence of ladder completion; guaranteed same-session
resurfacing of *wrong* (non-skipped) answers.

## 1. Skip budget + comeback (Practice)

- **Budget:** 1 skip per goal block. `sessionStore` gains `skipsUsed` and a
  skipped-facts queue; both are cleared by `resetProgress` (so "Keep going" after a
  completed block grants a fresh skip).
- **Button:** Skip stays visible but disabled once used, labeled so the learner
  understands it is one per round.
- **No progress:** skipping never advances goal progress (unchanged from today).
- **Comeback:** the skipped fact is re-served two problems after the skip, or
  immediately if the block would otherwise complete — it is always answered before
  the block ends. On comeback it uses multiple choice (same supported re-entry as a
  recently-failed fact), since a skip means "I don't know this yet."
- **Trouble signal:** `FactProgress` gains `skippedCount` (persisted and included in
  the sync payload like the other counters). The adaptive scorer gives skipped facts
  a bounded boost analogous to error-prone facts, so avoidance raises priority.
  Sync scope: optional `skippedCount?` on `FactProgressSync`, a D1 migration adding
  a `skipped_count` column (default 0), and read/write in
  `functions/api/profiles/[id]/progress.ts` — missing values read as 0, the same
  backward-compatible pattern used for the `curriculum` column (migration 0003).
- **Edge cases:**
  - If focus tables change mid-session and the queued fact is no longer eligible,
    drop it from the queue.
  - The "end the block on an easy win" scoring preference (`nearGoalEnd`) yields to
    a due comeback.
  - The comeback/serving decision lives in a pure helper (not inline JSX handlers)
    so it is unit-testable.

## 2. Derived-fact anchor hints

- **Seam change:** `Operation.getStrategies(fact)` gains an optional second
  argument — a known-facts lookup with `isKnown(a, b)`, true when that fact's
  confidence is `confident` or `mastered`. Built from `progressStore`. Practice and
  Learn pass it; when absent, strategies behave exactly as today (static).
- **New personalized strategies** in `strategies.ts`, emitted **only when their
  anchor fact is known**:
  - **Commuted fact** (highest value, currently missing): when b×a is known and
    a≠b — "You already know 8×7 = 56 — 7×8 is the same!"
  - **Anchor chains:**
    - 8s: 10×n minus two groups of n (or double 4×n if 4×n is known)
    - 6s: 5×n plus one group of n
    - 7s: 5×n plus two groups of n (5×n and 2×n known)
    - 12s: 10×n plus 2×n
    - 4s: double 2×n
    - 3s: 2×n plus one more n
  - **Smarter "Use a Neighbor":** prefer whichever neighbor fact ((a−1)×b or
    (a+1)×b) is actually known; fall back to today's (a−1)×b when no context.
- **Ordering** in the hint panel: commuted fact → known anchor chains → number
  tricks (9s/5s/10s, unchanged) → skip counting → visual array.
- **Division:** `getStrategiesForDivisionFact` accepts the same optional argument
  but stays static this round (anchoring 56÷8 on 7×8 requires cross-curriculum
  lookup; deferred).

## 3. Hint-gated mastery

- `RecentAttempt` gains optional `hintShown?: boolean`. Absent means unaided, so
  legacy attempts (local and synced) are treated as unaided and nobody's existing
  mastery is retroactively demoted.
- `PracticeView` already computes `wasHintShown`; it starts passing it into
  `progressStore.recordAttempt` (today only the separate attempts-history store
  receives it).
- `calculateConfidence`: the `confident`/`mastered` gates count only unaided
  number-pad corrects (and compute accuracy/speed over unaided NP attempts).
  Hint-assisted corrects still count toward `learning` and still update
  `correctCount`/`lastCorrect`.
- Sync: `recentAttempts` already rides the sync payload as a JSON blob; add the
  optional `hintShown` to `RecentAttemptSync` as well. Additive, no migration.

## 4. Fact-family follow-ups (Practice)

- After a correct answer on a×b (a≠b), if the commuted fact b×a is below
  `confident`, serve b×a as the next problem — binding the pair while retrieval is
  warm.
- Guards: never displaces a due skipped-fact comeback; not served when one correct
  answer remains to complete the block (progress == goal − 1 — the `nearGoalEnd`
  easy-win preference applies instead); no chaining (the follow-up's own commute is
  excluded by the recent-facts window).
- Modeled as an optional `Operation` hook (e.g. `familyFollowUp(fact)` returning a
  fact key or null): multiply returns the commuted fact, divide returns null this
  round.

## 5. Learn-mode derivation ladders

- A "Strategy ladders" row in the Learn view with cards: *Build 9s from 10s*,
  *Build 8s by doubling*, *6s from 5s*, *4s = double the double*, *12s = 10s + 2s*,
  *3s = double plus one*.
- Tapping a card opens a full-screen guided sequence (same modal pattern as
  `VisualExplainer`): show the anchor with the array visual (e.g. 10×4 = 40), show
  the transformation (a column fades out — "take away one group of 4"), then a
  "you try" multiple-choice question; repeat for 2–3 example facts; end with a
  small celebration. Show-then-try only — no typed input.
- Ladder definitions are static data in `src/lib/ladders.ts`; components live in
  `src/components/learn/`. Multiplication-only in v1; no completion persistence.
- Purpose: the derivations are taught here first, so the personalized practice
  hints (section 2) are reminders, not new ideas mid-problem.

## Testing

Vitest units for:

- Skip budget and reset semantics; comeback ordering (due after two problems,
  forced before block completion; dropped when ineligible).
- `skippedCount` boost in `calculateFactScore`.
- Hint-gated confidence transitions, including legacy attempts without `hintShown`.
- Strategy personalization: anchor hints emitted only when known, commuted hint
  present and first, static fallback without context.
- Fact-family follow-up guards.

## Implementation shape

Phased so the skip fix ships first:

1. **Phase A (small):** skip budget + comeback (section 1) and hint-gated mastery
   (section 3).
2. **Phase B (medium):** derived-fact anchor hints (section 2).
3. **Phase C (small):** fact-family follow-ups (section 4).
4. **Phase D (largest, separable):** Learn-mode derivation ladders (section 5).

Constraints: files stay under 300 lines (project lint rule); no timers or other
anxiety-inducing mechanics; Lucide icons only, no emojis.
