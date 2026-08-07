import type {
  ProfileListItem,
  Profile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileData,
  FactProgressSync,
  GardenItemSync,
  GardenStatsSync,
} from '../types/api';
import type { CurriculumId } from './operations';

const API_BASE = '/api';

const KEEPALIVE_MAX_BODY = 60000;

/**
 * Whether a body may ride on a keepalive request. Browsers cap keepalive
 * bodies at 64KB and reject anything larger before it leaves the page, so an
 * oversized backlog would never sync again; those go out as a normal fetch.
 */
export function canKeepalive(body: string): boolean {
  return body.length <= KEEPALIVE_MAX_BODY;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    // Callers only express intent; the 64KB cap guard lives here so no call
    // site can strand an oversized body on a rejected keepalive fetch.
    keepalive:
      options.keepalive === true &&
      (typeof options.body !== 'string' || canKeepalive(options.body)),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    // The message is the raw response body — a JSON error object, or an HTML
    // error page from Pages itself. Useful in a console, never something to put
    // in front of a child: branch on `status` and write your own copy.
    throw new ApiError(response.status, await response.text());
  }

  // Handle 204 No Content or empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  // Profiles
  async listProfiles(): Promise<ProfileListItem[]> {
    return request('/profiles');
  },

  async createProfile(data: CreateProfileRequest): Promise<Profile> {
    return request('/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProfile(id: string, changes: UpdateProfileRequest): Promise<Profile> {
    return request(`/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
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

  // Sync
  async syncProgress(
    profileId: string,
    facts: FactProgressSync[]
  ): Promise<void> {
    // Often fired as the page hides; request() drops keepalive over the cap.
    await request(`/profiles/${profileId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ facts }),
      keepalive: true,
    });
  },

  async syncSessions(
    profileId: string,
    curriculum: CurriculumId,
    sessionsCompleted: number
  ): Promise<void> {
    // Tiny payload that often fires as the app is closing, so keepalive it.
    await request(`/profiles/${profileId}/sessions`, {
      method: 'PUT',
      body: JSON.stringify({ curriculum, sessionsCompleted }),
      keepalive: true,
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
