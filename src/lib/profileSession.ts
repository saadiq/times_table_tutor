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
}

export function saveSession(profileId: string, icon: string): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId, icon }));
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
