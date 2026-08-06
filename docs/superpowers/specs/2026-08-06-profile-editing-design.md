# Profile Editing (Change Icon Password, Name, Color)

**Date:** 2026-08-06
**Status:** Approved, ready for implementation planning

## Problem

A profile's icon is its password. Once a sibling learns it, the child has no way
to change it — the icon is set during profile creation and never again. Name and
color are equally frozen.

Add a Settings entry that lets a signed-in child change their icon, name, and
color, gated behind re-picking their current icon.

## Current Behavior

- `profiles.icon` holds one of the 20 `PROFILE_ICONS`, stored in plaintext.
- Sign-in is `POST /api/profiles/:id/verify` with `{ icon }`; a mismatch returns
  401.
- `GET /api/profiles` deliberately omits `icon` — it is the password.
- After a successful verify, `profileStore` caches `{ profileId, icon }` in
  localStorage under `ttt_session` for auto-login on next launch.
- Settings is `SettingsModal.tsx`, opened from the bottom nav.
- `migrations/0002_unique_names.sql` puts a `COLLATE NOCASE` unique index on
  `profiles.name`.

## Design

### Server

Add `onRequestPatch` to `functions/api/profiles/[id].ts`. Body:

```ts
{ currentIcon: string, name: string, icon: string, color: string }
```

All four fields are required. The client always holds current values for the
three editable fields, so sending all of them avoids partial-update semantics.

Handler sequence:

1. `SELECT` the profile by id. Missing → 404.
2. `profile.icon !== currentIcon` → 401 `{ error: 'Incorrect icon' }` — the same
   response shape `verify` already returns, so the client maps one status code
   to one meaning.
3. Trim `name`. Empty or longer than 20 characters → 400. (20 matches the
   `maxLength` on `ProfileCreator`'s name input.)
4. `SELECT id FROM profiles WHERE name = ? COLLATE NOCASE AND id != ?` →
   409 `{ error: 'Name already taken' }`. Also catch a unique-index violation
   from the `UPDATE` as a backstop against the race between check and write, and
   map it to the same 409.
5. `UPDATE profiles SET name = ?, icon = ?, color = ? WHERE id = ?`.
   Deliberately **not** `last_active` — editing a profile is not a sign-in, and
   the picker orders by `last_active`.
6. Return the updated profile row in the same shape as `POST /api/profiles`
   (`id, name, icon, color, createdAt, lastActive`).

No schema change, so no `migrations/*.sql` file and nothing to hand-apply before
deploy.

### Client API

```ts
async updateProfile(
  id: string,
  changes: { currentIcon: string; name: string; icon: string; color: string }
): Promise<Profile>
```

Plain `request()` call, no keepalive — this is a foreground action the user waits
on.

Add `UpdateProfileRequest` to `src/types/api.ts` alongside `CreateProfileRequest`.

### Store

`profileStore.updateProfile(changes)`:

1. Guard on `currentProfile`; no-op if absent.
2. Call `api.updateProfile`.
3. On success, in one `set`:
   - `currentProfile` = the returned profile
   - patch the matching entry in `profiles` (name and color; the list type
     carries no icon)
   - **`saveSession(id, updated.icon)`** — the load-bearing step. Without it the
     cached session still holds the old icon, so the next launch auto-logs-in,
     gets a 401, silently clears the session, and drops the child at the picker.
4. On failure, re-throw the `ApiError`. The store sets no error state: its
   `error` field is rendered by `ProfilePicker`, and a stale message would
   surface there after the next sign-out. The editor holds its own error state.

### UI

New `src/components/common/ProfileEditor.tsx`, a full-screen overlay rendered
from `SettingsModal` inside the existing `AnimatePresence` next to `SciencePage`.
Two phases in local state:

**Phase `verify`** — header with a back arrow, copy "Pick your icon to make
changes", and an `IconPicker`. A wrong pick shows "That's not your icon. Try
again!" inline and stays put. No lockout, no attempt counter, no timer, per the
app's anxiety-free principle. The picked icon is held in state as `currentIcon`
for the PATCH; the phase advance is optimistic (client-side comparison against
`currentProfile.icon`) and the server re-checks on save.

**Phase `edit`** — one form, all three fields:
- name text input, `maxLength={20}`
- `IconPicker` with `selected`
- `ColorPicker` (see below)
- a live preview circle showing icon on color, like `ProfileCreator`'s step 3
- Save, disabled while the name is empty or nothing has changed
- Cancel, returning to Settings

Server errors render inline above Save: 401 → "That's not your icon. Try again!"
(and drop back to phase `verify`), 409 → "That name is already taken!", anything
else → a generic retry message.

On success the overlay closes and Settings shows the updated row.

**Settings entry point** — a button row at the top of `SettingsModal`, above
"Read aloud": the current color circle with the current icon, the profile name,
and "Change name, icon, or color" as subtext.

**Shared extraction** — the color swatch row currently lives inline in
`ProfileCreator` step 3. Extract it to `src/components/common/ColorPicker.tsx`
and consume it from both `ProfileCreator` and `ProfileEditor`, rather than
duplicating the markup. Export `ColorPicker` and `ProfileEditor` from
`src/components/common/index.ts`.

## Consequence: changing the icon signs you out everywhere else

Another device's cached session replays the old icon on next launch, receives a
401 from `verify`, clears its own session, and lands on the profile picker. This
is intended — "my sibling learned my icon" is the motivating case, and a change
that left their signed-in device working would not solve it. It is worth knowing
because it also logs out the child's *own* second device.

The icon remains plaintext in D1, on the wire, and in localStorage. This design
does not change that; it is a family learning app, not an account system.

## Testing

Test-first, per `superpowers:test-driven-development`.

`src/stores/profileStore.test.ts` (extend):
- `updateProfile` re-saves `ttt_session` with the new icon
- `updateProfile` updates `currentProfile` and the matching `profiles` entry
- a failed `updateProfile` leaves the cached session and `currentProfile`
  untouched and re-throws

`src/components/common/ProfileEditor.test.tsx` (new, jsdom + Testing Library, as
`PracticeView.test.tsx` does):
- a wrong icon in phase `verify` shows the retry message and does not advance
- the correct icon advances to phase `edit` with fields prefilled
- Save calls the store with the trimmed name
- Save stays disabled when nothing has changed

Server handler logic is branching over SQL rather than extractable pure logic, so
it is covered through the store tests against a mocked `api` plus one manual pass
against `bun run dev:api` — matching how the other Functions in this repo are
verified. (`functions/_shared/progressSql.test.ts` exists only because that
module is pure.)

## Out of Scope

- Hashing the icon or any change to how sign-in stores credentials
- Parent/guardian recovery for a forgotten icon
- Changing another profile's details from a signed-in profile
- Any change to profile deletion
