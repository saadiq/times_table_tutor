import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import { resetStoresForProfileSwitch } from '../lib/resetStores';
import { createProgressSyncSlice, dropPersistedBucket } from '../lib/progressSyncQueue';
import type { ProgressSyncSlice } from '../lib/progressSyncQueue';
import {
  saveSession,
  loadSession,
  clearSavedSession,
  verifyCachedSession,
} from '../lib/profileSession';
import type { CurriculumId } from '../lib/operations';
import type {
  Profile,
  ProfileListItem,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileData,
  GardenItemSync,
  GardenStatsSync,
} from '../types/api';

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
  updateProfile: (changes: UpdateProfileRequest) => Promise<Profile>;
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
      const data = await verifyCachedSession(session);
      // Collapse the cache back to one credential now that the server has said
      // which of the two it accepts.
      saveSession(data.profile.id, data.profile.icon);
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
        // Same generic wording ProfileEditor uses: every other failure here is
        // a validation 400 the picker cannot produce, a 500, or a dead network,
        // and err.message for those is a raw response body — JSON or an HTML
        // error page — which is not something to show a child.
        set({
          error: "Couldn't create that profile. Try again!",
          isLoading: false,
        });
      }
      throw err;
    }
  },

  updateProfile: async (changes: UpdateProfileRequest) => {
    const { currentProfile } = get();
    if (!currentProfile) throw new Error('No profile signed in');

    const updated = await api.updateProfile(currentProfile.id, changes).catch((err) => {
      // No HTTP status means the outcome is unknown: the write may well have
      // committed with only its response lost. Record the icon we tried to set
      // as a fallback credential, so a committed-but-unacknowledged change
      // cannot leave a dead password cached and strand the child at the picker.
      if (!(err instanceof ApiError) && changes.icon !== currentProfile.icon) {
        saveSession(currentProfile.id, currentProfile.icon, changes.icon);
      }
      throw err;
    });

    // A sign-out or profile switch can land while the PATCH is in flight;
    // writing past it would revive the signed-out profile over freshly reset
    // stores, which then sync their empty state upward.
    if (get().currentProfile?.id !== currentProfile.id) return updated;

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
