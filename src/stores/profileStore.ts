import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import type {
  Profile,
  ProfileListItem,
  CreateProfileRequest,
  ProfileData,
  FactProgressSync,
  GardenItemSync,
  GardenStatsSync,
} from '../types/api';

// localStorage keys for session persistence
const SESSION_KEY = 'ttt_session';

interface SavedSession {
  profileId: string;
  icon: string;
}

interface ProfileState {
  // State
  currentProfile: Profile | null;
  profiles: ProfileListItem[];
  isLoading: boolean;
  error: string | null;

  // Verification flow state
  verifyingProfileId: string | null;
  verifyError: string | null;

  // Sync state
  pendingProgressSync: FactProgressSync[];
  syncTimeoutId: number | null;

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

  // Sync actions
  queueProgressSync: (fact: FactProgressSync) => void;
  flushProgressSync: () => Promise<void>;
  syncGarden: (items: GardenItemSync[], stats: GardenStatsSync) => Promise<void>;
}

const SYNC_DEBOUNCE_MS = 2000;

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
    set({
      verifyingProfileId: id,
      verifyError: null,
    });
  },

  verifyAndSelect: async (id: string, icon: string) => {
    set({ isLoading: true, verifyError: null });
    try {
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
    const { syncTimeoutId, currentProfile, pendingProgressSync } = get();
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
    }

    // Clear session from localStorage
    clearSavedSession();

    // Clear state
    set({
      currentProfile: null,
      pendingProgressSync: [],
      syncTimeoutId: null,
      verifyingProfileId: null,
      verifyError: null,
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
