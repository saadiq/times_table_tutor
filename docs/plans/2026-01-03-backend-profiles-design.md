# Backend Data Persistence with Profiles

## Overview

Add server-side data persistence with a simple profile system. Users create profiles (name + icon + color) displayed on a home screen picker. No authentication - profiles are global and accessible from any device.

## Tech Stack

- **Backend**: Cloudflare Workers (Pages Functions)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Deployment**: Cloudflare Pages (frontend + API together)

## User Flow

### Profile Picker (Home Screen)

When the app loads, users see a profile selection overlay:

- Grid of profile cards: icon + background color + name
- Sorted by last active (most recent first)
- Shows up to 12 profiles initially, "Show more" if needed
- "+ New Profile" card at the end

### Creating a Profile

1. Enter name (text input, required)
2. Pick an icon (grid of ~12 Lucide icons: Cat, Dog, Bird, Star, Heart, Flower, Rocket, Sun, Moon, Fish, Rabbit, Bear)
3. Pick a background color (grid of ~8 colors from existing palette)
4. "Start Learning" button

### Selecting a Profile

Tap profile card → fetch data from D1 → cache locally → enter app.

### Switching Profiles

Profile icon in navigation returns to the profile picker overlay.

## Data Model

### D1 Tables

```sql
-- Profiles
CREATE TABLE profiles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  last_active   INTEGER NOT NULL
);

-- Learning progress (one row per fact per profile)
CREATE TABLE fact_progress (
  profile_id        TEXT NOT NULL,
  fact              TEXT NOT NULL,
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

-- Garden items
CREATE TABLE garden_items (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  type          TEXT NOT NULL,
  position_x    REAL NOT NULL,
  position_y    REAL NOT NULL,
  earned_for    TEXT,
  earned_at     INTEGER,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Profile stats (coins, themes)
CREATE TABLE profile_stats (
  profile_id        TEXT PRIMARY KEY,
  coins             INTEGER NOT NULL DEFAULT 0,
  unlocked_themes   TEXT NOT NULL DEFAULT '["flower"]',
  current_theme     TEXT NOT NULL DEFAULT 'flower',
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
```

Note: Focus tables and session state stay client-side only (device/session specific).

## API Endpoints

```
GET  /api/profiles
     → Returns recent profiles (limit 20, sorted by last_active)
     → Response: [{ id, name, icon, color, last_active }]

POST /api/profiles
     → Create new profile
     → Body: { name, icon, color }
     → Response: { id, name, icon, color }

GET  /api/profiles/:id
     → Fetch full profile data (progress, garden, stats)
     → Response: { profile, facts[], gardenItems[], stats }
     → Also updates last_active timestamp

PUT  /api/profiles/:id/progress
     → Sync fact progress after practice
     → Body: { facts: [{ fact, confidence, ... }] }
     → Bulk upsert for efficiency

PUT  /api/profiles/:id/garden
     → Sync garden state
     → Body: { items: [...], stats: { coins, themes, currentTheme } }

DELETE /api/profiles/:id
     → Remove profile and all related data
```

## Sync Strategy

- On profile select: `GET /api/profiles/:id` → cache everything locally
- After each answer: debounced `PUT /progress` (batch updates every 2-3 seconds)
- After garden changes: immediate `PUT /garden`
- Offline: queue updates, sync when back online (simple retry queue)

## Frontend Integration

### New Files

```
src/
├── lib/
│   └── api.ts           -- API client (fetch wrapper, error handling)
├── stores/
│   └── profileStore.ts  -- Current profile state, sync logic
└── components/
    └── common/
        ├── ProfilePicker.tsx   -- Home overlay with profile grid
        ├── ProfileCard.tsx     -- Single profile display
        └── ProfileCreator.tsx  -- New profile form
```

### Modified Stores

Existing stores (`progressStore`, `gardenStore`) get:

1. `loadFromServer(data)` action to hydrate from API response
2. `toSyncPayload()` method to export data for sync
3. Remove auto-loading from localStorage on mount
4. Profile selection triggers hydration instead

### New profileStore

```typescript
{
  currentProfile: Profile | null,
  profiles: Profile[],
  isLoading: boolean,

  fetchProfiles(),
  selectProfile(id),
  createProfile({ name, icon, color }),
  clearProfile(),
  syncProgress(facts),
  syncGarden(items, stats),
}
```

### App.tsx Changes

- If `currentProfile` is null → show `<ProfilePicker />`
- Otherwise → show existing app with Navigation

## Cloudflare Setup

### Project Structure

```
times_table_tutor/
├── src/                    -- Existing React app
├── functions/              -- Cloudflare Pages Functions
│   └── api/
│       └── profiles/
│           ├── index.ts        -- GET list, POST create
│           └── [id].ts         -- GET, DELETE single profile
│           └── [id]/
│               ├── progress.ts -- PUT progress sync
│               └── garden.ts   -- PUT garden sync
├── wrangler.toml           -- D1 database config
└── schema.sql              -- Database migrations
```

### Wrangler Config

```toml
name = "times-table-tutor"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "ttt-db"
database_id = "<generated>"
```

### Development Commands

```bash
bunx wrangler d1 create ttt-db
bunx wrangler d1 execute ttt-db --file=schema.sql
bunx wrangler pages dev --d1=DB=ttt-db -- bun run dev
```

### Deployment

- Connect repo to Cloudflare Pages
- D1 binding configured in dashboard
- Frontend + API deploy together

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | None | Kid-friendly, no passwords to remember |
| Profile identity | Name + icon + color | Like Netflix profiles, visually distinct |
| Profile scope | Global | Accessible from any device |
| Profile display | Recent first, limit 20 | Keeps UI clean as list grows |
| Data sync | Server-first, local cache | Good UX, server is authority |
| New profile data | Start fresh | Simple, no migration complexity |
| Backend | Cloudflare Workers + D1 | Single platform, edge performance |
