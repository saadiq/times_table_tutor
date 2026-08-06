# Profile Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in child change their icon password, name, and color from Settings, gated behind re-picking their current icon.

**Architecture:** A new `PATCH /api/profiles/:id` verifies the caller's current icon before updating the row. On the client, `profileStore.updateProfile` calls it and — critically — rewrites the cached `ttt_session` icon so auto-login keeps working. A two-phase `ProfileEditor` overlay opens from Settings: pick your current icon, then edit all three fields in one form.

**Tech Stack:** React 19 + TypeScript, Zustand, framer-motion, Tailwind v4, Cloudflare Pages Functions + D1, Vitest (jsdom for component tests), Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-06-profile-editing-design.md`

## Global Constraints

- Max 300 lines per file (hard rule from global CLAUDE.md). Max 100 lines per function.
- No emojis anywhere in UI copy — use Lucide React icons.
- No timers, no attempt counters, no lockouts on a wrong icon. Anxiety-free is a product principle.
- Tap targets 48px+ where practical; mobile-first.
- Use `bun`/`bunx`, never `npm`/`npx`.
- Commit granularly — one logical change per commit.
- Tests run with `bun run test` (vitest, `globals: false` — every test file imports `describe`/`it`/`expect` from `vitest` explicitly).
- Component test files need `// @vitest-environment jsdom` as line 1; the default environment is node.
- Name cap is 20 characters, matching `ProfileCreator`'s existing `maxLength={20}`.
- No schema change and no `migrations/*.sql` file in this work. Nothing to hand-apply before deploy.

## File Structure

**Create:**
- `functions/_shared/profileEdits.ts` — pure request-body validation for the PATCH endpoint. Mirrors the `progressSql.ts` precedent: the testable logic lives in `_shared`, the handler stays thin.
- `functions/_shared/profileEdits.test.ts` — its unit tests.
- `src/components/common/ColorPicker.tsx` — the color swatch row, extracted from `ProfileCreator` so both it and the editor use one copy.
- `src/components/common/ColorPicker.test.tsx`
- `src/components/common/ProfileEditor.tsx` — overlay shell, phase state, error mapping.
- `src/components/common/ProfileEditForm.tsx` — the edit-phase form. Split from `ProfileEditor` to keep both files well under the line limit and give the form its own clear interface.
- `src/components/common/ProfileEditor.test.tsx`

**Modify:**
- `functions/api/profiles/[id].ts` — add `onRequestPatch`.
- `src/types/api.ts` — add `UpdateProfileRequest`.
- `src/lib/api.ts` — add `api.updateProfile`.
- `src/stores/profileStore.ts` — add the `updateProfile` action.
- `src/stores/profileStore.test.ts` — add an `updateProfile` describe block.
- `src/test/syncFixtures.ts` — add `SESSION_KEY` and `errorResponse`.
- `src/components/common/IconPicker.tsx` — add `aria-label` to each icon button (same reason `NumberPad` got labels in 553459b: without an accessible name the buttons can't be targeted in tests).
- `src/components/common/ProfileCreator.tsx` — consume `ColorPicker`.
- `src/components/common/SettingsModal.tsx` — add the profile row and render the overlay.
- `src/components/common/index.ts` — export the new components.
- `CLAUDE.md` — one line noting Settings now edits the profile.

---

### Task 1: Request-body validation for the PATCH endpoint

**Files:**
- Create: `functions/_shared/profileEdits.ts`
- Test: `functions/_shared/profileEdits.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MAX_PROFILE_NAME_LENGTH: number`, `interface ProfileEdit { currentIcon: string; name: string; icon: string; color: string }`, `type ProfileEditValidation = { ok: true; edit: ProfileEdit } | { ok: false; error: string }`, `validateProfileEdit(body: unknown): ProfileEditValidation`.

- [ ] **Step 1: Write the failing test**

Create `functions/_shared/profileEdits.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateProfileEdit } from './profileEdits'

function body(overrides: Record<string, unknown> = {}) {
  return { currentIcon: 'cat', name: 'Ada', icon: 'owl', color: 'sky-400', ...overrides }
}

describe('validateProfileEdit', () => {
  it('accepts a complete body and trims the name', () => {
    const result = validateProfileEdit(body({ name: '  Ada  ' }))

    expect(result).toEqual({
      ok: true,
      edit: { currentIcon: 'cat', name: 'Ada', icon: 'owl', color: 'sky-400' },
    })
  })

  it('rejects a name that is blank once trimmed', () => {
    expect(validateProfileEdit(body({ name: '   ' }))).toEqual({
      ok: false,
      error: 'Name is required',
    })
  })

  it('rejects a name longer than 20 characters', () => {
    expect(validateProfileEdit(body({ name: 'a'.repeat(21) }))).toEqual({
      ok: false,
      error: 'Name is too long',
    })
  })

  it('measures length after trimming, so padding never pushes a legal name over', () => {
    const result = validateProfileEdit(body({ name: `  ${'a'.repeat(20)}  ` }))

    expect(result.ok).toBe(true)
  })

  it('rejects a body with a missing or non-string field', () => {
    expect(validateProfileEdit(body({ icon: undefined }))).toEqual({
      ok: false,
      error: 'Missing fields',
    })
    expect(validateProfileEdit(body({ currentIcon: 7 }))).toEqual({
      ok: false,
      error: 'Missing fields',
    })
  })

  it('rejects a body that is not an object', () => {
    expect(validateProfileEdit(null)).toEqual({ ok: false, error: 'Missing fields' })
    expect(validateProfileEdit('nope')).toEqual({ ok: false, error: 'Missing fields' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test functions/_shared/profileEdits.test.ts`
Expected: FAIL — cannot resolve `./profileEdits`.

- [ ] **Step 3: Write the implementation**

Create `functions/_shared/profileEdits.ts`:

```ts
/** Matches the maxLength on the name input in ProfileCreator/ProfileEditForm. */
export const MAX_PROFILE_NAME_LENGTH = 20;

export interface ProfileEdit {
  currentIcon: string;
  name: string;
  icon: string;
  color: string;
}

export type ProfileEditValidation =
  | { ok: true; edit: ProfileEdit }
  | { ok: false; error: string };

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Validates a PATCH /api/profiles/:id body. Every field is required — the
 * client always holds current values for all three editable fields, so there
 * is no partial-update case to reason about.
 */
export function validateProfileEdit(body: unknown): ProfileEditValidation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Missing fields' };
  }

  const { currentIcon, name, icon, color } = body as Record<string, unknown>;
  if (!isString(currentIcon) || !isString(name) || !isString(icon) || !isString(color)) {
    return { ok: false, error: 'Missing fields' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Name is required' };
  }
  if (trimmed.length > MAX_PROFILE_NAME_LENGTH) {
    return { ok: false, error: 'Name is too long' };
  }

  return { ok: true, edit: { currentIcon, name: trimmed, icon, color } };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test functions/_shared/profileEdits.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add functions/_shared/profileEdits.ts functions/_shared/profileEdits.test.ts
git commit -m "feat: validate profile edit request bodies"
```

---

### Task 2: PATCH endpoint

**Files:**
- Modify: `functions/api/profiles/[id].ts`

**Interfaces:**
- Consumes: `validateProfileEdit`, `ProfileEdit` from `functions/_shared/profileEdits.ts`.
- Produces: `PATCH /api/profiles/:id`. Request `{ currentIcon, name, icon, color }`. Responses: 200 with `{ id, name, icon, color, createdAt, lastActive }`; 400 `{ error }`; 401 `{ error: 'Incorrect icon' }`; 404 plain text; 409 `{ error: 'Name already taken' }`.

There is no test harness for D1-backed handlers in this repo — `progressSql.test.ts` exists only because that module is pure. Task 1 covers the branching that can be unit-tested; this task is verified by the type build plus a manual pass against local D1, which is how the other Functions here are checked.

- [ ] **Step 1: Add the handler**

Append to `functions/api/profiles/[id].ts` (keep the existing `onRequestGet` and `onRequestDelete`), and add the import at the top of the file:

```ts
import { validateProfileEdit } from '../../_shared/profileEdits';
```

```ts
export const onRequestPatch: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id as string;
  const validation = validateProfileEdit(await request.json());
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { currentIcon, name, icon, color } = validation.edit;

  const profile = await env.DB.prepare(
    `SELECT icon FROM profiles WHERE id = ?`
  ).bind(id).first<{ icon: string }>();

  if (!profile) {
    return new Response('Profile not found', { status: 404 });
  }

  // Same check, same status, same body shape as /verify: one status code, one
  // meaning, so the client maps 401 to "wrong icon" wherever it sees it.
  if (profile.icon !== currentIcon) {
    return Response.json({ error: 'Incorrect icon' }, { status: 401 });
  }

  const taken = await env.DB.prepare(
    `SELECT id FROM profiles WHERE name = ? COLLATE NOCASE AND id != ?`
  ).bind(name, id).first();

  if (taken) {
    return Response.json({ error: 'Name already taken' }, { status: 409 });
  }

  try {
    // last_active is deliberately untouched: editing a profile is not a
    // sign-in, and the picker orders by it.
    await env.DB.prepare(
      `UPDATE profiles SET name = ?, icon = ?, color = ? WHERE id = ?`
    ).bind(name, icon, color, id).run();
  } catch (err) {
    // idx_profiles_name_unique is the real guard; the SELECT above only buys a
    // friendlier message when there is no race between check and write.
    if (String(err).includes('UNIQUE')) {
      return Response.json({ error: 'Name already taken' }, { status: 409 });
    }
    throw err;
  }

  const updated = await env.DB.prepare(
    `SELECT id, name, icon, color, created_at as createdAt, last_active as lastActive
     FROM profiles WHERE id = ?`
  ).bind(id).first();

  return Response.json(updated);
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `bun run build`
Expected: PASS — `tsc -b` clean, vite build succeeds.

- [ ] **Step 3: Verify by hand against local D1**

In terminal A:

```bash
bun run db:migrate:local
bun run dev:api
```

In terminal B (wrangler serves on 8788):

```bash
# Create a profile to edit, and capture its id
curl -s -X POST localhost:8788/api/profiles \
  -H 'content-type: application/json' \
  -d '{"name":"Patch Test","icon":"cat","color":"garden-500"}'

# Wrong current icon -> 401
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH localhost:8788/api/profiles/<id> \
  -H 'content-type: application/json' \
  -d '{"currentIcon":"owl","name":"Patch Test","icon":"owl","color":"sky-400"}'

# Blank name -> 400
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH localhost:8788/api/profiles/<id> \
  -H 'content-type: application/json' \
  -d '{"currentIcon":"cat","name":"   ","icon":"owl","color":"sky-400"}'

# Correct icon -> 200 with the updated row
curl -s -X PATCH localhost:8788/api/profiles/<id> \
  -H 'content-type: application/json' \
  -d '{"currentIcon":"cat","name":"Renamed","icon":"owl","color":"sky-400"}'

# The new icon is now the password: verify with it -> 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8788/api/profiles/<id>/verify \
  -H 'content-type: application/json' -d '{"icon":"owl"}'

# The old icon no longer works -> 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8788/api/profiles/<id>/verify \
  -H 'content-type: application/json' -d '{"icon":"cat"}'
```

Expected: `401`, `400`, the updated JSON row, `200`, `401`, in that order. Then stop both terminals (`bun run cleanup` if ports stay held).

- [ ] **Step 4: Commit**

```bash
git add functions/api/profiles/\[id\].ts
git commit -m "feat: add PATCH endpoint for editing a profile"
```

---

### Task 3: Client API and store action

**Files:**
- Modify: `src/types/api.ts`, `src/lib/api.ts`, `src/stores/profileStore.ts`, `src/test/syncFixtures.ts`
- Test: `src/stores/profileStore.test.ts`

**Interfaces:**
- Consumes: the PATCH contract from Task 2.
- Produces:
  - `interface UpdateProfileRequest { currentIcon: string; name: string; icon: string; color: string }` from `src/types/api.ts`
  - `api.updateProfile(id: string, changes: UpdateProfileRequest): Promise<Profile>`
  - `useProfileStore.getState().updateProfile(changes: UpdateProfileRequest): Promise<Profile>` — resolves with the updated profile, re-throws `ApiError` on failure and sets no store error state.
  - From `src/test/syncFixtures.ts`: `SESSION_KEY: string`, `errorResponse(status: number, body: unknown): Response`.

- [ ] **Step 1: Add the test fixtures**

In `src/test/syncFixtures.ts`, add next to `PENDING_KEY`:

```ts
/** Disk key for the auto-login session cache. */
export const SESSION_KEY = 'ttt_session'
```

and add next to `jsonResponse`:

```ts
export function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response
}
```

- [ ] **Step 2: Write the failing tests**

Append to `src/stores/profileStore.test.ts` a new top-level describe block. First extend the existing import from `../test/syncFixtures` to add `SESSION_KEY`, `errorResponse`, `jsonResponse`, and the type-only `FetchSignature`:

```ts
import {
  PENDING_KEY,
  SESSION_KEY,
  errorResponse,
  failingFetch,
  jsonResponse,
  lastFetchInit,
  makeProfile,
  makeSyncFact,
  noContent,
  okFetch,
  persistedFactKeys,
  readBuckets,
  resetProfileStore,
  retriableFetch,
} from '../test/syncFixtures'
import type { FetchSignature } from '../test/syncFixtures'
```

Then the new block:

```ts
describe('profileStore updateProfile', () => {
  const updated = {
    id: 'kid-a',
    name: 'Ada',
    icon: 'owl',
    color: 'sky-400',
    createdAt: 0,
    lastActive: 0,
  }

  function signIn() {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: 'kid-a', icon: 'cat' }))
    useProfileStore.setState({
      currentProfile: makeProfile('kid-a'),
      profiles: [{ id: 'kid-a', name: 'kid-a', color: 'garden-500', lastActive: 0 }],
    })
  }

  function savedSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY)!)
  }

  beforeEach(() => {
    localStorage.clear()
    resetProfileStore()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('PATCHes the profile and writes the new icon to the saved session', async () => {
    const fetchMock = vi.fn<FetchSignature>(async () => jsonResponse(updated))
    vi.stubGlobal('fetch', fetchMock)
    signIn()

    await useProfileStore.getState().updateProfile({
      currentIcon: 'cat',
      name: 'Ada',
      icon: 'owl',
      color: 'sky-400',
    })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/profiles/kid-a')
    expect(lastFetchInit(fetchMock).method).toBe('PATCH')
    // The load-bearing assertion: a stale cached icon makes the next launch
    // auto-login with a dead password and dump the child at the picker.
    expect(savedSession()).toEqual({ profileId: 'kid-a', icon: 'owl' })
  })

  it('updates the current profile and its entry in the cached list', async () => {
    vi.stubGlobal('fetch', vi.fn<FetchSignature>(async () => jsonResponse(updated)))
    signIn()

    await useProfileStore.getState().updateProfile({
      currentIcon: 'cat',
      name: 'Ada',
      icon: 'owl',
      color: 'sky-400',
    })

    expect(useProfileStore.getState().currentProfile).toEqual(updated)
    expect(useProfileStore.getState().profiles).toEqual([
      { id: 'kid-a', name: 'Ada', color: 'sky-400', lastActive: 0 },
    ])
  })

  it('leaves the session and current profile untouched when the server rejects it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<FetchSignature>(async () => errorResponse(409, { error: 'Name already taken' }))
    )
    signIn()

    await expect(
      useProfileStore.getState().updateProfile({
        currentIcon: 'cat',
        name: 'Taken',
        icon: 'owl',
        color: 'sky-400',
      })
    ).rejects.toMatchObject({ status: 409 })

    expect(savedSession()).toEqual({ profileId: 'kid-a', icon: 'cat' })
    expect(useProfileStore.getState().currentProfile?.name).toBe('kid-a')
  })

  it('rejects when no profile is signed in', async () => {
    const fetchMock = vi.fn<FetchSignature>(async () => jsonResponse(updated))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      useProfileStore.getState().updateProfile({
        currentIcon: 'cat',
        name: 'Ada',
        icon: 'owl',
        color: 'sky-400',
      })
    ).rejects.toThrow()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun run test src/stores/profileStore.test.ts`
Expected: FAIL — `updateProfile is not a function`.

- [ ] **Step 4: Add the request type**

In `src/types/api.ts`, below `CreateProfileRequest`:

```ts
export interface UpdateProfileRequest {
  /** The caller's current icon, re-verified server-side before any write. */
  currentIcon: string;
  name: string;
  icon: string;
  color: string;
}
```

- [ ] **Step 5: Add the API method**

In `src/lib/api.ts`, add `UpdateProfileRequest` to the type import from `../types/api`, then add below `createProfile`:

```ts
  async updateProfile(id: string, changes: UpdateProfileRequest): Promise<Profile> {
    return request(`/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
  },
```

- [ ] **Step 6: Add the store action**

In `src/stores/profileStore.ts`, add `UpdateProfileRequest` to the type import, declare it in the `ProfileState` interface next to `createProfile`:

```ts
  updateProfile: (changes: UpdateProfileRequest) => Promise<Profile>;
```

and implement it after `createProfile`:

```ts
  updateProfile: async (changes: UpdateProfileRequest) => {
    const { currentProfile } = get();
    if (!currentProfile) throw new Error('No profile signed in');

    const updated = await api.updateProfile(currentProfile.id, changes);

    // Re-cache the session under the new icon. The old icon is now a dead
    // password, so a stale cache would auto-login, 401, silently clear itself,
    // and drop the child at the picker on next launch.
    saveSession(updated.id, updated.icon);

    set((state) => ({
      currentProfile: updated,
      profiles: state.profiles.map((p) =>
        p.id === updated.id ? { ...p, name: updated.name, color: updated.color } : p
      ),
    }));
    return updated;
  },
```

No `isLoading`/`error` bookkeeping here on purpose: `error` is rendered by `ProfilePicker`, and a message left behind would surface there after the next sign-out. The editor owns its own error state.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun run test src/stores/profileStore.test.ts`
Expected: PASS, including the four new tests.

- [ ] **Step 8: Commit**

```bash
git add src/types/api.ts src/lib/api.ts src/stores/profileStore.ts src/stores/profileStore.test.ts src/test/syncFixtures.ts
git commit -m "feat: add updateProfile action that re-caches the session icon"
```

---

### Task 4: Extract ColorPicker

**Files:**
- Create: `src/components/common/ColorPicker.tsx`
- Test: `src/components/common/ColorPicker.test.tsx`
- Modify: `src/components/common/ProfileCreator.tsx:151-162`

**Interfaces:**
- Consumes: `PROFILE_COLORS`, `ProfileColor` from `src/types/api.ts`.
- Produces: `<ColorPicker selected={ProfileColor} onSelect={(color: ProfileColor) => void} />`. Renders no outer margin — callers own spacing. Each swatch has `aria-label` equal to the color key.

- [ ] **Step 1: Write the failing test**

Create `src/components/common/ColorPicker.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import { ColorPicker } from './ColorPicker'
import { PROFILE_COLORS } from '../../types/api'

describe('ColorPicker', () => {
  afterEach(cleanup)

  it('renders one swatch per profile color', () => {
    render(<ColorPicker selected="garden-500" onSelect={() => {}} />)

    for (const color of PROFILE_COLORS) {
      expect(screen.getByRole('button', { name: color })).toBeTruthy()
    }
  })

  it('reports the clicked color', () => {
    const onSelect = vi.fn()
    render(<ColorPicker selected="garden-500" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'sky-400' }))

    expect(onSelect).toHaveBeenCalledWith('sky-400')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/components/common/ColorPicker.test.tsx`
Expected: FAIL — cannot resolve `./ColorPicker`.

- [ ] **Step 3: Write the component**

Create `src/components/common/ColorPicker.tsx`:

```tsx
import { PROFILE_COLORS, type ProfileColor } from '../../types/api';

interface ColorPickerProps {
  selected: ProfileColor;
  onSelect: (color: ProfileColor) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div className="flex justify-center gap-3">
      {PROFILE_COLORS.map((colorKey) => (
        <button
          key={colorKey}
          type="button"
          aria-label={colorKey}
          onClick={() => onSelect(colorKey)}
          className={`w-10 h-10 rounded-full bg-${colorKey} ${
            selected === colorKey ? 'ring-2 ring-offset-2 ring-gray-400' : ''
          }`}
        />
      ))}
    </div>
  );
}
```

The `bg-${colorKey}` interpolation is safe here — `src/index.css` carries an explicit profile-color safelist for exactly this pattern, which `ProfileCreator` and `Navigation` already rely on.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/components/common/ColorPicker.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Consume it from ProfileCreator**

In `src/components/common/ProfileCreator.tsx`, add `import { ColorPicker } from './ColorPicker';` and replace the swatch block (the `<div className="flex justify-center gap-3 mb-6">` and its `PROFILE_COLORS.map` contents) with:

```tsx
            <div className="mb-6">
              <ColorPicker selected={color} onSelect={setColor} />
            </div>
```

Then drop `PROFILE_COLORS` from the `../../types/api` import — `ProfileIcon` and `ProfileColor` are still used.

- [ ] **Step 6: Verify nothing regressed**

Run: `bun run test && bun run lint && bun run build`
Expected: all PASS. Lint would flag `PROFILE_COLORS` if it were left imported but unused.

- [ ] **Step 7: Commit**

```bash
git add src/components/common/ColorPicker.tsx src/components/common/ColorPicker.test.tsx src/components/common/ProfileCreator.tsx
git commit -m "refactor: extract ColorPicker from ProfileCreator"
```

---

### Task 5: Label the icon buttons

**Files:**
- Modify: `src/components/common/IconPicker.tsx:18-29`

**Interfaces:**
- Consumes: nothing new.
- Produces: each icon button exposes an accessible name equal to its icon key (`cat`, `owl`, …), which Task 6's tests target.

- [ ] **Step 1: Add the label**

In `src/components/common/IconPicker.tsx`, add one prop to the `motion.button`, right after `type="button"`:

```tsx
            aria-label={iconKey}
```

`showLabels` renders a visible caption only on some screens, so the button has no accessible name without this. Same fix, same reason as the number pad labels in 553459b.

- [ ] **Step 2: Verify**

Run: `bun run test && bun run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/IconPicker.tsx
git commit -m "test: give the icon picker buttons accessible names"
```

---

### Task 6: ProfileEditor overlay

**Files:**
- Create: `src/components/common/ProfileEditor.tsx`, `src/components/common/ProfileEditForm.tsx`
- Test: `src/components/common/ProfileEditor.test.tsx`

**Interfaces:**
- Consumes: `useProfileStore` (`currentProfile`, `updateProfile`), `ApiError` from `src/lib/api.ts`, `IconPicker`, `ColorPicker`, `iconMap`, `ProfileIcon`/`ProfileColor`/`Profile` types.
- Produces:
  - `<ProfileEditor onClose={() => void} />` — a fixed full-screen overlay. Closes itself on a successful save.
  - `<ProfileEditForm profile={Profile} error={string | null} isSaving={boolean} onSave={(name: string, icon: ProfileIcon, color: ProfileColor) => void} onCancel={() => void} />`
  - Name input accessible name: `Your name`. Save button: `Save changes`. Cancel button: `Cancel`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/common/ProfileEditor.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, act, cleanup, screen } from '@testing-library/react'
import { ProfileEditor } from './ProfileEditor'
import { useProfileStore } from '../../stores/profileStore'
import { makeProfile } from '../../test/syncFixtures'
import { ApiError } from '../../lib/api'

// makeProfile('kid-a') is name 'kid-a', icon 'cat', color 'garden-500'.
function signIn(updateProfile: ReturnType<typeof vi.fn>) {
  useProfileStore.setState({ currentProfile: makeProfile('kid-a'), updateProfile })
}

/** Clear the verify phase by picking the profile's real icon. */
function passVerify() {
  fireEvent.click(screen.getByRole('button', { name: 'cat' }))
}

describe('ProfileEditor', () => {
  let onClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onClose = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('stays on the verify phase and invites a retry after a wrong icon', () => {
    signIn(vi.fn())
    render(<ProfileEditor onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'owl' }))

    expect(screen.getByText("That's not your icon. Try again!")).toBeTruthy()
    expect(screen.queryByLabelText('Your name')).toBeNull()
  })

  it('advances to the form, prefilled, once the current icon is picked', () => {
    signIn(vi.fn())
    render(<ProfileEditor onClose={onClose} />)

    passVerify()

    expect(screen.getByLabelText<HTMLInputElement>('Your name').value).toBe('kid-a')
  })

  it('saves the trimmed name with the picked icon and color', async () => {
    const updateProfile = vi.fn().mockResolvedValue(makeProfile('kid-a'))
    signIn(updateProfile)
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '  Ada  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'owl' }))
    fireEvent.click(screen.getByRole('button', { name: 'sky-400' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    })

    expect(updateProfile).toHaveBeenCalledWith({
      currentIcon: 'cat',
      name: 'Ada',
      icon: 'owl',
      color: 'sky-400',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('disables saving until something actually changes', () => {
    signIn(vi.fn())
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    const save = screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } })

    expect(save.disabled).toBe(false)
  })

  it('keeps the child in the form and names the clash on a duplicate name', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new ApiError(409, 'Name already taken'))
    signIn(updateProfile)
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taken' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    })

    expect(screen.getByText('That name is already taken!')).toBeTruthy()
    expect(screen.getByLabelText('Your name')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('falls back to the verify phase when the server rejects the icon', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new ApiError(401, 'Incorrect icon'))
    signIn(updateProfile)
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    })

    expect(screen.queryByLabelText('Your name')).toBeNull()
    expect(screen.getByText("That's not your icon. Try again!")).toBeTruthy()
  })
})
```

`ApiError` is currently exported from `src/lib/api.ts` (`export { ApiError }`), so no change is needed there.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/components/common/ProfileEditor.test.tsx`
Expected: FAIL — cannot resolve `./ProfileEditor`.

- [ ] **Step 3: Write the form**

Create `src/components/common/ProfileEditForm.tsx`:

```tsx
import { useState } from 'react';
import { Check } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { ColorPicker } from './ColorPicker';
import { iconMap } from '../../lib/iconMap';
import type { Profile, ProfileColor, ProfileIcon } from '../../types/api';

interface ProfileEditFormProps {
  profile: Profile;
  error: string | null;
  isSaving: boolean;
  onSave: (name: string, icon: ProfileIcon, color: ProfileColor) => void;
  onCancel: () => void;
}

export function ProfileEditForm({
  profile,
  error,
  isSaving,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const [name, setName] = useState(profile.name);
  const [icon, setIcon] = useState(profile.icon as ProfileIcon);
  const [color, setColor] = useState(profile.color as ProfileColor);

  const trimmed = name.trim();
  const hasChanges =
    trimmed !== profile.name || icon !== profile.icon || color !== profile.color;
  const canSave = trimmed.length > 0 && hasChanges && !isSaving;

  const IconComponent = iconMap[icon];

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center bg-${color}`}
        >
          <IconComponent className="w-12 h-12 text-white" />
        </div>
      </div>

      <div>
        <label htmlFor="profile-name" className="block text-sm text-gray-600 mb-2">
          Your name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-center text-lg"
        />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-1">Your secret icon</p>
        <p className="text-xs text-gray-400 mb-3">
          This is how you log in. Pick a new one to change it.
        </p>
        <IconPicker selected={icon} onSelect={setIcon} />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-3">Your color</p>
        <ColorPicker selected={color} onSelect={setColor} />
      </div>

      {error && <p className="text-red-500 text-center text-sm">{error}</p>}

      <div className="space-y-3">
        <button
          onClick={() => onSave(trimmed, icon, color)}
          disabled={!canSave}
          className="w-full py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? 'Saving...' : (<>Save changes <Check className="w-4 h-4" /></>)}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="w-full py-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

Note the label is a real `<label htmlFor>`, which is what gives `getByLabelText('Your name')` its target. The Save button's accessible name is `Save changes` from its text; while saving it becomes `Saving...`, which is why the tests assert on the pre-save state.

- [ ] **Step 4: Write the overlay**

Create `src/components/common/ProfileEditor.tsx`:

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { ProfileEditForm } from './ProfileEditForm';
import { useProfileStore } from '../../stores/profileStore';
import { ApiError } from '../../lib/api';
import type { ProfileColor, ProfileIcon } from '../../types/api';

const WRONG_ICON = "That's not your icon. Try again!";

interface ProfileEditorProps {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const currentProfile = useProfileStore((s) => s.currentProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [currentIcon, setCurrentIcon] = useState<ProfileIcon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!currentProfile) return null;

  // Advancing is checked client-side for instant feedback; the server re-checks
  // currentIcon on the PATCH, so this is convenience, not the security boundary.
  const handleVerify = (icon: ProfileIcon) => {
    if (icon !== currentProfile.icon) {
      setError(WRONG_ICON);
      return;
    }
    setCurrentIcon(icon);
    setError(null);
  };

  const handleSave = async (name: string, icon: ProfileIcon, color: ProfileColor) => {
    if (!currentIcon) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateProfile({ currentIcon, name, icon, color });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // The icon changed under us — send them back to prove the new one.
        setCurrentIcon(null);
        setError(WRONG_ICON);
      } else if (err instanceof ApiError && err.status === 409) {
        setError('That name is already taken!');
      } else {
        setError("Couldn't save that. Try again!");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[var(--color-cream)] z-50 flex flex-col"
    >
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-garden-500 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Your profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-12">
        {currentIcon ? (
          <ProfileEditForm
            profile={currentProfile}
            error={error}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={onClose}
          />
        ) : (
          <div>
            <p className="text-gray-600 text-center mb-1">Pick your icon to make changes</p>
            <p className="text-gray-400 text-sm text-center mb-4">
              The one you use to log in
            </p>
            {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
            <IconPicker onSelect={handleVerify} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

Phase is derived from `currentIcon` rather than tracked separately — one piece of state, so the two can never disagree. Clearing it on a 401 returns to the verify screen.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test src/components/common/ProfileEditor.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 6: Check the line limits**

Run: `wc -l src/components/common/ProfileEditor.tsx src/components/common/ProfileEditForm.tsx`
Expected: both well under 300.

- [ ] **Step 7: Commit**

```bash
git add src/components/common/ProfileEditor.tsx src/components/common/ProfileEditForm.tsx src/components/common/ProfileEditor.test.tsx
git commit -m "feat: add the profile editor overlay"
```

---

### Task 7: Wire it into Settings

**Files:**
- Modify: `src/components/common/SettingsModal.tsx`, `src/components/common/index.ts`, `CLAUDE.md`

**Interfaces:**
- Consumes: `<ProfileEditor onClose>` from Task 6, `useProfileStore`, `iconMap`.
- Produces: the user-facing entry point. Nothing else depends on this task.

- [ ] **Step 1: Add the entry row and the overlay**

In `src/components/common/SettingsModal.tsx`:

Add to the imports:

```tsx
import { ProfileEditor } from './ProfileEditor'
import { useProfileStore } from '../../stores/profileStore'
import { iconMap } from '../../lib/iconMap'
import type { ProfileIcon } from '../../types/api'
```

Add to the component body, next to the existing `showScience` state:

```tsx
  const currentProfile = useProfileStore((s) => s.currentProfile)
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const ProfileIconComponent = currentProfile ? iconMap[currentProfile.icon as ProfileIcon] : null
```

Insert as the first child of the `<div className="space-y-6">`, above the "Read aloud" row:

```tsx
          {currentProfile && ProfileIconComponent && (
            <button
              onClick={() => setShowProfileEditor(true)}
              className="flex items-center gap-3 w-full py-3 text-left hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center bg-${currentProfile.color}`}
              >
                <ProfileIconComponent className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-800">{currentProfile.name}</span>
                <p className="text-xs text-gray-500 mt-0.5">Change name, icon, or color</p>
              </div>
            </button>
          )}
```

Add inside the existing `<AnimatePresence>` at the bottom, alongside `SciencePage`:

```tsx
        {showProfileEditor && (
          <ProfileEditor onClose={() => setShowProfileEditor(false)} />
        )}
```

- [ ] **Step 2: Export the new components**

In `src/components/common/index.ts`, add in alphabetical position:

```ts
export { ColorPicker } from './ColorPicker'
export { ProfileEditor } from './ProfileEditor'
```

- [ ] **Step 3: Verify the whole suite**

Run: `bun run test && bun run lint && bun run build`
Expected: all PASS.

- [ ] **Step 4: Verify in the running app**

Run: `bun run dev`, then in the browser:

1. Sign in as a profile (create one if the local D1 is empty).
2. Settings → tap the profile row → pick a wrong icon → confirm the retry message appears with no lockout.
3. Pick the correct icon → change name, icon, and color → Save.
4. Confirm the bottom-nav profile chip shows the new name, icon, and color.
5. Reload the page → confirm auto-login still works (this is the session re-cache from Task 3; a failure drops you at the picker).
6. Switch profile → confirm signing back in requires the *new* icon and rejects the old one.

- [ ] **Step 5: Note it in CLAUDE.md**

In the "Three Modes + Settings" section, replace the Settings line with:

```markdown
4. **Settings** - Focus table selection, read-aloud, and profile editing (name, icon password, color) via `ProfileEditor`
```

- [ ] **Step 6: Commit**

```bash
git add src/components/common/SettingsModal.tsx src/components/common/index.ts CLAUDE.md
git commit -m "feat: open the profile editor from Settings"
```

---

## Deployment Note

No migration to apply. `PATCH /api/profiles/:id` works against the existing schema, and `idx_profiles_name_unique` from `migrations/0002_unique_names.sql` is already in production. Deploy is a normal build and push.
