import { describe, it, expect } from 'vitest'
import { validateProfileEdit, KNOWN_ICONS, KNOWN_COLORS } from './profileEdits'

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
