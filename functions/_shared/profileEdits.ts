/** Matches the maxLength on the name input in ProfileCreator/ProfileEditForm. */
export const MAX_PROFILE_NAME_LENGTH = 20;

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

  return { ok: true, edit: { currentIcon, name: trimmed, icon, color } };
}
