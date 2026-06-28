import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from './progressStore'

describe('progressStore.initialize', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.setState({ facts: {}, initialized: false })
  })

  it('generates all 144 multiplication facts on a fresh start', () => {
    useProgressStore.getState().initialize()
    const facts = useProgressStore.getState().facts
    expect(Object.keys(facts)).toHaveLength(144)
    expect(facts['7x8'].answer).toBe(56)
    expect(facts['12x12'].answer).toBe(144)
  })
})
