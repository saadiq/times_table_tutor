import { describe, it, expect } from 'vitest'
import {
  validateProfileEdit,
  KNOWN_ICONS,
  KNOWN_COLORS,
  MAX_PROFILE_NAME_LENGTH,
} from './profileEdits'
// Test-only reach across the functions/src boundary. Shipped Function code
// must never import from src/, but this file is never bundled into a
// handler — and it is the only thing that can catch the two copies drifting.
import {
  PROFILE_ICONS,
  PROFILE_COLORS,
  MAX_PROFILE_NAME_LENGTH as CLIENT_MAX_NAME_LENGTH,
} from '../../src/types/api'

function body(overrides: Record<string, unknown> = {}) {
  return { currentIcon: 'cat', name: 'Ada', icon: 'owl', color: 'sky-400', ...overrides }
}

describe('validateProfileEdit', () => {
  it('accepts a complete body and trims the name', () => {
    const result = validateProfileEdit(body({ name: '  Ada  ' }))

    expect(result).toEqual({
      ok: true,
      edit: { currentIcon: 'cat', name: 'Ada', icon: 'owl', color: 'sky-400' },
    })
  })

  it('rejects a name that is blank once trimmed', () => {
    expect(validateProfileEdit(body({ name: '   ' }))).toEqual({
      ok: false,
      error: 'Name is required',
    })
  })

  it('rejects a name longer than 20 characters', () => {
    expect(validateProfileEdit(body({ name: 'a'.repeat(21) }))).toEqual({
      ok: false,
      error: 'Name is too long',
    })
  })

  it('measures length after trimming, so padding never pushes a legal name over', () => {
    const result = validateProfileEdit(body({ name: `  ${'a'.repeat(20)}  ` }))

    expect(result.ok).toBe(true)
  })

  it('rejects a body with a missing or non-string field', () => {
    expect(validateProfileEdit(body({ icon: undefined }))).toEqual({
      ok: false,
      error: 'Missing fields',
    })
    expect(validateProfileEdit(body({ currentIcon: 7 }))).toEqual({
      ok: false,
      error: 'Missing fields',
    })
  })

  it('rejects a body that is not an object', () => {
    expect(validateProfileEdit(null)).toEqual({ ok: false, error: 'Missing fields' })
    expect(validateProfileEdit('nope')).toEqual({ ok: false, error: 'Missing fields' })
  })

  it('rejects an icon that is not one of the known avatar options', () => {
    expect(validateProfileEdit(body({ icon: 'zzz' }))).toEqual({
      ok: false,
      error: 'Unknown icon',
    })
  })

  it('rejects a color that is not one of the known avatar options', () => {
    expect(validateProfileEdit(body({ color: 'zzz' }))).toEqual({
      ok: false,
      error: 'Unknown color',
    })
  })

  it('accepts every known icon', () => {
    for (const icon of KNOWN_ICONS) {
      expect(validateProfileEdit(body({ icon })).ok).toBe(true)
    }
  })

  it('accepts every known color', () => {
    for (const color of KNOWN_COLORS) {
      expect(validateProfileEdit(body({ color })).ok).toBe(true)
    }
  })
})

// These constants are hand-mirrored from src/types/api.ts because functions/
// cannot import from src/. Left to a comment, the copies drift silently: a new
// avatar option would render in the picker and then be rejected by the server.
describe('parity with the client avatar options', () => {
  it('knows exactly the icons the client offers', () => {
    expect(KNOWN_ICONS).toEqual([...PROFILE_ICONS])
  })

  it('knows exactly the colors the client offers', () => {
    expect(KNOWN_COLORS).toEqual([...PROFILE_COLORS])
  })

  it('enforces the same name length the client input caps at', () => {
    expect(MAX_PROFILE_NAME_LENGTH).toBe(CLIENT_MAX_NAME_LENGTH)
  })
})
