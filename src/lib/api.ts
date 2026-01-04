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
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
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
