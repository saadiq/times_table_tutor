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

export type ProfileIcon = typeof PROFILE_ICONS[number];

export const PROFILE_COLORS = [
  'garden-500', 'garden-600', 'warm-400', 'warm-500',
  'sky-400', 'sky-500', 'purple-400', 'rose-400'
] as const;

export type ProfileColor = typeof PROFILE_COLORS[number];
