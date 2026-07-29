// Shared by the sync endpoints. Underscore-prefixed so Pages never routes it.

/**
 * Older cached PWA clients omit the curriculum field entirely; anything
 * unrecognized is filed under multiply, the only curriculum they know.
 */
export function normalizeCurriculum(value: unknown): 'multiply' | 'divide' {
  return value === 'divide' ? 'divide' : 'multiply';
}
