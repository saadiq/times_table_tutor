import { api, ApiError } from './api';
import type { ProfileData } from '../types/api';

/**
 * The signed-in profile's cached credentials, used to auto-login on next
 * launch. The icon IS the password, so whenever it changes this cache must be
 * rewritten — a stale icon here 401s on the next verify and strands the child
 * at the profile picker.
 */
export const SESSION_KEY = 'ttt_session';

export interface SavedSession {
  profileId: string;
  icon: string;
  /**
   * An icon a write may have committed before its response was lost. Tried only
   * once `icon` has been rejected; see profileStore.updateProfile.
   */
  pendingIcon?: string;
}

export function saveSession(profileId: string, icon: string, pendingIcon?: string): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId, icon, pendingIcon }));
  } catch {
    // localStorage might be unavailable
  }
}

export function loadSession(): SavedSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    return JSON.parse(data) as SavedSession;
  } catch {
    return null;
  }
}

export function clearSavedSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Redeem the cached credential, falling back to the icon a write may have
 * committed before its response was lost (see profileStore.updateProfile).
 * Without the fallback that write leaves a dead password cached, and the child
 * is dropped at the picker holding the one icon they were just told was wrong.
 */
export async function verifyCachedSession(session: SavedSession): Promise<ProfileData> {
  try {
    return await api.verifyProfile(session.profileId, session.icon);
  } catch (err) {
    if (!session.pendingIcon || !(err instanceof ApiError) || err.status !== 401) throw err;
    return api.verifyProfile(session.profileId, session.pendingIcon);
  }
}
