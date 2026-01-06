# Kid-Friendly Icon Authentication

**Date:** 2026-01-05
**Status:** Approved
**Goal:** Add lightweight authentication to prevent accidental profile access by curious users

## Problem

The app is being opened to public internet access. Currently, anyone can:
- See all profiles on the profile list
- Select any profile with one tap
- Accidentally mess up someone else's learning progress

We need friction to prevent casual curiosity, not security against determined attackers.

## Solution: Icon as Password

Your profile icon is your password. Simple, memorable, visual.

- **20 visually distinct icons** to choose from
- **Login flow:** See names → tap your name → pick your icon from grid of 20
- **1-in-20 friction** - enough to stop casual curiosity, easy for kids to remember

### Icon Set (20 total)

**Animals (7):** cat, dog, rabbit, fish, owl, turtle, butterfly
**Nature (4):** sun, moon, flower, tree
**Objects (5):** rocket, star, heart, crown, diamond
**Fun (4):** rainbow, cloud, lightning, snowflake

Each has a distinct silhouette - no two look alike at small sizes.

## User Flows

### Profile Creation

1. **Name:** "What's your name?"
   - Validate not empty
   - Validate unique (case-insensitive)
   - If taken: "Someone already has that name. Try another!"

2. **Icon:** "Pick your secret icon"
   - Subtitle: "This is how you'll log in - remember it!"
   - Grid of 20 icons
   - Tap to select

3. **Color:** "Pick your color"
   - Same 8 color options as current

4. **Done:** Auto-login, navigate to app

### Login (Profile Selection)

1. **Profile List Screen:**
   - Shows all profile names in a list/grid
   - Each entry shows: name, color theme, last active date
   - **No icon visible** - that's the "password"
   - "Create Profile" button at bottom

2. **Icon Verification Screen** (after tapping a name):
   - Header: "Hi [Name]! Pick your icon"
   - Grid of all 20 icons
   - Tap correct icon → logged in
   - Tap wrong icon → gentle shake animation, "Try again"
   - No limit on attempts
   - "Not [Name]?" link to go back

3. **Success:** Load profile data, sync from cloud, navigate to app

### Session Persistence

- **Only verify on profile switch** - not every app open
- Store `currentProfileId` + `currentProfileIcon` in localStorage
- On app load with saved values: auto-login (no verify)
- On switch: clear both, require full verification flow

### Logged-In Experience

- Profile icon visible in header
- Tap icon for dropdown: "Switch Profile", "Delete Profile"
- Switching clears local stores and requires verification for new profile

## Database Changes

### Schema

```sql
-- Add unique constraint on name (case-insensitive)
CREATE UNIQUE INDEX profiles_name_unique ON profiles(name COLLATE NOCASE);

-- icon column already exists, just expand valid values to 20
```

### Valid Icon Values

```
cat, dog, rabbit, fish, owl, turtle, butterfly,
sun, moon, flower, tree,
rocket, star, heart, crown, diamond,
rainbow, cloud, lightning, snowflake
```

## API Changes

### `GET /api/profiles` (list)

**Change:** Remove icon from response

```typescript
// Response
{
  profiles: [
    { id, name, color, lastActive }  // no icon
  ]
}
```

### `POST /api/profiles` (create)

**Change:** Validate name uniqueness

```typescript
// Request
{ name, icon, color }

// Response (success)
{ id, name, icon, color, createdAt, lastActive }

// Response (409 Conflict)
{ error: "Name already taken" }
```

### `POST /api/profiles/[id]/verify` (new)

Verify icon and return full profile data.

```typescript
// Request
{ icon: "rocket" }

// Response (success - 200)
{ id, name, icon, color, createdAt, lastActive, factProgress, gardenItems, stats }

// Response (wrong icon - 401)
{ error: "Incorrect icon" }
```

### `GET /api/profiles/[id]` (load)

**Change:** Remove or protect. Options:
- Delete endpoint entirely (use verify instead)
- Require icon in query param: `GET /api/profiles/[id]?icon=rocket`

Recommend: Delete and use verify endpoint only.

## Frontend Changes

### Store Updates (`profileStore.ts`)

```typescript
interface ProfileSummary {
  id: string
  name: string
  color: string
  lastActive: number
}

interface ProfileStore {
  // State
  profiles: ProfileSummary[]  // no icons
  currentProfile: Profile | null
  isVerifying: boolean

  // Actions
  fetchProfiles(): Promise<void>  // returns list without icons
  verifyAndSelect(id: string, icon: string): Promise<boolean>
  createProfile(name: string, icon: string, color: string): Promise<void>
  clearProfile(): void  // switch profiles
}
```

### localStorage Keys

```typescript
// Existing
ttt_progress, ttt_garden, ttt_session, ttt_focus_tables, ttt_attempts, ttt_progress_view

// Updated
ttt_current_profile_id: string    // profile ID for session persistence
ttt_current_profile_icon: string  // icon for auto-login (new)
```

### New Components

**`ProfileList`** - Shows all profile names (no icons)
- List of cards: name, color accent, "Last active 2 days ago"
- "Create Profile" button
- Tapping a name → navigates to IconVerify

**`IconVerify`** - The "password" screen
- "Hi [Name]! Pick your icon"
- 5x4 grid of 20 icons
- Wrong pick → shake animation + "Try again"
- Correct → load profile, navigate to app
- "Not [Name]?" back link

**`IconPicker`** - Reusable grid component
- 20 icons in 5x4 grid layout
- Selected state styling
- Used by ProfileCreator (step 2) and IconVerify

### Modified Components

**`ProfileCreator`** - Update to multi-step flow
- Step 1: Name input with uniqueness validation
- Step 2: Icon picker with "remember it!" messaging
- Step 3: Color picker
- Remove single-screen layout

**`ProfilePicker`** - Replace with ProfileList
- Remove icon display from profile cards
- Add navigation to IconVerify on tap

**Header** - Add profile icon display
- Show current profile icon
- Dropdown with "Switch Profile" action

## Design Principles

- **Kid-friendly:** No typing passwords, just tap an icon
- **Memorable:** Icon displayed while logged in reinforces memory
- **Low friction:** 1-in-20 chance, not security theater
- **Forgiving:** No attempt limits, friendly error messages
- **Simple:** Single icon, not sequences or PINs

## Out of Scope

- Password recovery (just create a new profile)
- Parent/admin controls
- Profile locking/blocking
- Age verification
- Rate limiting on verify attempts
