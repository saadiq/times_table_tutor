import { describe, it, expect } from 'vitest'
import { decideNextProblem } from './practiceFlow'
import { multiplyOperation } from './operations'

const facts = multiplyOperation.generateFacts()

const base = {
  facts,
  recentFacts: [],
  focusTables: [] as number[],
  context: {},
  pendingComeback: null as string | null,
  pendingFollowUp: null as string | null,
  comebackDelay: 0,
  progress: 0,
  goal: 5,
}

describe('decideNextProblem comeback handling', () => {
  it('serves adaptively with no pending comeback', () => {
    const result = decideNextProblem(base)
    expect(result.kind).toBe('adaptive')
    expect(result.comeback).toBe('none')
    expect(result.next).not.toBeNull()
  })

  it('defers the comeback while the delay is positive', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 2 })
    expect(result.kind).toBe('adaptive')
    expect(result.comeback).toBe('deferred')
    expect(result.next?.fact).not.toBe('7x8')
  })

  it('serves the comeback when the delay reaches zero', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 0 })
    expect(result.kind).toBe('comeback')
    expect(result.comeback).toBe('served')
    expect(result.next?.fact).toBe('7x8')
  })

  it('forces the comeback when the block is about to complete', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 2, progress: 4, goal: 5 })
    expect(result.kind).toBe('comeback')
    expect(result.next?.fact).toBe('7x8')
  })

  it('drops a comeback that no longer matches the focus tables', () => {
    const result = decideNextProblem({ ...base, pendingComeback: '7x8', comebackDelay: 0, focusTables: [3] })
    expect(result.comeback).toBe('dropped')
    expect(result.kind).toBe('adaptive')
    expect(result.next && (result.next.a === 3 || result.next.b === 3)).toBe(true)
  })
})

describe('decideNextProblem follow-up handling', () => {
  const withFollowUp = { ...base, pendingFollowUp: '8x7' }

  it('serves an eligible follow-up', () => {
    const result = decideNextProblem(withFollowUp)
    expect(result.kind).toBe('followUp')
    expect(result.next?.fact).toBe('8x7')
  })

  it('skips a follow-up that is already confident', () => {
    const facts = { ...base.facts, '8x7': { ...base.facts['8x7'], confidence: 'confident' as const } }
    expect(decideNextProblem({ ...withFollowUp, facts }).kind).toBe('adaptive')
  })

  it('skips the follow-up when one correct answer remains', () => {
    expect(decideNextProblem({ ...withFollowUp, progress: 4, goal: 5 }).kind).toBe('adaptive')
  })

  it('skips a follow-up in the recent window', () => {
    const result = decideNextProblem({ ...withFollowUp, recentFacts: ['3x3', '8x7', '2x2'] })
    expect(result.kind).toBe('adaptive')
  })

  it('a due comeback beats the follow-up', () => {
    const result = decideNextProblem({ ...withFollowUp, pendingComeback: '9x6', comebackDelay: 0 })
    expect(result.kind).toBe('comeback')
    expect(result.next?.fact).toBe('9x6')
  })
})
