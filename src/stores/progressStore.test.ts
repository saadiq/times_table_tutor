import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from './progressStore'
import { useCurriculumStore } from './curriculumStore'

describe('progressStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurriculumStore.setState({ active: 'multiply' })
    useProgressStore.setState({ facts: {}, initialized: false, curriculum: 'multiply' })
  })

  it('generates all 144 multiplication facts on a fresh start', () => {
    useProgressStore.getState().initialize()
    const facts = useProgressStore.getState().facts
    expect(Object.keys(facts)).toHaveLength(144)
    expect(facts['7x8'].answer).toBe(56)
    expect(facts['12x12'].answer).toBe(144)
  })

  it('stores hintShown on the recorded attempt', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().recordAttempt({
      fact: '7x8', correct: true, inputMethod: 'number_pad', responseTimeMs: 3000, hintShown: true,
    })
    const attempts = useProgressStore.getState().facts['7x8'].recentAttempts
    expect(attempts[0].hintShown).toBe(true)
  })

  it('loads a legacy ttt_progress payload as the multiply slice', () => {
    useProgressStore.getState().initialize()
    const saved = localStorage.getItem('ttt_progress')
    expect(saved).not.toBeNull()
    expect(Object.keys(JSON.parse(saved as string))).toHaveLength(144)
  })

  it('keeps the two curricula fully isolated', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().recordAttempt({
      fact: '7x8', correct: true, inputMethod: 'multiple_choice', responseTimeMs: 3000,
    })
    const multiplyCorrect = useProgressStore.getState().facts['7x8'].correctCount
    expect(multiplyCorrect).toBe(1)

    useProgressStore.getState().loadCurriculum('divide')
    const divideFacts = useProgressStore.getState().facts
    expect(Object.keys(divideFacts)).toHaveLength(144)
    expect(divideFacts['56÷7'].answer).toBe(8)
    expect(divideFacts['7x8']).toBeUndefined()

    useProgressStore.getState().recordAttempt({
      fact: '56÷7', correct: true, inputMethod: 'multiple_choice', responseTimeMs: 3000,
    })
    expect(useProgressStore.getState().facts['56÷7'].correctCount).toBe(1)

    useProgressStore.getState().loadCurriculum('multiply')
    expect(useProgressStore.getState().facts['7x8'].correctCount).toBe(multiplyCorrect)
    expect(useProgressStore.getState().facts['56÷7']).toBeUndefined()
  })

  it('computes division table mastery by divisor', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    const facts = useProgressStore.getState().facts
    const mastered = Object.fromEntries(
      Object.entries(facts).map(([key, fact]) => [
        key,
        fact.b === 7 ? { ...fact, confidence: 'mastered' as const } : fact,
      ])
    )
    useProgressStore.setState({ facts: mastered })
    expect(useProgressStore.getState().getMasteredTables()).toEqual([7])
  })

  it('builds division sync payloads tagged with the divide curriculum', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    const payload = useProgressStore.getState().toSyncPayload('56÷7')
    expect(payload).not.toBeNull()
    expect(payload?.fact).toBe('56÷7')
    expect(payload?.curriculum).toBe('divide')
  })

  it('tags multiplication sync payloads with the multiply curriculum', () => {
    useProgressStore.getState().initialize()
    const payload = useProgressStore.getState().toSyncPayload('7x8')
    expect(payload?.curriculum).toBe('multiply')
  })

  it('partitions server rows into per-curriculum slices', () => {
    useProgressStore.getState().initialize()
    useProgressStore.getState().loadFromServer([
      {
        fact: '7x8', curriculum: 'multiply', confidence: 'confident',
        correctCount: 5, incorrectCount: 1, lastSeen: 1750000000000,
        lastCorrect: 1750000000000, recentAttempts: [], preferredStrategy: null,
      },
      {
        fact: '56÷7', curriculum: 'divide', confidence: 'confident',
        correctCount: 3, incorrectCount: 0, lastSeen: 1750000000000,
        lastCorrect: 1750000000000, recentAttempts: [], preferredStrategy: null,
      },
    ])
    const multiply = JSON.parse(localStorage.getItem('ttt_progress') as string)
    const divide = JSON.parse(localStorage.getItem('ttt_progress_divide') as string)
    expect(multiply['7x8'].correctCount).toBe(5)
    expect(multiply['56÷7']).toBeUndefined()
    expect(divide['56÷7'].correctCount).toBe(3)
    expect(Object.keys(divide)).toHaveLength(144)
    // multiply is active, so memory holds the multiply slice
    expect(useProgressStore.getState().facts['7x8'].correctCount).toBe(5)
  })

  it('treats server rows without a curriculum as multiplication', () => {
    useProgressStore.getState().loadFromServer([
      {
        fact: '7x8', confidence: 'confident', correctCount: 5,
        incorrectCount: 1, lastSeen: null, lastCorrect: null,
        recentAttempts: [], preferredStrategy: null,
      },
    ])
    const multiply = JSON.parse(localStorage.getItem('ttt_progress') as string)
    expect(multiply['7x8'].correctCount).toBe(5)
  })

  it('drops rows whose fact key is unknown to their curriculum', () => {
    // A division key mis-tagged 'multiply' (e.g. synced through a
    // pre-migration server, then backfilled by the column default).
    useProgressStore.getState().loadFromServer([
      {
        fact: '56÷7', curriculum: 'multiply', confidence: 'confident',
        correctCount: 9, incorrectCount: 0, lastSeen: null, lastCorrect: null,
        recentAttempts: [], preferredStrategy: null,
      },
    ])
    const multiply = JSON.parse(localStorage.getItem('ttt_progress') as string)
    const divide = JSON.parse(localStorage.getItem('ttt_progress_divide') as string)
    expect(multiply['56÷7']).toBeUndefined()
    expect(divide['56÷7'].correctCount).toBe(0)
  })

  it('loads the divide slice into memory when divide is active', () => {
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().initialize()
    useProgressStore.getState().loadFromServer([
      {
        fact: '56÷7', curriculum: 'divide', confidence: 'confident',
        correctCount: 3, incorrectCount: 0, lastSeen: null, lastCorrect: null,
        recentAttempts: [], preferredStrategy: null,
      },
    ])
    expect(useProgressStore.getState().facts['56÷7'].correctCount).toBe(3)
    expect(useProgressStore.getState().facts['7x8']).toBeUndefined()
  })
})
