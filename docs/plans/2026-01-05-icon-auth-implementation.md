# Icon Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add kid-friendly icon-based authentication where each profile's icon serves as a simple password.

**Architecture:** Expand icon set to 20, hide icons from profile list API, add verification endpoint, update frontend to require icon selection before accessing a profile.

**Tech Stack:** Cloudflare D1 (SQLite), Cloudflare Pages Functions, React 19, Zustand, TypeScript

---

## Task 1: Expand Icon Set to 20

**Files:**
- Modify: `src/types/api.ts:56-61`

**Step 1: Update PROFILE_ICONS constant**

Replace the current 12 icons with 20 visually distinct icons:

```typescript
// Avatar options - 20 visually distinct icons
export const PROFILE_ICONS = [
  // Animals (7)
  'cat', 'dog', 'rabbit', 'fish', 'owl', 'turtle', 'butterfly',
  // Nature (4)
  'sun', 'moon', 'flower', 'tree',
  // Objects (5)
  'rocket', 'star', 'heart', 'crown', 'diamond',
  // Fun (4)
  'rainbow', 'cloud', 'lightning', 'snowflake'
] as const;
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds (types updated)

**Step 3: Commit**

```bash
git add src/types/api.ts
git commit -m "feat: expand icon set to 20 distinct icons"
```

---

## Task 2: Update Icon Map in Components

**Files:**
- Modify: `src/components/common/ProfileCard.tsx:10-23`
- Modify: `src/components/common/ProfileCreator.tsx:12-25`

**Step 1: Update iconMap in ProfileCard.tsx**

Replace the iconMap with expanded version:

```typescript
const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
  // Animals
  cat: Icons.Cat,
  dog: Icons.Dog,
  rabbit: Icons.Rabbit,
  fish: Icons.Fish,
  owl: Icons.Bird, // Lucide doesn't have owl, use bird
  turtle: Icons.Turtle,
  butterfly: Icons.Bug, // Lucide doesn't have butterfly, use bug
  // Nature
  sun: Icons.Sun,
  moon: Icons.Moon,
  flower: Icons.Flower2,
  tree: Icons.TreeDeciduous,
  // Objects
  rocket: Icons.Rocket,
  star: Icons.Star,
  heart: Icons.Heart,
  crown: Icons.Crown,
  diamond: Icons.Diamond,
  // Fun
  rainbow: Icons.Rainbow,
  cloud: Icons.Cloud,
  lightning: Icons.Zap,
  snowflake: Icons.Snowflake,
};
```

**Step 2: Update iconMap in ProfileCreator.tsx**

Same iconMap as above.

**Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/common/ProfileCard.tsx src/components/common/ProfileCreator.tsx
git commit -m "feat: update icon maps for 20 icons"
```

---

## Task 3: Add Database Migration for Unique Names

**Files:**
- Create: `migrations/0002_unique_names.sql`

**Step 1: Create migration file**

```sql
-- Add unique constraint on profile names (case-insensitive)
-- SQLite doesn't support COLLATE NOCASE on unique index directly,
-- so we create a generated column for case-insensitive comparison
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_name_unique
  ON profiles(name COLLATE NOCASE);
```

**Step 2: Run migration locally**

Run: `bun run db:migrate:local`
Expected: Migration succeeds

**Step 3: Commit**

```bash
git add migrations/0002_unique_names.sql
git commit -m "feat: add unique constraint on profile names"
```

---

## Task 4: Update API - Hide Icon from Profile List

**Files:**
- Modify: `functions/api/profiles/index.ts:5-12`

**Step 1: Remove icon from SELECT query**

Update the GET handler to not return icons:

```typescript
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, name, color, last_active as lastActive
     FROM profiles
     ORDER BY last_active DESC
     LIMIT 20`
  ).all();
  return Response.json(results);
};
```

**Step 2: Verify API still works**

Run: `bun run dev` (terminal 1), `bun run dev:api` (terminal 2)
Test: `curl http://localhost:8788/api/profiles`
Expected: Response has id, name, color, lastActive but NO icon

**Step 3: Commit**

```bash
git add functions/api/profiles/index.ts
git commit -m "feat: hide icon from profile list endpoint"
```

---

## Task 5: Update API - Add Name Uniqueness Check

**Files:**
- Modify: `functions/api/profiles/index.ts:15-33`

**Step 1: Add uniqueness check to POST handler**

```typescript
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { name, icon, color } = await request.json<{
    name: string;
    icon: string;
    color: string;
  }>();

  // Check for existing name (case-insensitive)
  const existing = await env.DB.prepare(
    `SELECT id FROM profiles WHERE name = ? COLLATE NOCASE`
  ).bind(name).first();

  if (existing) {
    return new Response(
      JSON.stringify({ error: 'Name already taken' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO profiles (id, name, icon, color, created_at, last_active)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, icon, color, now, now).run();
  await env.DB.prepare(
    `INSERT INTO profile_stats (profile_id) VALUES (?)`
  ).bind(id).run();
  return Response.json({
    id, name, icon, color, createdAt: now, lastActive: now,
  });
};
```

**Step 2: Test uniqueness check**

Run dev servers, then:
```bash
curl -X POST http://localhost:8788/api/profiles -H "Content-Type: application/json" -d '{"name":"Test","icon":"star","color":"garden-500"}'
# Second call with same name should fail
curl -X POST http://localhost:8788/api/profiles -H "Content-Type: application/json" -d '{"name":"test","icon":"rocket","color":"sky-400"}'
```
Expected: First succeeds, second returns 409 with "Name already taken"

**Step 3: Commit**

```bash
git add functions/api/profiles/index.ts
git commit -m "feat: enforce unique profile names"
```

---

## Task 6: Create Verify Endpoint

**Files:**
- Create: `functions/api/profiles/[id]/verify.ts`

**Step 1: Create the verify endpoint**

```typescript
interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id as string;
  const { icon } = await request.json<{ icon: string }>();

  // Get profile and check icon
  const profile = await env.DB.prepare(
    `SELECT id, name, icon, color, created_at as createdAt, last_active as lastActive
     FROM profiles WHERE id = ?`
  ).bind(id).first();

  if (!profile) {
    return new Response('Profile not found', { status: 404 });
  }

  if (profile.icon !== icon) {
    return new Response(
      JSON.stringify({ error: 'Incorrect icon' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Icon correct - update last_active and return full profile data
  await env.DB.prepare(
    `UPDATE profiles SET last_active = ? WHERE id = ?`
  ).bind(Date.now(), id).run();

  // Fetch associated data
  const { results: facts } = await env.DB.prepare(
    `SELECT fact, confidence, correct_count as correctCount, incorrect_count as incorrectCount,
     last_seen as lastSeen, last_correct as lastCorrect, recent_attempts as recentAttempts,
     preferred_strategy as preferredStrategy FROM fact_progress WHERE profile_id = ?`
  ).bind(id).all();

  const { results: gardenItems } = await env.DB.prepare(
    `SELECT id, item_id as itemId, type, position_x as positionX, position_y as positionY,
     earned_for as earnedFor, earned_at as earnedAt FROM garden_items WHERE profile_id = ?`
  ).bind(id).all();

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
```

**Step 2: Test verify endpoint**

```bash
# Get a profile ID first
curl http://localhost:8788/api/profiles
# Then test verify with correct icon
curl -X POST http://localhost:8788/api/profiles/{id}/verify -H "Content-Type: application/json" -d '{"icon":"star"}'
# Test with wrong icon
curl -X POST http://localhost:8788/api/profiles/{id}/verify -H "Content-Type: application/json" -d '{"icon":"rocket"}'
```
Expected: Correct icon returns full profile data, wrong icon returns 401

**Step 3: Commit**

```bash
git add functions/api/profiles/[id]/verify.ts
git commit -m "feat: add profile verification endpoint"
```

---

## Task 7: Protect Direct Profile Fetch

**Files:**
- Modify: `functions/api/profiles/[id].ts:5-37`

**Step 1: Remove GET handler (or return error)**

Replace the GET handler to require verification:

```typescript
export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({ error: 'Use POST /api/profiles/{id}/verify to access profile' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
};
```

**Step 2: Test direct fetch is blocked**

Run: `curl http://localhost:8788/api/profiles/{id}`
Expected: 403 with error message

**Step 3: Commit**

```bash
git add functions/api/profiles/[id].ts
git commit -m "feat: protect direct profile fetch, require verification"
```

---

## Task 8: Update API Client

**Files:**
- Modify: `src/lib/api.ts:47-66`

**Step 1: Update ProfileSummary type import and add verify method**

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

// ... (keep API_BASE, ApiError, request function)

export const api = {
  // Profiles
  async listProfiles(): Promise<Omit<ProfileSummary, 'icon'>[]> {
    return request('/profiles');
  },

  async createProfile(data: CreateProfileRequest): Promise<Profile> {
    return request('/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verifyProfile(id: string, icon: string): Promise<ProfileData> {
    return request(`/profiles/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ icon }),
    });
  },

  async deleteProfile(id: string): Promise<void> {
    await request(`/profiles/${id}`, { method: 'DELETE' });
  },

  // ... rest of sync methods unchanged
};
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: update API client with verify method"
```

---

## Task 9: Update Types for Icon-less Profile List

**Files:**
- Modify: `src/types/api.ts:2-8`

**Step 1: Create ProfileListItem type without icon**

```typescript
// Profile types for API

// Profile list item (no icon - that's the password)
export interface ProfileListItem {
  id: string;
  name: string;
  color: string;
  lastActive: number;
}

// Full profile summary (includes icon)
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
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/types/api.ts
git commit -m "feat: add ProfileListItem type without icon"
```

---

## Task 10: Update Profile Store

**Files:**
- Modify: `src/stores/profileStore.ts`

**Step 1: Update store with verification flow**

```typescript
import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  Profile,
  ProfileListItem,
  CreateProfileRequest,
  ProfileData,
  FactProgressSync,
  GardenItemSync,
  GardenStatsSync,
} from '../types/api';

const STORAGE_KEY_PROFILE_ID = 'ttt_current_profile_id';
const STORAGE_KEY_PROFILE_ICON = 'ttt_current_profile_icon';

interface ProfileState {
  // State
  currentProfile: Profile | null;
  profiles: ProfileListItem[];
  isLoading: boolean;
  error: string | null;
  verifyingProfileId: string | null;
  verifyError: string | null;

  // Sync state
  pendingProgressSync: FactProgressSync[];
  syncTimeoutId: number | null;

  // Actions
  fetchProfiles: () => Promise<void>;
  startVerification: (id: string) => void;
  verifyAndSelect: (id: string, icon: string) => Promise<ProfileData>;
  cancelVerification: () => void;
  createProfile: (data: CreateProfileRequest) => Promise<Profile>;
  clearProfile: () => void;
  deleteProfile: (id: string) => Promise<void>;
  restoreSession: () => { profileId: string; icon: string } | null;
  clearSession: () => void;

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
  verifyingProfileId: null,
  verifyError: null,
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

  startVerification: (id: string) => {
    set({ verifyingProfileId: id, verifyError: null });
  },

  verifyAndSelect: async (id: string, icon: string) => {
    set({ isLoading: true, verifyError: null });
    try {
      const data = await api.verifyProfile(id, icon);
      // Save session
      localStorage.setItem(STORAGE_KEY_PROFILE_ID, id);
      localStorage.setItem(STORAGE_KEY_PROFILE_ICON, icon);
      set({
        currentProfile: data.profile,
        verifyingProfileId: null,
        isLoading: false,
      });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      const isWrongIcon = message.includes('401') || message.includes('Incorrect');
      set({
        verifyError: isWrongIcon ? 'Try again!' : message,
        isLoading: false,
      });
      throw err;
    }
  },

  cancelVerification: () => {
    set({ verifyingProfileId: null, verifyError: null });
  },

  createProfile: async (data: CreateProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.createProfile(data);
      // Save session
      localStorage.setItem(STORAGE_KEY_PROFILE_ID, profile.id);
      localStorage.setItem(STORAGE_KEY_PROFILE_ICON, data.icon);
      set((state) => ({
        profiles: [
          { id: profile.id, name: profile.name, color: profile.color, lastActive: profile.createdAt },
          ...state.profiles,
        ],
        currentProfile: profile,
        isLoading: false,
      }));
      return profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create profile';
      set({
        error: message.includes('409') ? 'That name is already taken!' : message,
        isLoading: false,
      });
      throw err;
    }
  },

  clearProfile: () => {
    const { syncTimeoutId, currentProfile, pendingProgressSync } = get();
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
    }

    // Clear local storage session
    localStorage.removeItem(STORAGE_KEY_PROFILE_ID);
    localStorage.removeItem(STORAGE_KEY_PROFILE_ICON);

    set({
      currentProfile: null,
      verifyingProfileId: null,
      verifyError: null,
      pendingProgressSync: [],
      syncTimeoutId: null,
    });

    // Fire-and-forget sync with captured state
    if (currentProfile && pendingProgressSync.length > 0) {
      api.syncProgress(currentProfile.id, pendingProgressSync).catch((err) => {
        console.error('Failed to sync progress on profile clear:', err);
      });
    }
  },

  deleteProfile: async (id: string) => {
    await api.deleteProfile(id);
    const { currentProfile } = get();
    if (currentProfile?.id === id) {
      localStorage.removeItem(STORAGE_KEY_PROFILE_ID);
      localStorage.removeItem(STORAGE_KEY_PROFILE_ICON);
    }
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
      currentProfile: state.currentProfile?.id === id ? null : state.currentProfile,
    }));
  },

  restoreSession: () => {
    const profileId = localStorage.getItem(STORAGE_KEY_PROFILE_ID);
    const icon = localStorage.getItem(STORAGE_KEY_PROFILE_ICON);
    if (profileId && icon) {
      return { profileId, icon };
    }
    return null;
  },

  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY_PROFILE_ID);
    localStorage.removeItem(STORAGE_KEY_PROFILE_ICON);
  },

  queueProgressSync: (fact: FactProgressSync) => {
    const { syncTimeoutId, currentProfile } = get();
    if (!currentProfile) return;

    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
    }

    set((state) => ({
      pendingProgressSync: [
        ...state.pendingProgressSync.filter((f) => f.fact !== fact.fact),
        fact,
      ],
    }));

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

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/stores/profileStore.ts
git commit -m "feat: update profile store with verification flow"
```

---

## Task 11: Create IconPicker Component

**Files:**
- Create: `src/components/common/IconPicker.tsx`

**Step 1: Create reusable icon picker grid**

```typescript
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { PROFILE_ICONS, type ProfileIcon } from '../../types/api';

interface IconPickerProps {
  selected?: ProfileIcon;
  onSelect: (icon: ProfileIcon) => void;
  showLabels?: boolean;
}

const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
  // Animals
  cat: Icons.Cat,
  dog: Icons.Dog,
  rabbit: Icons.Rabbit,
  fish: Icons.Fish,
  owl: Icons.Bird,
  turtle: Icons.Turtle,
  butterfly: Icons.Bug,
  // Nature
  sun: Icons.Sun,
  moon: Icons.Moon,
  flower: Icons.Flower2,
  tree: Icons.TreeDeciduous,
  // Objects
  rocket: Icons.Rocket,
  star: Icons.Star,
  heart: Icons.Heart,
  crown: Icons.Crown,
  diamond: Icons.Diamond,
  // Fun
  rainbow: Icons.Rainbow,
  cloud: Icons.Cloud,
  lightning: Icons.Zap,
  snowflake: Icons.Snowflake,
};

export { iconMap };

export function IconPicker({ selected, onSelect, showLabels = false }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {PROFILE_ICONS.map((iconKey) => {
        const Icon = iconMap[iconKey];
        const isSelected = selected === iconKey;
        return (
          <motion.button
            key={iconKey}
            type="button"
            onClick={() => onSelect(iconKey)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
              isSelected
                ? 'bg-garden-100 ring-2 ring-garden-500'
                : 'hover:bg-gray-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className={`w-8 h-8 ${isSelected ? 'text-garden-600' : 'text-gray-600'}`} />
            {showLabels && (
              <span className="text-xs text-gray-500 capitalize">{iconKey}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/common/IconPicker.tsx
git commit -m "feat: add IconPicker component"
```

---

## Task 12: Create IconVerify Component

**Files:**
- Create: `src/components/common/IconVerify.tsx`

**Step 1: Create icon verification screen**

```typescript
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { IconPicker } from './IconPicker';
import type { ProfileIcon, ProfileListItem } from '../../types/api';

interface IconVerifyProps {
  profile: ProfileListItem;
  onVerify: (icon: ProfileIcon) => void;
  onCancel: () => void;
  error: string | null;
  isLoading: boolean;
}

export function IconVerify({ profile, onVerify, onCancel, error, isLoading }: IconVerifyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-6 shadow-lg max-w-md w-full mx-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          disabled={isLoading}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Hi {profile.name}!
          </h2>
          <p className="text-gray-500 text-sm">Pick your icon to log in</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-red-500 text-center mb-4 font-medium"
        >
          {error}
        </motion.p>
      )}

      {/* Icon grid */}
      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        <IconPicker onSelect={onVerify} />
      </div>

      {/* Back link */}
      <button
        onClick={onCancel}
        className="mt-6 w-full text-center text-sm text-gray-500 hover:text-gray-700"
        disabled={isLoading}
      >
        Not {profile.name}? Go back
      </button>
    </motion.div>
  );
}
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/common/IconVerify.tsx
git commit -m "feat: add IconVerify component"
```

---

## Task 13: Update ProfileCard to Hide Icon

**Files:**
- Modify: `src/components/common/ProfileCard.tsx`

**Step 1: Update ProfileCard to not show icon**

```typescript
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { ProfileListItem } from '../../types/api';

interface ProfileCardProps {
  profile: ProfileListItem;
  onClick: () => void;
}

export function ProfileCard({ profile, onClick }: ProfileCardProps) {
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
        <User className="w-10 h-10 text-white opacity-50" />
      </div>
      <span className="text-sm font-medium text-gray-700 truncate max-w-[80px]">
        {profile.name}
      </span>
    </motion.button>
  );
}
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/common/ProfileCard.tsx
git commit -m "feat: hide icon from ProfileCard"
```

---

## Task 14: Update ProfileCreator with Multi-Step Flow

**Files:**
- Modify: `src/components/common/ProfileCreator.tsx`

**Step 1: Update ProfileCreator with steps and uniqueness check**

```typescript
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { IconPicker, iconMap } from './IconPicker';
import { PROFILE_COLORS, type ProfileIcon, type ProfileColor } from '../../types/api';

interface ProfileCreatorProps {
  onSubmit: (name: string, icon: ProfileIcon, color: ProfileColor) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

type Step = 'name' | 'icon' | 'color';

export function ProfileCreator({ onSubmit, onCancel, isLoading, error }: ProfileCreatorProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<ProfileIcon | null>(null);
  const [color, setColor] = useState<ProfileColor>('garden-500');

  const handleNext = () => {
    if (step === 'name' && name.trim()) {
      setStep('icon');
    } else if (step === 'icon' && icon) {
      setStep('color');
    }
  };

  const handleBack = () => {
    if (step === 'icon') setStep('name');
    else if (step === 'color') setStep('icon');
    else onCancel();
  };

  const handleSubmit = () => {
    if (name.trim() && icon) {
      onSubmit(name.trim(), icon, color);
    }
  };

  const IconComponent = icon ? iconMap[icon] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-lg max-w-md w-full mx-4"
    >
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          disabled={isLoading}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">New Profile</h2>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {(['name', 'icon', 'color'] as Step[]).map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full ${
              s === step ? 'bg-garden-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Name */}
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-gray-600 text-center mb-4">What's your name?</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 mb-4 text-center text-lg"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
            {error && (
              <p className="text-red-500 text-center text-sm mb-4">{error}</p>
            )}
            <button
              onClick={handleNext}
              disabled={!name.trim()}
              className="w-full py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Icon */}
        {step === 'icon' && (
          <motion.div
            key="icon"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-gray-600 text-center mb-2">Pick your secret icon</p>
            <p className="text-gray-400 text-sm text-center mb-4">
              This is how you'll log in - remember it!
            </p>
            <IconPicker selected={icon ?? undefined} onSelect={setIcon} />
            <button
              onClick={handleNext}
              disabled={!icon}
              className="w-full mt-6 py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 3: Color */}
        {step === 'color' && (
          <motion.div
            key="color"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-gray-600 text-center mb-4">Pick your color</p>

            {/* Preview */}
            <div className="flex justify-center mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-${color}`}>
                {IconComponent && <IconComponent className="w-12 h-12 text-white" />}
              </div>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              {PROFILE_COLORS.map((colorKey) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setColor(colorKey)}
                  className={`w-10 h-10 rounded-full bg-${colorKey} ${
                    color === colorKey ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-garden-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Creating...' : (
                <>Start Learning <Check className="w-4 h-4" /></>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/common/ProfileCreator.tsx
git commit -m "feat: update ProfileCreator with multi-step flow"
```

---

## Task 15: Update ProfilePicker with Verification Flow

**Files:**
- Modify: `src/components/common/ProfilePicker.tsx`

**Step 1: Update ProfilePicker to use verification**

```typescript
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useProfileStore } from '../../stores/profileStore';
import { useProgressStore } from '../../stores/progressStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useProgressViewStore } from '../../stores/progressViewStore';
import { ProfileCard } from './ProfileCard';
import { ProfileCreator } from './ProfileCreator';
import { IconVerify } from './IconVerify';
import type { ProfileIcon, ProfileColor, ProfileListItem } from '../../types/api';

const MAX_VISIBLE_PROFILES = 12;

export function ProfilePicker() {
  const [showCreator, setShowCreator] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const {
    profiles,
    isLoading,
    error,
    verifyingProfileId,
    verifyError,
    fetchProfiles,
    startVerification,
    verifyAndSelect,
    cancelVerification,
    createProfile,
    restoreSession,
  } = useProfileStore();

  const loadProgressFromServer = useProgressStore((s) => s.loadFromServer);
  const loadGardenFromServer = useGardenStore((s) => s.loadFromServer);
  const resyncProgressView = useProgressViewStore((s) => s.resync);

  // Try to restore session on mount
  useEffect(() => {
    const session = restoreSession();
    if (session) {
      // Auto-login with saved session
      handleVerify(session.profileId, session.icon as ProfileIcon);
    } else {
      fetchProfiles();
    }
  }, []);

  const handleSelectProfile = (id: string) => {
    startVerification(id);
  };

  const handleVerify = async (id: string, icon: ProfileIcon) => {
    try {
      const data = await verifyAndSelect(id, icon);
      loadProgressFromServer(data.facts);
      loadGardenFromServer(data.gardenItems, data.stats);
      resyncProgressView();
    } catch {
      // Error handled in store - if auto-restore fails, fetch profiles
      const session = restoreSession();
      if (session && profiles.length === 0) {
        fetchProfiles();
      }
    }
  };

  const handleCreateProfile = async (
    name: string,
    icon: ProfileIcon,
    color: ProfileColor
  ) => {
    try {
      await createProfile({ name, icon, color });
      loadProgressFromServer([]);
      loadGardenFromServer([], {
        coins: 0,
        unlockedThemes: ['flower'],
        currentTheme: 'flower',
      });
      resyncProgressView();
    } catch {
      // Error handled in store
    }
  };

  const verifyingProfile = profiles.find((p) => p.id === verifyingProfileId);
  const visibleProfiles = showAll
    ? profiles
    : profiles.slice(0, MAX_VISIBLE_PROFILES);
  const hasMore = profiles.length > MAX_VISIBLE_PROFILES;

  if (isLoading && profiles.length === 0 && !verifyingProfileId) {
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
            error={error}
          />
        ) : verifyingProfile ? (
          <IconVerify
            key="verify"
            profile={verifyingProfile}
            onVerify={(icon) => handleVerify(verifyingProfile.id, icon)}
            onCancel={cancelVerification}
            error={verifyError}
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

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/common/ProfilePicker.tsx
git commit -m "feat: update ProfilePicker with verification flow"
```

---

## Task 16: Update Header with Profile Icon

**Files:**
- Modify: `src/components/common/Navigation.tsx` (or wherever header lives)

Need to find the header component first to add the profile icon display and switch profile option.

**Step 1: Find and update the navigation/header component**

Search for Navigation or header component and add:
- Display current profile icon in header
- Add dropdown with "Switch Profile" option

**Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/common/Navigation.tsx
git commit -m "feat: add profile icon to header with switch option"
```

---

## Task 17: Final Integration Test

**Step 1: Start dev servers**

Terminal 1: `bun run dev`
Terminal 2: `bun run dev:api`

**Step 2: Test full flow**

1. Open http://localhost:5173
2. Create a new profile - verify 3-step flow works
3. Verify icon is shown in header
4. Click "Switch Profile" - verify you return to profile list
5. Click your profile name - verify icon grid appears
6. Pick wrong icon - verify "Try again!" message
7. Pick correct icon - verify login succeeds
8. Close browser, reopen - verify auto-login works
9. Try creating profile with same name - verify "Name taken" error

**Step 3: Run build and lint**

```bash
bun run build && bun run lint
```
Expected: Both pass

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete icon authentication implementation"
```

---

## Summary

This implementation adds kid-friendly icon authentication:

1. **20 distinct icons** - expanded from 12, visually distinct at small sizes
2. **Hidden icons in profile list** - API no longer returns icons
3. **Verification endpoint** - POST /profiles/{id}/verify with icon
4. **Unique names** - case-insensitive uniqueness enforced
5. **Multi-step profile creation** - name → icon → color flow
6. **Session persistence** - auto-login on return visits
7. **Header profile display** - icon visible, switch profile option

Total: 17 tasks, approximately 45-60 minutes of implementation time.
