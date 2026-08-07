/** Matches the maxLength on the name input in ProfileCreator/ProfileEditForm. */
export const MAX_PROFILE_NAME_LENGTH = 20;

// functions/ must not import from src/ (nothing in this codebase does), so
// these mirror PROFILE_ICONS / PROFILE_COLORS in src/types/api.ts by hand.
// Keep both lists in sync with that file when the avatar options change.
export const KNOWN_ICONS: readonly string[] = [
  'cat', 'dog', 'rabbit', 'fish', 'owl', 'turtle', 'butterfly',
  'sun', 'moon', 'flower', 'tree',
  'rocket', 'star', 'heart', 'crown', 'diamond',
  'rainbow', 'cloud', 'lightning', 'snowflake',
];

export const KNOWN_COLORS: readonly string[] = [
  'garden-500', 'garden-600', 'warm-400', 'warm-500',
  'sky-400', 'sky-500', 'purple-400', 'rose-400',
];

export interface ProfileEdit {
  currentIcon: string;
  name: string;
  icon: string;
  color: string;
}

export type ProfileEditValidation =
  | { ok: true; edit: ProfileEdit }
  | { ok: false; error: string };

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Validates a PATCH /api/profiles/:id body. Every field is required — the
 * client always holds current values for all three editable fields, so there
 * is no partial-update case to reason about.
 */
export function validateProfileEdit(body: unknown): ProfileEditValidation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Missing fields' };
  }

  const { currentIcon, name, icon, color } = body as Record<string, unknown>;
  if (!isString(currentIcon) || !isString(name) || !isString(icon) || !isString(color)) {
    return { ok: false, error: 'Missing fields' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Name is required' };
  }
  if (trimmed.length > MAX_PROFILE_NAME_LENGTH) {
    return { ok: false, error: 'Name is too long' };
  }

  // icon/color get written straight to the DB and become the new sign-in
  // password (icon) — an unrecognized value bricks the profile with no
  // in-app recovery, so membership is a hard requirement, not a nicety.
  if (!KNOWN_ICONS.includes(icon)) {
    return { ok: false, error: 'Unknown icon' };
  }
  if (!KNOWN_COLORS.includes(color)) {
    return { ok: false, error: 'Unknown color' };
  }

  return { ok: true, edit: { currentIcon, name: trimmed, icon, color } };
}
