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
