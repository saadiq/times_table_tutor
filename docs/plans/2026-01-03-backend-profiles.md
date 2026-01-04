# Backend Profiles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Cloudflare Workers + D1 backend with Netflix-style profile picker for multi-user data persistence.

**Architecture:** Cloudflare Pages Functions serve API endpoints backed by D1 SQLite. Frontend shows profile picker on load, fetches user data on selection, caches locally, syncs changes with debounced updates.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), React 19, Zustand, TypeScript

---

## Task 1: Cloudflare D1 Schema

**Files:**
- Create: `schema.sql`
- Create: `wrangler.toml`

**Step 1: Create database schema**

Create `schema.sql`:

```sql
-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  last_active   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active DESC);

-- Learning progress (one row per fact per profile)
CREATE TABLE IF NOT EXISTS fact_progress (
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
CREATE TABLE IF NOT EXISTS garden_items (
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

CREATE INDEX IF NOT EXISTS idx_garden_items_profile ON garden_items(profile_id);

-- Profile stats (coins, themes)
CREATE TABLE IF NOT EXISTS profile_stats (
  profile_id        TEXT PRIMARY KEY,
  coins             INTEGER NOT NULL DEFAULT 0,
  unlocked_themes   TEXT NOT NULL DEFAULT '["flower"]',
  current_theme     TEXT NOT NULL DEFAULT 'flower',
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
```

**Step 2: Create wrangler config**

Create `wrangler.toml`:

```toml
name = "times-table-tutor"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "ttt-db"
database_id = "local"
```

**Step 3: Commit**

```bash
git add schema.sql wrangler.toml
git commit -m "feat: add D1 schema and wrangler config"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/types/api.ts`
- Modify: `src/types/index.ts`

**Step 1: Create API types**

Create `src/types/api.ts`:

```typescript
// Profile types for API
export interface ProfileSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  lastActive: number;
}

export interface Profile extends ProfileSummary {
  createdAt: number;
}

export interface CreateProfileRequest {
  name: string;
  icon: string;
  color: string;
}

// Sync payload types
export interface FactProgressSync {
  fact: string;
  confidence: string;
  correctCount: number;
  incorrectCount: number;
  lastSeen: number | null;
  lastCorrect: number | null;
  recentAttempts: boolean[];
  preferredStrategy: string | null;
}

export interface GardenItemSync {
  id: string;
  itemId: string;
  type: string;
  positionX: number;
  positionY: number;
  earnedFor: string | null;
  earnedAt: number | null;
}

export interface GardenStatsSync {
  coins: number;
  unlockedThemes: string[];
  currentTheme: string;
}

export interface ProfileData {
  profile: Profile;
  facts: FactProgressSync[];
  gardenItems: GardenItemSync[];
  stats: GardenStatsSync;
}

// Avatar options
export const PROFILE_ICONS = [
  'cat', 'dog', 'bird', 'star', 'heart', 'flower',
  'rocket', 'sun', 'moon', 'fish', 'rabbit', 'bear'
] as const;

export type ProfileIcon = typeof PROFILE_ICONS[number];

export const PROFILE_COLORS = [
  'garden-500', 'garden-600', 'warm-400', 'warm-500',
  'sky-400', 'sky-500', 'purple-400', 'rose-400'
] as const;

export type ProfileColor = typeof PROFILE_COLORS[number];
```

**Step 2: Export from types index**

Modify `src/types/index.ts` to add at end:

```typescript
export * from './api';
```

**Step 3: Commit**

```bash
git add src/types/api.ts src/types/index.ts
git commit -m "feat: add API and profile types"
```

---

## Task 3: API Client

**Files:**
- Create: `src/lib/api.ts`

**Step 1: Create API client**

Create `src/lib/api.ts`:

```typescript
import type {
  ProfileSummary,
  Profile,
  CreateProfileRequest,
  ProfileData,
  FactProgressSync,
  GardenItemSync,
  GardenStatsSync,
} from '../types/api';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}

export const api = {
  // Profiles
  async listProfiles(): Promise<ProfileSummary[]> {
    return request('/profiles');
  },

  async createProfile(data: CreateProfileRequest): Promise<Profile> {
    return request('/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getProfile(id: string): Promise<ProfileData> {
    return request(`/profiles/${id}`);
  },

  async deleteProfile(id: string): Promise<void> {
    await request(`/profiles/${id}`, { method: 'DELETE' });
  },

  // Sync
  async syncProgress(
    profileId: string,
    facts: FactProgressSync[]
  ): Promise<void> {
    await request(`/profiles/${profileId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ facts }),
    });
  },

  async syncGarden(
    profileId: string,
    items: GardenItemSync[],
    stats: GardenStatsSync
  ): Promise<void> {
    await request(`/profiles/${profileId}/garden`, {
      method: 'PUT',
      body: JSON.stringify({ items, stats }),
    });
  },
};

export { ApiError };
```

**Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add API client"
```

---

## Task 4: Profile Store

**Files:**
- Create: `src/stores/profileStore.ts`

**Step 1: Create profile store**

Create `src/stores/profileStore.ts`:

```typescript
import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  Profile,
  ProfileSummary,
  CreateProfileRequest,
  ProfileData,
  FactProgressSync,
  GardenItemSync,
  GardenStatsSync,
} from '../types/api';

interface ProfileState {
  // State
  currentProfile: Profile | null;
  profiles: ProfileSummary[];
  isLoading: boolean;
  error: string | null;

  // Sync state
  pendingProgressSync: FactProgressSync[];
  syncTimeoutId: number | null;

  // Actions
  fetchProfiles: () => Promise<void>;
  selectProfile: (id: string) => Promise<ProfileData>;
  createProfile: (data: CreateProfileRequest) => Promise<Profile>;
  clearProfile: () => void;
  deleteProfile: (id: string) => Promise<void>;

  // Sync actions
  queueProgressSync: (fact: FactProgressSync) => void;
  flushProgressSync: () => Promise<void>;
  syncGarden: (items: GardenItemSync[], stats: GardenStatsSync) => Promise<void>;
}

const SYNC_DEBOUNCE_MS = 2000;

export const useProfileStore = create<ProfileState>((set, get) => ({
  currentProfile: null,
  profiles: [],
  isLoading: false,
  error: null,
  pendingProgressSync: [],
  syncTimeoutId: null,

  fetchProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await api.listProfiles();
      set({ profiles, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch profiles',
        isLoading: false,
      });
    }
  },

  selectProfile: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getProfile(id);
      set({
        currentProfile: data.profile,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load profile',
        isLoading: false,
      });
      throw err;
    }
  },

  createProfile: async (data: CreateProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.createProfile(data);
      set((state) => ({
        profiles: [
          { ...profile, lastActive: profile.createdAt },
          ...state.profiles,
        ],
        currentProfile: profile,
        isLoading: false,
      }));
      return profile;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create profile',
        isLoading: false,
      });
      throw err;
    }
  },

  clearProfile: () => {
    const { syncTimeoutId } = get();
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
    }
    // Flush any pending syncs
    get().flushProgressSync();
    set({
      currentProfile: null,
      pendingProgressSync: [],
      syncTimeoutId: null,
    });
  },

  deleteProfile: async (id: string) => {
    await api.deleteProfile(id);
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
      currentProfile:
        state.currentProfile?.id === id ? null : state.currentProfile,
    }));
  },

  queueProgressSync: (fact: FactProgressSync) => {
    const { syncTimeoutId, currentProfile } = get();
    if (!currentProfile) return;

    // Clear existing timeout
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
    }

    // Add to pending queue (replace if same fact)
    set((state) => ({
      pendingProgressSync: [
        ...state.pendingProgressSync.filter((f) => f.fact !== fact.fact),
        fact,
      ],
    }));

    // Set new debounced sync
    const newTimeoutId = window.setTimeout(() => {
      get().flushProgressSync();
    }, SYNC_DEBOUNCE_MS);

    set({ syncTimeoutId: newTimeoutId });
  },

  flushProgressSync: async () => {
    const { currentProfile, pendingProgressSync } = get();
    if (!currentProfile || pendingProgressSync.length === 0) return;

    const factsToSync = [...pendingProgressSync];
    set({ pendingProgressSync: [], syncTimeoutId: null });

    try {
      await api.syncProgress(currentProfile.id, factsToSync);
    } catch (err) {
      // Re-queue on failure
      console.error('Failed to sync progress:', err);
      set((state) => ({
        pendingProgressSync: [...factsToSync, ...state.pendingProgressSync],
      }));
    }
  },

  syncGarden: async (items: GardenItemSync[], stats: GardenStatsSync) => {
    const { currentProfile } = get();
    if (!currentProfile) return;

    try {
      await api.syncGarden(currentProfile.id, items, stats);
    } catch (err) {
      console.error('Failed to sync garden:', err);
    }
  },
}));
```

**Step 2: Commit**

```bash
git add src/stores/profileStore.ts
git commit -m "feat: add profile store with sync logic"
```

---

## Task 5: Update Progress Store for Sync

**Files:**
- Modify: `src/stores/progressStore.ts`

**Step 1: Read current progressStore**

Read `src/stores/progressStore.ts` to understand current structure.

**Step 2: Add loadFromServer and toSyncPayload methods**

Add these methods to the store interface and implementation:

```typescript
// Add to interface
loadFromServer: (facts: FactProgressSync[]) => void;
toSyncPayload: (fact: string) => FactProgressSync | null;

// Add to implementation
loadFromServer: (facts) => {
  const factMap: Record<string, FactProgress> = {};
  for (const f of facts) {
    factMap[f.fact] = {
      fact: f.fact,
      a: parseInt(f.fact.split('x')[0]),
      b: parseInt(f.fact.split('x')[1]),
      answer: parseInt(f.fact.split('x')[0]) * parseInt(f.fact.split('x')[1]),
      confidence: f.confidence as Confidence,
      correctCount: f.correctCount,
      incorrectCount: f.incorrectCount,
      lastSeen: f.lastSeen ? new Date(f.lastSeen).toISOString() : null,
      lastCorrect: f.lastCorrect ? new Date(f.lastCorrect).toISOString() : null,
      recentAttempts: f.recentAttempts,
      preferredStrategy: f.preferredStrategy,
    };
  }
  // Merge with defaults for any missing facts
  const allFacts = generateAllFacts();
  for (const fact of allFacts) {
    if (!factMap[fact.fact]) {
      factMap[fact.fact] = fact;
    }
  }
  set({ facts: factMap, isInitialized: true });
},

toSyncPayload: (factKey) => {
  const fact = get().facts[factKey];
  if (!fact) return null;
  return {
    fact: fact.fact,
    confidence: fact.confidence,
    correctCount: fact.correctCount,
    incorrectCount: fact.incorrectCount,
    lastSeen: fact.lastSeen ? new Date(fact.lastSeen).getTime() : null,
    lastCorrect: fact.lastCorrect ? new Date(fact.lastCorrect).getTime() : null,
    recentAttempts: fact.recentAttempts,
    preferredStrategy: fact.preferredStrategy,
  };
},
```

**Step 3: Modify recordAttempt to return sync payload**

Update `recordAttempt` to return the sync payload after updating.

**Step 4: Commit**

```bash
git add src/stores/progressStore.ts
git commit -m "feat: add sync methods to progress store"
```

---

## Task 6: Update Garden Store for Sync

**Files:**
- Modify: `src/stores/gardenStore.ts`

**Step 1: Read current gardenStore**

Read `src/stores/gardenStore.ts` to understand current structure.

**Step 2: Add loadFromServer and toSyncPayload methods**

Add these methods to the store:

```typescript
// Add to interface
loadFromServer: (items: GardenItemSync[], stats: GardenStatsSync) => void;
toSyncPayload: () => { items: GardenItemSync[]; stats: GardenStatsSync };

// Add to implementation
loadFromServer: (items, stats) => {
  set({
    items: items.map((item) => ({
      id: item.id,
      type: item.type as GardenItemType,
      itemId: item.itemId,
      position: { x: item.positionX, y: item.positionY },
      earnedFor: item.earnedFor || '',
      earnedAt: item.earnedAt ? new Date(item.earnedAt).toISOString() : '',
    })),
    coins: stats.coins,
    unlockedThemes: stats.unlockedThemes as GardenTheme[],
    currentTheme: stats.currentTheme as GardenTheme,
    isInitialized: true,
  });
},

toSyncPayload: () => {
  const state = get();
  return {
    items: state.items.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      type: item.type,
      positionX: item.position.x,
      positionY: item.position.y,
      earnedFor: item.earnedFor || null,
      earnedAt: item.earnedAt ? new Date(item.earnedAt).getTime() : null,
    })),
    stats: {
      coins: state.coins,
      unlockedThemes: state.unlockedThemes,
      currentTheme: state.currentTheme,
    },
  };
},
```

**Step 3: Commit**

```bash
git add src/stores/gardenStore.ts
git commit -m "feat: add sync methods to garden store"
```

---

## Task 7: ProfileCard Component

**Files:**
- Create: `src/components/common/ProfileCard.tsx`

**Step 1: Create ProfileCard component**

Create `src/components/common/ProfileCard.tsx`:

```typescript
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import type { ProfileSummary, ProfileIcon } from '../../types/api';

interface ProfileCardProps {
  profile: ProfileSummary;
  onClick: () => void;
}

const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
  cat: Icons.Cat,
  dog: Icons.Dog,
  bird: Icons.Bird,
  star: Icons.Star,
  heart: Icons.Heart,
  flower: Icons.Flower2,
  rocket: Icons.Rocket,
  sun: Icons.Sun,
  moon: Icons.Moon,
  fish: Icons.Fish,
  rabbit: Icons.Rabbit,
  bear: Icons.PawPrint,
};

export function ProfileCard({ profile, onClick }: ProfileCardProps) {
  const IconComponent = iconMap[profile.icon as ProfileIcon] || Icons.User;

  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center bg-${profile.color}`}
      >
        <IconComponent className="w-10 h-10 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700 truncate max-w-[80px]">
        {profile.name}
      </span>
    </motion.button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/ProfileCard.tsx
git commit -m "feat: add ProfileCard component"
```

---

## Task 8: ProfileCreator Component

**Files:**
- Create: `src/components/common/ProfileCreator.tsx`

**Step 1: Create ProfileCreator component**

Create `src/components/common/ProfileCreator.tsx`:

```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { PROFILE_ICONS, PROFILE_COLORS, type ProfileIcon, type ProfileColor } from '../../types/api';

interface ProfileCreatorProps {
  onSubmit: (name: string, icon: ProfileIcon, color: ProfileColor) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
  cat: Icons.Cat,
  dog: Icons.Dog,
  bird: Icons.Bird,
  star: Icons.Star,
  heart: Icons.Heart,
  flower: Icons.Flower2,
  rocket: Icons.Rocket,
  sun: Icons.Sun,
  moon: Icons.Moon,
  fish: Icons.Fish,
  rabbit: Icons.Rabbit,
  bear: Icons.PawPrint,
};

export function ProfileCreator({ onSubmit, onCancel, isLoading }: ProfileCreatorProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<ProfileIcon>('star');
  const [color, setColor] = useState<ProfileColor>('garden-500');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), icon, color);
    }
  };

  const IconComponent = iconMap[icon];

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-lg max-w-sm w-full mx-4"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        New Profile
      </h2>

      {/* Preview */}
      <div className="flex justify-center mb-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-${color}`}>
          <IconComponent className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Name Input */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full px-4 py-3 rounded-lg border border-gray-200 mb-4 text-center text-lg"
        maxLength={20}
        autoFocus
      />

      {/* Icon Selection */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2 text-center">Pick an icon</p>
        <div className="grid grid-cols-6 gap-2">
          {PROFILE_ICONS.map((iconKey) => {
            const Icon = iconMap[iconKey];
            return (
              <button
                key={iconKey}
                type="button"
                onClick={() => setIcon(iconKey)}
                className={`p-2 rounded-lg ${
                  icon === iconKey ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <Icon className="w-6 h-6 text-gray-600" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-2 text-center">Pick a color</p>
        <div className="flex justify-center gap-2">
          {PROFILE_COLORS.map((colorKey) => (
            <button
              key={colorKey}
              type="button"
              onClick={() => setColor(colorKey)}
              className={`w-8 h-8 rounded-full bg-${colorKey} ${
                color === colorKey ? 'ring-2 ring-offset-2 ring-gray-400' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="flex-1 py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Start Learning'}
        </button>
      </div>
    </motion.form>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/ProfileCreator.tsx
git commit -m "feat: add ProfileCreator component"
```

---

## Task 9: ProfilePicker Component

**Files:**
- Create: `src/components/common/ProfilePicker.tsx`

**Step 1: Create ProfilePicker component**

Create `src/components/common/ProfilePicker.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useProfileStore } from '../../stores/profileStore';
import { useProgressStore } from '../../stores/progressStore';
import { useGardenStore } from '../../stores/gardenStore';
import { ProfileCard } from './ProfileCard';
import { ProfileCreator } from './ProfileCreator';
import type { ProfileIcon, ProfileColor } from '../../types/api';

const MAX_VISIBLE_PROFILES = 12;

export function ProfilePicker() {
  const [showCreator, setShowCreator] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    selectProfile,
    createProfile,
  } = useProfileStore();

  const loadProgressFromServer = useProgressStore((s) => s.loadFromServer);
  const loadGardenFromServer = useGardenStore((s) => s.loadFromServer);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSelectProfile = async (id: string) => {
    try {
      const data = await selectProfile(id);
      loadProgressFromServer(data.facts);
      loadGardenFromServer(data.gardenItems, data.stats);
    } catch {
      // Error handled in store
    }
  };

  const handleCreateProfile = async (
    name: string,
    icon: ProfileIcon,
    color: ProfileColor
  ) => {
    try {
      await createProfile({ name, icon, color });
      // New profile starts fresh, initialize empty stores
      loadProgressFromServer([]);
      loadGardenFromServer([], {
        coins: 0,
        unlockedThemes: ['flower'],
        currentTheme: 'flower',
      });
    } catch {
      // Error handled in store
    }
  };

  const visibleProfiles = showAll
    ? profiles
    : profiles.slice(0, MAX_VISIBLE_PROFILES);
  const hasMore = profiles.length > MAX_VISIBLE_PROFILES;

  if (isLoading && profiles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-garden-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-garden-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-garden-50 to-white p-4">
      <AnimatePresence mode="wait">
        {showCreator ? (
          <ProfileCreator
            key="creator"
            onSubmit={handleCreateProfile}
            onCancel={() => setShowCreator(false)}
            isLoading={isLoading}
          />
        ) : (
          <motion.div
            key="picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Who's learning?
            </h1>
            <p className="text-gray-500 mb-8">
              Pick your profile to continue
            </p>

            {error && (
              <p className="text-red-500 mb-4 text-sm">{error}</p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {visibleProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onClick={() => handleSelectProfile(profile.id)}
                />
              ))}

              {/* Add New Profile Button */}
              <motion.button
                onClick={() => setShowCreator(true)}
                className="flex flex-col items-center gap-2 p-4"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">Add</span>
              </motion.button>
            </div>

            {hasMore && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-sm text-garden-600 hover:underline"
              >
                Show all ({profiles.length})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/ProfilePicker.tsx
git commit -m "feat: add ProfilePicker component"
```

---

## Task 10: Update App.tsx for Profile Flow

**Files:**
- Modify: `src/App.tsx`

**Step 1: Read current App.tsx**

Read `src/App.tsx` to understand current structure.

**Step 2: Add profile gating**

Wrap the existing app content with profile check:

```typescript
import { ProfilePicker } from './components/common/ProfilePicker';
import { useProfileStore } from './stores/profileStore';

// In component:
const currentProfile = useProfileStore((s) => s.currentProfile);

// In render:
if (!currentProfile) {
  return <ProfilePicker />;
}

// ... existing app content
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add profile gate to App"
```

---

## Task 11: Add Profile Indicator to Navigation

**Files:**
- Modify: `src/components/common/Navigation.tsx`

**Step 1: Read current Navigation.tsx**

Read `src/components/common/Navigation.tsx` to understand structure.

**Step 2: Add profile button to navigation**

Add a small profile indicator that opens the profile switcher:

```typescript
import { useProfileStore } from '../../stores/profileStore';
import * as Icons from 'lucide-react';

// In component:
const { currentProfile, clearProfile } = useProfileStore();

// Add button in nav (e.g., top-right or as a nav item):
<button onClick={clearProfile} className="...">
  <ProfileIcon /> {/* Show current profile icon */}
</button>
```

**Step 3: Commit**

```bash
git add src/components/common/Navigation.tsx
git commit -m "feat: add profile switcher to navigation"
```

---

## Task 12: Wire Up Progress Sync

**Files:**
- Modify: `src/views/PracticeView.tsx`

**Step 1: Read current PracticeView.tsx**

Read `src/views/PracticeView.tsx` to find where recordAttempt is called.

**Step 2: Add sync call after recording attempt**

After each `recordAttempt`, queue the sync:

```typescript
import { useProfileStore } from '../stores/profileStore';

const queueProgressSync = useProfileStore((s) => s.queueProgressSync);
const toSyncPayload = useProgressStore((s) => s.toSyncPayload);

// After recordAttempt:
const syncPayload = toSyncPayload(factKey);
if (syncPayload) {
  queueProgressSync(syncPayload);
}
```

**Step 3: Commit**

```bash
git add src/views/PracticeView.tsx
git commit -m "feat: wire up progress sync in practice"
```

---

## Task 13: Wire Up Garden Sync

**Files:**
- Modify: `src/stores/gardenStore.ts`

**Step 1: Add sync triggers**

After any mutation (addItem, moveItem, removeItem, addCoins, spendCoins, setTheme), trigger sync:

```typescript
// Import at top:
import { useProfileStore } from './profileStore';

// After each mutation, add:
const { items, coins, unlockedThemes, currentTheme } = get();
const syncGarden = useProfileStore.getState().syncGarden;
syncGarden(
  items.map(/* ... */),
  { coins, unlockedThemes, currentTheme }
);
```

**Step 2: Commit**

```bash
git add src/stores/gardenStore.ts
git commit -m "feat: wire up garden sync"
```

---

## Task 14: Cloudflare Worker - List/Create Profiles

**Files:**
- Create: `functions/api/profiles/index.ts`

**Step 1: Create profiles list/create endpoint**

Create `functions/api/profiles/index.ts`:

```typescript
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, name, icon, color, last_active as lastActive
     FROM profiles
     ORDER BY last_active DESC
     LIMIT 20`
  ).all();

  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { name, icon, color } = await request.json<{
    name: string;
    icon: string;
    color: string;
  }>();

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO profiles (id, name, icon, color, created_at, last_active)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, icon, color, now, now).run();

  // Create empty stats row
  await env.DB.prepare(
    `INSERT INTO profile_stats (profile_id) VALUES (?)`
  ).bind(id).run();

  return Response.json({
    id,
    name,
    icon,
    color,
    createdAt: now,
    lastActive: now,
  });
};
```

**Step 2: Commit**

```bash
git add functions/api/profiles/index.ts
git commit -m "feat: add profiles list/create endpoint"
```

---

## Task 15: Cloudflare Worker - Get/Delete Profile

**Files:**
- Create: `functions/api/profiles/[id].ts`

**Step 1: Create profile get/delete endpoint**

Create `functions/api/profiles/[id].ts`:

```typescript
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;

  // Update last_active
  await env.DB.prepare(
    `UPDATE profiles SET last_active = ? WHERE id = ?`
  ).bind(Date.now(), id).run();

  // Get profile
  const profile = await env.DB.prepare(
    `SELECT id, name, icon, color, created_at as createdAt, last_active as lastActive
     FROM profiles WHERE id = ?`
  ).bind(id).first();

  if (!profile) {
    return new Response('Profile not found', { status: 404 });
  }

  // Get facts
  const { results: facts } = await env.DB.prepare(
    `SELECT fact, confidence, correct_count as correctCount,
            incorrect_count as incorrectCount, last_seen as lastSeen,
            last_correct as lastCorrect, recent_attempts as recentAttempts,
            preferred_strategy as preferredStrategy
     FROM fact_progress WHERE profile_id = ?`
  ).bind(id).all();

  // Get garden items
  const { results: gardenItems } = await env.DB.prepare(
    `SELECT id, item_id as itemId, type, position_x as positionX,
            position_y as positionY, earned_for as earnedFor, earned_at as earnedAt
     FROM garden_items WHERE profile_id = ?`
  ).bind(id).all();

  // Get stats
  const stats = await env.DB.prepare(
    `SELECT coins, unlocked_themes as unlockedThemes, current_theme as currentTheme
     FROM profile_stats WHERE profile_id = ?`
  ).bind(id).first() || { coins: 0, unlockedThemes: '["flower"]', currentTheme: 'flower' };

  return Response.json({
    profile,
    facts: facts.map((f: Record<string, unknown>) => ({
      ...f,
      recentAttempts: f.recentAttempts ? JSON.parse(f.recentAttempts as string) : [],
    })),
    gardenItems,
    stats: {
      coins: stats.coins,
      unlockedThemes: JSON.parse(stats.unlockedThemes as string || '["flower"]'),
      currentTheme: stats.currentTheme,
    },
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;

  // CASCADE should handle related tables
  await env.DB.prepare(`DELETE FROM profiles WHERE id = ?`).bind(id).run();

  return new Response(null, { status: 204 });
};
```

**Step 2: Commit**

```bash
git add functions/api/profiles/[id].ts
git commit -m "feat: add profile get/delete endpoint"
```

---

## Task 16: Cloudflare Worker - Sync Progress

**Files:**
- Create: `functions/api/profiles/[id]/progress.ts`

**Step 1: Create progress sync endpoint**

Create `functions/api/profiles/[id]/progress.ts`:

```typescript
interface Env {
  DB: D1Database;
}

interface FactSync {
  fact: string;
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
     (profile_id, fact, confidence, correct_count, incorrect_count,
      last_seen, last_correct, recent_attempts, preferred_strategy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const batch = facts.map((f) =>
    stmt.bind(
      profileId,
      f.fact,
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

**Step 2: Commit**

```bash
git add functions/api/profiles/[id]/progress.ts
git commit -m "feat: add progress sync endpoint"
```

---

## Task 17: Cloudflare Worker - Sync Garden

**Files:**
- Create: `functions/api/profiles/[id]/garden.ts`

**Step 1: Create garden sync endpoint**

Create `functions/api/profiles/[id]/garden.ts`:

```typescript
interface Env {
  DB: D1Database;
}

interface GardenItemSync {
  id: string;
  itemId: string;
  type: string;
  positionX: number;
  positionY: number;
  earnedFor: string | null;
  earnedAt: number | null;
}

interface GardenStatsSync {
  coins: number;
  unlockedThemes: string[];
  currentTheme: string;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const profileId = params.id as string;
  const { items, stats } = await request.json<{
    items: GardenItemSync[];
    stats: GardenStatsSync;
  }>();

  // Delete existing items and re-insert (simpler than upsert for positions)
  await env.DB.prepare(
    `DELETE FROM garden_items WHERE profile_id = ?`
  ).bind(profileId).run();

  if (items.length > 0) {
    const stmt = env.DB.prepare(
      `INSERT INTO garden_items
       (id, profile_id, item_id, type, position_x, position_y, earned_for, earned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const batch = items.map((item) =>
      stmt.bind(
        item.id,
        profileId,
        item.itemId,
        item.type,
        item.positionX,
        item.positionY,
        item.earnedFor,
        item.earnedAt
      )
    );

    await env.DB.batch(batch);
  }

  // Update stats
  await env.DB.prepare(
    `INSERT OR REPLACE INTO profile_stats
     (profile_id, coins, unlocked_themes, current_theme)
     VALUES (?, ?, ?, ?)`
  ).bind(
    profileId,
    stats.coins,
    JSON.stringify(stats.unlockedThemes),
    stats.currentTheme
  ).run();

  return new Response(null, { status: 204 });
};
```

**Step 2: Commit**

```bash
git add functions/api/profiles/[id]/garden.ts
git commit -m "feat: add garden sync endpoint"
```

---

## Task 18: Local Development Setup

**Files:**
- Modify: `package.json`

**Step 1: Add wrangler dev scripts**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev:api": "wrangler pages dev --d1=DB=ttt-db -- bun run dev",
    "db:create": "wrangler d1 create ttt-db",
    "db:migrate": "wrangler d1 execute ttt-db --file=schema.sql",
    "db:migrate:local": "wrangler d1 execute ttt-db --local --file=schema.sql"
  }
}
```

**Step 2: Install wrangler**

```bash
bun add -D wrangler
```

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "feat: add wrangler dev scripts"
```

---

## Task 19: Tailwind Safelist for Dynamic Colors

**Files:**
- Modify: `src/index.css`

**Step 1: Read current index.css**

Read `src/index.css` to find where to add safelist.

**Step 2: Add safelist for profile colors**

Tailwind v4 purges unused classes. Since profile colors are dynamic, add a safelist comment or explicit classes:

```css
/* Profile color classes - keep for dynamic avatar colors */
.bg-garden-500, .bg-garden-600,
.bg-warm-400, .bg-warm-500,
.bg-sky-400, .bg-sky-500,
.bg-purple-400, .bg-rose-400 {
  /* Referenced dynamically by ProfileCard/ProfileCreator */
}
```

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: safelist dynamic profile colors"
```

---

## Task 20: Integration Test

**Step 1: Run local database setup**

```bash
bun run db:migrate:local
```

**Step 2: Start dev server with API**

```bash
bun run dev:api
```

**Step 3: Manual test checklist**

- [ ] App loads and shows profile picker
- [ ] Can create a new profile (name, icon, color)
- [ ] Profile appears in picker after creation
- [ ] Can select profile and enter app
- [ ] Practice mode works, answers are recorded
- [ ] Progress syncs to server (check network tab)
- [ ] Garden items sync when earned
- [ ] Can switch profiles via navigation
- [ ] Reloading preserves profile selection and data

**Step 4: Fix any issues found**

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete backend profiles integration"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | D1 Schema | schema.sql, wrangler.toml |
| 2 | API Types | src/types/api.ts |
| 3 | API Client | src/lib/api.ts |
| 4 | Profile Store | src/stores/profileStore.ts |
| 5 | Update Progress Store | src/stores/progressStore.ts |
| 6 | Update Garden Store | src/stores/gardenStore.ts |
| 7 | ProfileCard | src/components/common/ProfileCard.tsx |
| 8 | ProfileCreator | src/components/common/ProfileCreator.tsx |
| 9 | ProfilePicker | src/components/common/ProfilePicker.tsx |
| 10 | App Profile Gate | src/App.tsx |
| 11 | Nav Profile Button | src/components/common/Navigation.tsx |
| 12 | Practice Sync | src/views/PracticeView.tsx |
| 13 | Garden Sync | src/stores/gardenStore.ts |
| 14 | Worker: List/Create | functions/api/profiles/index.ts |
| 15 | Worker: Get/Delete | functions/api/profiles/[id].ts |
| 16 | Worker: Progress Sync | functions/api/profiles/[id]/progress.ts |
| 17 | Worker: Garden Sync | functions/api/profiles/[id]/garden.ts |
| 18 | Dev Scripts | package.json |
| 19 | Tailwind Safelist | src/index.css |
| 20 | Integration Test | Manual testing |
