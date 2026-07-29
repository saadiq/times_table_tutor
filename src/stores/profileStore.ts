import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import { resetStoresForProfileSwitch } from '../lib/resetStores';
import { createProgressSyncSlice, dropPersistedBucket } from '../lib/progressSyncQueue';
import type { ProgressSyncSlice } from '../lib/progressSyncQueue';
import type { CurriculumId } from '../lib/operations';
import type {
  Profile,
  ProfileListItem,
  CreateProfileRequest,
  ProfileData,
  GardenItemSync,
  GardenStatsSync,
} from '../types/api';

// localStorage keys for session persistence
const SESSION_KEY = 'ttt_session';

interface SavedSession {
  profileId: string;
  icon: string;
}

interface ProfileState extends ProgressSyncSlice {
  // State
  currentProfile: Profile | null;
  profiles: ProfileListItem[];
  isLoading: boolean;
  error: string | null;

  // Verification flow state
  verifyingProfileId: string | null;
  verifyError: string | null;

  // Actions
  fetchProfiles: () => Promise<void>;
  createProfile: (data: CreateProfileRequest) => Promise<Profile>;
  clearProfile: () => void;
  deleteProfile: (id: string) => Promise<void>;

  // Verification flow actions
  startVerification: (id: string) => void;
  verifyAndSelect: (id: string, icon: string) => Promise<ProfileData>;
  cancelVerification: () => void;
  restoreSession: () => Promise<ProfileData | null>;
  clearSession: () => void;

  // Sync actions (queueProgressSync/flushProgressSync/restorePendingSync come
  // from ProgressSyncSlice)
  syncGarden: (items: GardenItemSync[], stats: GardenStatsSync) => Promise<void>;
  syncSessions: (curriculum: CurriculumId, count: number) => void;
}

// Helper functions for session persistence
function saveSession(profileId: string, icon: string): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId, icon }));
  } catch {
    // localStorage might be unavailable
  }
}

function loadSession(): SavedSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    return JSON.parse(data) as SavedSession;
  } catch {
    return null;
  }
}

function clearSavedSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // localStorage might be unavailable
  }
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...createProgressSyncSlice(set, get),

  currentProfile: null,
  profiles: [],
  isLoading: false,
  error: null,
  verifyingProfileId: null,
  verifyError: null,

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
    set({
      verifyingProfileId: id,
      verifyError: null,
    });
  },

  verifyAndSelect: async (id: string, icon: string) => {
    set({ isLoading: true, verifyError: null });
    try {
      // Land any recovered queue first: the caller overwrites local state with
      // this read, so a replay resolving after it would look like a rollback.
      await get().restorePendingSync();
      const data = await api.verifyProfile(id, icon);
      // Save session to localStorage for auto-login
      saveSession(id, icon);
      set({
        currentProfile: data.profile,
        isLoading: false,
        verifyingProfileId: null,
        verifyError: null,
      });
      return data;
    } catch (err) {
      // Handle 401 = wrong icon
      if (err instanceof ApiError && err.status === 401) {
        set({
          verifyError: 'Try again!',
          isLoading: false,
        });
      } else {
        set({
          verifyError: err instanceof Error ? err.message : 'Verification failed',
          isLoading: false,
        });
      }
      throw err;
    }
  },

  cancelVerification: () => {
    set({
      verifyingProfileId: null,
      verifyError: null,
    });
  },

  restoreSession: async () => {
    const session = loadSession();
    if (!session) return null;

    set({ isLoading: true, error: null });
    try {
      // Same ordering rule as verifyAndSelect: replay before the server read
      await get().restorePendingSync();
      const data = await api.verifyProfile(session.profileId, session.icon);
      set({
        currentProfile: data.profile,
        isLoading: false,
      });
      return data;
    } catch {
      // Session invalid, clear it
      clearSavedSession();
      set({ isLoading: false });
      return null;
    }
  },

  clearSession: () => {
    clearSavedSession();
  },

  createProfile: async (data: CreateProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.createProfile(data);
      // Save session for the new profile
      saveSession(profile.id, data.icon);
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
      // Handle 409 = name already taken
      if (err instanceof ApiError && err.status === 409) {
        set({
          error: 'That name is already taken!',
          isLoading: false,
        });
      } else {
        set({
          error: err instanceof Error ? err.message : 'Failed to create profile',
          isLoading: false,
        });
      }
      throw err;
    }
  },

  clearProfile: () => {
    // Fire-and-forget: the flush captures the profile and queue synchronously
    // before the reset below, and on failure its profile-switch guard leaves
    // the persisted copy on disk for next-launch recovery.
    get().flushProgressSync();

    // Clear session from localStorage
    clearSavedSession();

    // Reset other stores to prevent data leaking between accounts
    resetStoresForProfileSwitch();

    // Clear state
    set({
      currentProfile: null,
      pendingProgressSync: [],
      syncTimeoutId: null,
      verifyingProfileId: null,
      verifyError: null,
    });
  },

  deleteProfile: async (id: string) => {
    await api.deleteProfile(id);
    // Drain every trace of the deleted profile's sync state: its persisted
    // bucket can never be delivered again, and a queue left in memory would
    // flush to whichever child signs in next.
    dropPersistedBucket(id);
    if (get().currentProfile?.id === id) {
      const { syncTimeoutId } = get();
      if (syncTimeoutId) clearTimeout(syncTimeoutId);
      set({ pendingProgressSync: [], syncTimeoutId: null });
    }
    // If we're deleting the current profile's session, clear it
    const session = loadSession();
    if (session?.profileId === id) {
      clearSavedSession();
    }
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
      currentProfile:
        state.currentProfile?.id === id ? null : state.currentProfile,
    }));
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

  // Fire-and-forget: the server MAX-merges, and the local count is the source
  // of truth until the next verify, so a dropped push costs nothing but a lag.
  syncSessions: (curriculum: CurriculumId, count: number) => {
    const { currentProfile } = get();
    if (!currentProfile) return;

    api.syncSessions(currentProfile.id, curriculum, count).catch((err) => {
      console.error('Failed to sync sessions:', err);
    });
  },
}));
