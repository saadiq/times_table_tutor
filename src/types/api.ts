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

export interface UpdateProfileRequest {
  /** The caller's current icon, re-verified server-side before any write. */
  currentIcon: string;
  name: string;
  icon: string;
  color: string;
}

// Sync payload types
export interface RecentAttemptSync {
  correct: boolean;
  inputMethod: 'multiple_choice' | 'number_pad';
  responseTimeMs: number;
  timestamp: string;
  hintShown?: boolean;
  /** Time to the first digit tap; equals responseTimeMs on multiple choice. Absent = legacy data. */
  firstInputMs?: number;
}

export interface FactProgressSync {
  fact: string;
  /**
   * Matches CurriculumId in src/lib/operations (kept inline so this
   * wire-format file stays import-free). Omitted by pre-division clients
   * and servers; readers treat a missing value as 'multiply'.
   */
  curriculum?: 'multiply' | 'divide';
  confidence: string;
  correctCount: number;
  incorrectCount: number;
  skippedCount?: number;
  lastSeen: number | null;
  lastCorrect: number | null;
  recentAttempts: RecentAttemptSync[];
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
  /**
   * Completed sessions per curriculum. The scene's foundation warmth is a
   * per-curriculum thing, so the server counts them per curriculum too and the
   * garden PUT never carries (and so never clobbers) them. Pre-sessions servers
   * omit the field entirely.
   */
  sessions?: SessionCounts;
}

/** Session counts keyed by curriculum; an unpracticed curriculum is absent. */
export type SessionCounts = Partial<Record<'multiply' | 'divide', number>>;

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

/**
 * Longest profile name the server accepts. Mirrored as
 * MAX_PROFILE_NAME_LENGTH in functions/_shared/profileEdits.ts, which cannot
 * import from src/ — the test there asserts the two stay equal.
 */
export const MAX_PROFILE_NAME_LENGTH = 20;
