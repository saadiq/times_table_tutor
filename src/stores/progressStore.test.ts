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
})
