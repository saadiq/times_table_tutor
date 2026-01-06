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

interface ProfileState {
  // State
  currentProfile: Profile | null;
  profiles: ProfileListItem[];
  isLoading: boolean;
  error: string | null;

  // Sync state
  pendingProgressSync: FactProgressSync[];
  syncTimeoutId: number | null;

  // Actions
  fetchProfiles: () => Promise<void>;
  selectProfile: (id: string, icon: string) => Promise<ProfileData>;
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

  selectProfile: async (id: string, icon: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.verifyProfile(id, icon);
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
    const { syncTimeoutId, currentProfile, pendingProgressSync } = get();
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
    }

    // Clear state first
    set({
      currentProfile: null,
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
