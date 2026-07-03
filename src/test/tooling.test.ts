import { describe, it, expect } from 'vitest'

describe('test tooling', () => {
  it('runs assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('provides a DOM environment with localStorage', () => {
    expect(typeof localStorage).toBe('object')
    localStorage.setItem('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
  })
})
