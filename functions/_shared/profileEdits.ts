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

/** The three writable fields of a profile, shared by create and edit. */
export interface ProfileFields {
  name: string;
  icon: string;
  color: string;
}

export interface ProfileEdit extends ProfileFields {
  currentIcon: string;
}

export type ProfileFieldsValidation =
  | { ok: true; fields: ProfileFields }
  | { ok: false; error: string };

export type ProfileEditValidation =
  | { ok: true; edit: ProfileEdit }
  | { ok: false; error: string };

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Reads a request body, handing anything that isn't JSON to the validators as
 * undefined so it comes back out as their 400. Left unhandled the parse error
 * escapes the handler and Pages answers with a 500 HTML page, which the client
 * can only render as its generic "try again".
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * Whether a failed write is the database refusing a duplicate name. The unique
 * rule on profiles.name is the real guard behind both endpoints' friendlier
 * pre-checks, which only save us from depending on this string when nothing
 * races between their check and their write. D1 reports the constraint as
 * message text rather than a code, so the match lives here — one place to
 * correct when that text changes, instead of one endpoint quietly degrading to
 * "couldn't save that" while the other still says the name is taken.
 */
export function isUniqueNameViolation(err: unknown): boolean {
  return String(err).includes('UNIQUE');
}

/**
 * Validates the name/icon/color of a POST /api/profiles body. Both write
 * endpoints run this: a profile created with an off-list icon can never be
 * saved again, because the edit validator rejects the very value the form
 * resubmits.
 */
export function validateProfileFields(body: unknown): ProfileFieldsValidation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Missing fields' };
  }

  const { name, icon, color } = body as Record<string, unknown>;
  if (!isString(name) || !isString(icon) || !isString(color)) {
    return { ok: false, error: 'Missing fields' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Name is required' };
  }
  if (trimmed.length > MAX_PROFILE_NAME_LENGTH) {
    return { ok: false, error: 'Name is too long' };
  }

  // icon/color get written straight to the DB and the icon becomes the sign-in
  // password — an unrecognized value bricks the profile with no in-app
  // recovery, so membership is a hard requirement, not a nicety.
  if (!KNOWN_ICONS.includes(icon)) {
    return { ok: false, error: 'Unknown icon' };
  }
  if (!KNOWN_COLORS.includes(color)) {
    return { ok: false, error: 'Unknown color' };
  }

  return { ok: true, fields: { name: trimmed, icon, color } };
}

/**
 * Validates a PATCH /api/profiles/:id body. Every field is required — the
 * client always holds current values for all three editable fields, so there
 * is no partial-update case to reason about.
 */
export function validateProfileEdit(body: unknown): ProfileEditValidation {
  const validation = validateProfileFields(body);
  if (!validation.ok) {
    return validation;
  }

  const { currentIcon } = body as Record<string, unknown>;
  if (!isString(currentIcon)) {
    return { ok: false, error: 'Missing fields' };
  }

  return { ok: true, edit: { currentIcon, ...validation.fields } };
}
