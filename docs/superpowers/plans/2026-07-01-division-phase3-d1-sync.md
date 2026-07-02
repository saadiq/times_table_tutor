# Division Phase 3 — D1 Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync division progress to the backend so both curricula are cloud-backed per profile: a `curriculum` column on D1's `fact_progress`, curriculum-tagged sync payloads, and a `loadFromServer` that partitions server rows into the two local slices.

**Architecture:** Additive only. The existing `PUT /api/profiles/:id/progress` and `POST /api/profiles/:id/verify` endpoints carry a new `curriculum` field per fact row; no new endpoints. The client's `toSyncPayload` drops its multiply-only guard and tags each payload with the active curriculum, and `loadFromServer` rebuilds BOTH local slices (multiply → `ttt_progress`, divide → `ttt_progress_divide`) from one mixed server response. `PracticeView` already calls `toSyncPayload` + `queueProgressSync` unconditionally, so division sync turns on the moment the guard is removed — no view changes.

**Tech Stack:** Cloudflare Pages Functions + D1 (SQLite), React 19 + TypeScript (strict, `verbatimModuleSyntax`), Zustand, Vitest (node env, localStorage polyfill in `src/test/setup.ts`), Bun.

## Global Constraints

- **Never push to remote.** Commit locally only; the user pushes and deploys.
- Every commit message ends with the trailer: `Claude-Session: https://claude.ai/code/session_017ouiP4khJjR14tUHsExiMC`
- Granular commits: one logical change per commit.
- Use `bun` / `bunx` only — never `npm` / `npx`.
- Max 300 lines per file (hard error). `progressStore.ts` is at 239 lines and must stay under 300.
- TypeScript strict with `verbatimModuleSyntax: true`: type-only imports MUST use `import type`.
- **Zero multiplication regression:** existing D1 rows must remain valid (`DEFAULT 'multiply'`), and payloads from older cached PWA clients that omit `curriculum` must be stored as `'multiply'`.
- Fact keys are globally unique across curricula (multiply `"7x8"`, divide `"56÷7"`), so the existing primary key `(profile_id, fact)` remains correct — **no table rebuild, no new index** (the client reads all rows per profile in one query and partitions by the `curriculum` field).
- `functions/` is NOT covered by `tsc -b`, `eslint .` config's type rules, or Vitest. Verification for function changes is careful review against this plan plus the project gate (`bun run lint` must still pass since eslint lints the files syntactically).
- The wire-format file `src/types/api.ts` stays import-free: inline the `'multiply' | 'divide'` union there rather than importing `CurriculumId` (avoids a type cycle `types/index → types/api → lib/operations → types/index`).
- Do not touch: attempts sync (division attempt rows already flow through the account-global `attempts` table with free-text `fact_key`), focus tables (device-local prefs), reveal state (`ttt_progress_view*` — device-local, re-derived from facts via `resync`).
- Deployment ordering (user-executed, documented in the runbook at the bottom): the production D1 migration must be applied before or together with the Pages Functions deploy.

## Why server-wins is safe (no local-data migration)

Phase 2 has never been deployed (the branch is local-only), so no real device holds device-local division progress. `loadFromServer` may therefore simply overwrite both local slices with server state on every login, exactly as it already does for multiplication.

## Graceful-degradation property (deliberate)

If a division row is ever synced through a pre-migration server (old function code), it is stored without a curriculum and later backfilled to `'multiply'` by the column default. The new `loadFromServer` looks each row's fact key up in that curriculum's generated defaults — `"56÷7"` is not a multiply key, so the mis-tagged row is silently dropped instead of corrupting the multiply slice, and the next division practice re-syncs it correctly via `INSERT OR REPLACE`.

## File Structure

| File | Change |
|---|---|
| `migrations/0003_curriculum_column.sql` | Create — `ALTER TABLE fact_progress ADD COLUMN curriculum` |
| `schema.sql` | Modify — add `curriculum` to the `fact_progress` CREATE TABLE (fresh installs) |
| `functions/api/profiles/[id]/progress.ts` | Modify — PUT writes `curriculum` (sanitized, defaults `'multiply'`) |
| `functions/api/profiles/[id]/verify.ts` | Modify — SELECT returns `curriculum` per fact row |
| `src/types/api.ts` | Modify — `FactProgressSync` gains optional `curriculum` |
| `src/stores/progressStore.ts` | Modify — `toSyncPayload` tags curriculum (guard removed); `loadFromServer` partitions by curriculum |
| `src/stores/progressStore.test.ts` | Modify — replace the null-guard test; add partition tests |
| `src/lib/resetStores.ts` | Modify — comments only (division is now server-backed; behavior unchanged) |

---

### Task 1: D1 schema — `curriculum` column

**Files:**
- Create: `migrations/0003_curriculum_column.sql`
- Modify: `schema.sql:14-26` (the `fact_progress` CREATE TABLE)

**Interfaces:**
- Consumes: nothing.
- Produces: a `curriculum TEXT NOT NULL DEFAULT 'multiply'` column on `fact_progress`, relied on by Task 2's INSERT/SELECT.

There is no SQL test infra; this task is verified by applying the migration to the local D1 database and inspecting the schema.

- [ ] **Step 1: Create the migration file**

Create `migrations/0003_curriculum_column.sql` with exactly:

```sql
-- Tag each fact_progress row with its curriculum ('multiply' | 'divide') so
-- both tracks sync per profile. Existing rows are multiplication, which the
-- DEFAULT preserves. Fact keys are already disjoint across curricula
-- ("7x8" vs "56÷7"), so the (profile_id, fact) primary key stays valid.
-- NOTE: SQLite has no "ADD COLUMN IF NOT EXISTS" — apply this file once per
-- database; a second run fails with "duplicate column name" (harmless).
ALTER TABLE fact_progress ADD COLUMN curriculum TEXT NOT NULL DEFAULT 'multiply';
```

- [ ] **Step 2: Add the column to `schema.sql` for fresh installs**

In `schema.sql`, change the `fact_progress` table definition to (only the `curriculum` line is new):

```sql
-- Learning progress (one row per fact per profile; fact keys are unique per
-- curriculum — multiply "7x8", divide "56÷7" — so the PK needs no change)
CREATE TABLE IF NOT EXISTS fact_progress (
  profile_id        TEXT NOT NULL,
  fact              TEXT NOT NULL,
  curriculum        TEXT NOT NULL DEFAULT 'multiply',
  confidence        TEXT NOT NULL DEFAULT 'new',
  correct_count     INTEGER NOT NULL DEFAULT 0,
  incorrect_count   INTEGER NOT NULL DEFAULT 0,
  last_seen         INTEGER,
  last_correct      INTEGER,
  recent_attempts   TEXT,
  preferred_strategy TEXT,
  PRIMARY KEY (profile_id, fact),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
```

Also update the comment above the table as shown (the original said `-- Learning progress (one row per fact per profile)`).

- [ ] **Step 3: Apply to the local D1 database**

```bash
bun run db:migrate:file:local migrations/0003_curriculum_column.sql
```

Expected: wrangler reports the command executed (1 statement).

- If it fails with `no such table: fact_progress` (fresh checkout, no local DB yet): run `bun run db:migrate:local` instead — `schema.sql` now creates the table with the column — and skip the ALTER.
- If it fails with `duplicate column name: curriculum`: the column already exists; fine.

- [ ] **Step 4: Verify the column exists**

```bash
bunx wrangler d1 execute ttt-db --local --persist-to=.wrangler/state --command "PRAGMA table_info(fact_progress)"
```

Expected: output includes a row with `name: curriculum`, `type: TEXT`, `dflt_value: 'multiply'`, `notnull: 1`.

If wrangler is unavailable in your environment, report DONE_WITH_CONCERNS noting Steps 3-4 were not run.

- [ ] **Step 5: Commit**

```bash
git add migrations/0003_curriculum_column.sql schema.sql
git commit -m "feat: add curriculum column to fact_progress (D1)

Additive migration: existing rows default to 'multiply'. Fact keys are
disjoint across curricula, so the (profile_id, fact) primary key is
unchanged and no data rebuild is needed.

Claude-Session: https://claude.ai/code/session_017ouiP4khJjR14tUHsExiMC"
```

---

### Task 2: Pages Functions read/write curriculum

**Files:**
- Modify: `functions/api/profiles/[id]/progress.ts` (whole file shown below)
- Modify: `functions/api/profiles/[id]/verify.ts:32-36` (the fact_progress SELECT)

**Interfaces:**
- Consumes: the `curriculum` column from Task 1.
- Produces: PUT `/api/profiles/:id/progress` accepts fact rows with optional `curriculum: string` and persists a sanitized value; POST `/api/profiles/:id/verify` returns `curriculum` on every fact row. Task 3's client payloads and Task 4's partition logic rely on exactly these field names.

`functions/` has no unit-test infra (not in any tsconfig, not covered by Vitest) — the existing functions have none, and this plan does not add a test harness for two line-level changes. Verification is review against this plan plus the lint gate.

- [ ] **Step 1: Rewrite `functions/api/profiles/[id]/progress.ts`**

Replace the entire file with:

```ts
interface Env {
  DB: D1Database;
}

interface FactSync {
  fact: string;
  curriculum?: string;
  confidence: string;
  correctCount: number;
  incorrectCount: number;
  lastSeen: number | null;
  lastCorrect: number | null;
  recentAttempts: boolean[];
  preferredStrategy: string | null;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const profileId = params.id as string;
  const { facts } = await request.json<{ facts: FactSync[] }>();
  const stmt = env.DB.prepare(
    `INSERT OR REPLACE INTO fact_progress
     (profile_id, fact, curriculum, confidence, correct_count, incorrect_count, last_seen, last_correct, recent_attempts, preferred_strategy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      f.lastSeen,
      f.lastCorrect,
      JSON.stringify(f.recentAttempts),
      f.preferredStrategy
    )
  );
  await env.DB.batch(batch);
  return new Response(null, { status: 204 });
};
```

- [ ] **Step 2: Return `curriculum` from `verify.ts`**

In `functions/api/profiles/[id]/verify.ts`, change the fact_progress SELECT (currently lines 32-36) to include `curriculum`:

```ts
  const { results: facts } = await env.DB.prepare(
    `SELECT fact, curriculum, confidence, correct_count as correctCount, incorrect_count as incorrectCount,
     last_seen as lastSeen, last_correct as lastCorrect, recent_attempts as recentAttempts,
     preferred_strategy as preferredStrategy FROM fact_progress WHERE profile_id = ?`
  ).bind(id).all();
```

No other change in the file — the rows are spread into the response (`...f`), so `curriculum` flows to the client automatically.

- [ ] **Step 3: Run lint**

```bash
bun run lint
```

Expected: clean (eslint lints `functions/` syntactically).

- [ ] **Step 4: Commit**

```bash
git add "functions/api/profiles/[id]/progress.ts" "functions/api/profiles/[id]/verify.ts"
git commit -m "feat: read/write curriculum in progress sync functions

PUT sanitizes the incoming value (missing or unrecognized -> 'multiply')
so older cached clients keep working; verify returns curriculum on every
fact row so the client can partition slices.

Claude-Session: https://claude.ai/code/session_017ouiP4khJjR14tUHsExiMC"
```

---

### Task 3: Client emits curriculum — wire type + `toSyncPayload`

**Files:**
- Modify: `src/types/api.ts:38-47` (`FactProgressSync`)
- Modify: `src/stores/progressStore.ts:223-238` (`toSyncPayload`)
- Test: `src/stores/progressStore.test.ts`

**Interfaces:**
- Consumes: `useProgressStore` state field `curriculum: CurriculumId` (exists since Phase 2).
- Produces: `FactProgressSync.curriculum?: 'multiply' | 'divide'`; `toSyncPayload(factKey)` now returns a payload for BOTH curricula (never null for a known fact), tagged with the active curriculum. `queueProgressSync`/`flushProgressSync` in `profileStore` need no changes — the field rides along, and the queue's replace-by-`fact` dedup is safe because fact keys never collide across curricula.

- [ ] **Step 1: Update the failing test (TDD red)**

In `src/stores/progressStore.test.ts`, DELETE this Phase 2 test (it asserts the guard this task removes):

```ts
  it('refuses to build sync payloads for division facts', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    expect(useProgressStore.getState().toSyncPayload('56÷7')).toBeNull()
  })
```

and ADD these two in its place:

```ts
  it('builds division sync payloads tagged with the divide curriculum', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    const payload = useProgressStore.getState().toSyncPayload('56÷7')
    expect(payload).not.toBeNull()
    expect(payload?.fact).toBe('56÷7')
    expect(payload?.curriculum).toBe('divide')
  })

  it('tags multiplication sync payloads with the multiply curriculum', () => {
    useProgressStore.getState().initialize()
    const payload = useProgressStore.getState().toSyncPayload('7x8')
    expect(payload?.curriculum).toBe('multiply')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test src/stores/progressStore.test.ts
```

Expected: FAIL — `builds division sync payloads…` fails because `toSyncPayload` returns null for divide, and `tags multiplication…` fails because the payload has no `curriculum` property.

- [ ] **Step 3: Add `curriculum` to `FactProgressSync`**

In `src/types/api.ts`, change the interface to (only the `curriculum` line and its comment are new):

```ts
export interface FactProgressSync {
  fact: string;
  /**
   * Matches CurriculumId in src/lib/operations (kept inline so this
   * wire-format file stays import-free). Omitted by pre-division clients
   * and servers; readers treat a missing value as 'multiply'.
   */
  curriculum?: 'multiply' | 'divide';
  confidence: string;
  correctCount: number;
  incorrectCount: number;
  lastSeen: number | null;
  lastCorrect: number | null;
  recentAttempts: RecentAttemptSync[];
  preferredStrategy: string | null;
}
```

- [ ] **Step 4: Remove the guard and tag the payload**

In `src/stores/progressStore.ts`, replace the whole `toSyncPayload` implementation (currently lines 223-238, including the `// Division sync lands in Phase 3…` comment) with:

```ts
  toSyncPayload: (factKey) => {
    const fact = get().facts[factKey]
    if (!fact) return null
    return {
      fact: fact.fact,
      curriculum: get().curriculum,
      confidence: fact.confidence,
      correctCount: fact.correctCount,
      incorrectCount: fact.incorrectCount,
      lastSeen: fact.lastSeen ? new Date(fact.lastSeen).getTime() : null,
      lastCorrect: fact.lastCorrect ? new Date(fact.lastCorrect).getTime() : null,
      recentAttempts: fact.recentAttempts,
      preferredStrategy: fact.preferredStrategy,
    }
  },
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun run test src/stores/progressStore.test.ts
```

Expected: PASS (6 tests in the file after this task).

- [ ] **Step 6: Commit**

```bash
git add src/types/api.ts src/stores/progressStore.ts src/stores/progressStore.test.ts
git commit -m "feat: tag sync payloads with the active curriculum

Removes the Phase 2 multiply-only guard in toSyncPayload: PracticeView
already queues every attempt unconditionally, so division practice now
syncs to D1 the same way multiplication does.

Claude-Session: https://claude.ai/code/session_017ouiP4khJjR14tUHsExiMC"
```

---

### Task 4: `loadFromServer` partitions by curriculum

**Files:**
- Modify: `src/stores/progressStore.ts:7` (import) and `:183-221` (`loadFromServer`)
- Modify: `src/lib/resetStores.ts:18-28` (comments only)
- Test: `src/stores/progressStore.test.ts`

**Interfaces:**
- Consumes: `FactProgressSync.curriculum` from Task 3; `multiplyOperation.generateFacts()` / `divideOperation.generateFacts()` (both exported from `src/lib/operations`); `migrateRecentAttempts` / `calculateConfidence` from `src/lib/factConfidence`.
- Produces: `loadFromServer(facts)` writes BOTH storage keys (`progress`, `progressDivide`) and always sets the in-memory slice to the active curriculum's slice. `ProfilePicker` call sites need no changes.

Design note: the old implementation parsed fact keys with `f.fact.split('x')` — meaningless for `"56÷7"`. The new implementation looks each row's key up in that curriculum's generated defaults instead, which both removes the parsing and silently drops corrupt or mis-tagged rows (see "Graceful-degradation property" above).

- [ ] **Step 1: Write the failing tests (TDD red)**

Add to `src/stores/progressStore.test.ts` (inside the existing `describe`; note the file's `beforeEach` already resets localStorage, curriculumStore, and progressStore state):

```ts
  it('partitions server rows into per-curriculum slices', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().loadFromServer([
      {
        fact: '7x8', curriculum: 'multiply', confidence: 'confident',
        correctCount: 5, incorrectCount: 1, lastSeen: 1750000000000,
        lastCorrect: 1750000000000, recentAttempts: [], preferredStrategy: null,
      },
      {
        fact: '56÷7', curriculum: 'divide', confidence: 'confident',
        correctCount: 3, incorrectCount: 0, lastSeen: 1750000000000,
        lastCorrect: 1750000000000, recentAttempts: [], preferredStrategy: null,
      },
    ])
    const multiply = JSON.parse(localStorage.getItem('ttt_progress') as string)
    const divide = JSON.parse(localStorage.getItem('ttt_progress_divide') as string)
    expect(multiply['7x8'].correctCount).toBe(5)
    expect(multiply['56÷7']).toBeUndefined()
    expect(divide['56÷7'].correctCount).toBe(3)
    expect(Object.keys(divide)).toHaveLength(144)
    // multiply is active, so memory holds the multiply slice
    expect(useProgressStore.getState().facts['7x8'].correctCount).toBe(5)
  })

  it('treats server rows without a curriculum as multiplication', () => {
    useProgressStore.getState().loadFromServer([
      {
        fact: '7x8', confidence: 'confident', correctCount: 5,
        incorrectCount: 1, lastSeen: null, lastCorrect: null,
        recentAttempts: [], preferredStrategy: null,
      },
    ])
    const multiply = JSON.parse(localStorage.getItem('ttt_progress') as string)
    expect(multiply['7x8'].correctCount).toBe(5)
  })

  it('drops rows whose fact key is unknown to their curriculum', () => {
    // A division key mis-tagged 'multiply' (e.g. synced through a
    // pre-migration server, then backfilled by the column default).
    useProgressStore.getState().loadFromServer([
      {
        fact: '56÷7', curriculum: 'multiply', confidence: 'confident',
        correctCount: 9, incorrectCount: 0, lastSeen: null, lastCorrect: null,
        recentAttempts: [], preferredStrategy: null,
      },
    ])
    const multiply = JSON.parse(localStorage.getItem('ttt_progress') as string)
    const divide = JSON.parse(localStorage.getItem('ttt_progress_divide') as string)
    expect(multiply['56÷7']).toBeUndefined()
    expect(divide['56÷7'].correctCount).toBe(0)
  })

  it('loads the divide slice into memory when divide is active', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    useProgressStore.getState().loadFromServer([
      {
        fact: '56÷7', curriculum: 'divide', confidence: 'confident',
        correctCount: 3, incorrectCount: 0, lastSeen: null, lastCorrect: null,
        recentAttempts: [], preferredStrategy: null,
      },
    ])
    expect(useProgressStore.getState().facts['56÷7'].correctCount).toBe(3)
    expect(useProgressStore.getState().facts['7x8']).toBeUndefined()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test src/stores/progressStore.test.ts
```

Expected: 3 of the 4 new tests FAIL — the old `loadFromServer` string-parses `'56÷7'` into garbage that lands in the multiply slice (tests 1 and 3), never writes `ttt_progress_divide` (test 1's read of it blows up on null), and only sets memory when multiply is active (test 4). Test 2 (`treats server rows without a curriculum as multiplication`) already passes against the old code — it pins the back-compat behavior the rewrite must preserve, so it is red-phase-exempt by design.

- [ ] **Step 3: Rewrite `loadFromServer`**

In `src/stores/progressStore.ts`, first change the operations import (line 7) to also bring in `divideOperation`:

```ts
import { getOperation, multiplyOperation, divideOperation } from '../lib/operations'
```

Then replace the whole `loadFromServer` implementation (currently lines 183-221, including its `// Server data is multiply-only in Phase 2…` comment) with:

```ts
  loadFromServer: (facts) => {
    // Start each slice from generated defaults and overlay the server rows.
    // Looking a row's fact key up in its curriculum's defaults (instead of
    // parsing the key) keeps corrupt or mis-tagged rows out of the slices.
    const slices: Record<CurriculumId, Record<string, FactProgress>> = {
      multiply: multiplyOperation.generateFacts(),
      divide: divideOperation.generateFacts(),
    }
    for (const f of facts) {
      const curriculum: CurriculumId = f.curriculum === 'divide' ? 'divide' : 'multiply'
      const defaults = slices[curriculum][f.fact]
      if (!defaults) continue
      const migratedAttempts = migrateRecentAttempts(f.recentAttempts as unknown[])
      const factData: FactProgress = {
        ...defaults,
        correctCount: f.correctCount,
        incorrectCount: f.incorrectCount,
        lastSeen: f.lastSeen ? new Date(f.lastSeen).toISOString() : null,
        lastCorrect: f.lastCorrect ? new Date(f.lastCorrect).toISOString() : null,
        recentAttempts: migratedAttempts,
        preferredStrategy: f.preferredStrategy,
      }
      factData.confidence = calculateConfidence(factData)
      slices[curriculum][f.fact] = factData
    }
    saveToStorage('progress', slices.multiply)
    saveToStorage('progressDivide', slices.divide)
    set({ facts: slices[get().curriculum], initialized: true })
  },
```

(Confidence recalculation is preserved: defaults carry `confidence: 'new'`, and `calculateConfidence` recomputes from the overlaid counts/attempts exactly as before.)

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/stores/progressStore.test.ts
```

Expected: PASS (10 tests in the file after this task). Also run the full suite — `bun run test` — expected: all files pass (56 tests), confirming `resetStores.test.ts` and `switchCurriculum.test.ts` still hold.

- [ ] **Step 5: Update the stale Phase 2 comment in `resetStores.ts`**

In `src/lib/resetStores.ts`, replace this comment block (behavior unchanged — the clears stay because reveal state is device-local and cleared fact slices are simply restored by `loadFromServer` after the next profile verifies):

```ts
  // Division progress is device-local until Phase 3 sync; drop it so it
  // cannot leak into the next profile. (Multiply is replaced by
  // loadFromServer after the next profile verifies.)
```

with:

```ts
  // Division facts are server-backed and restored by loadFromServer after
  // the next profile verifies — but they linger in storage after logout,
  // so drop them (and the divide reveal slice, which never leaves this
  // device) rather than let them leak into the next profile.
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/progressStore.ts src/stores/progressStore.test.ts src/lib/resetStores.ts
git commit -m "feat: partition server progress rows by curriculum on load

loadFromServer now rebuilds both local slices from one mixed response,
looking each row's fact key up in its curriculum's generated defaults
instead of string-parsing the key. Server state wins for both curricula
on login, same as multiplication always has.

Claude-Session: https://claude.ai/code/session_017ouiP4khJjR14tUHsExiMC"
```

---

### Task 5: Integration verification

**Files:** none created or modified (gate only).

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: the green gate for the final whole-branch review.

- [ ] **Step 1: Full project gate**

```bash
bun run lint && bun run build && bun run test
```

Expected: eslint clean, `tsc -b && vite build` succeeds, all test files pass (15 files, 56 tests).

- [ ] **Step 2: No stale "local-only" markers remain**

```bash
grep -rn "Phase 3\|local-only\|device-local" src functions
```

Expected: no matches — the only two pre-existing markers (`progressStore.ts:224`, `resetStores.ts:18`) are removed by Tasks 3 and 4, and neither replacement comment reuses those phrases. If a stale marker turns up, fix the comment in a separate `docs:`-prefixed commit.

- [ ] **Step 3: Working tree clean**

```bash
git status --porcelain
```

Expected: empty.

---

## Deployment runbook (user-executed — NOT part of this plan's tasks)

Nothing is pushed or deployed by this plan. When ready to ship:

1. Apply the migration to production D1 **before** (or together with) deploying:
   ```bash
   bun run db:migrate:file migrations/0003_curriculum_column.sql
   ```
2. Push the branch / merge / deploy Pages as usual. Old cached PWA clients keep working against the new schema (missing `curriculum` → stored as `'multiply'`).
3. Local dev databases need the same one-time migration:
   ```bash
   bun run db:migrate:file:local migrations/0003_curriculum_column.sql
   ```
