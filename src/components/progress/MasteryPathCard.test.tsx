// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MasteryPathCard } from './MasteryPathCard'
import { makeFact, makeAttempt } from '../../test/factories'

describe('MasteryPathCard', () => {
  afterEach(cleanup)

  it('shows the path to confident for a learning fact', () => {
    const fact = { ...makeFact(3, 4), confidence: 'learning' as const, recentAttempts: [makeAttempt({ responseTimeMs: 6000 })] }
    render(<MasteryPathCard fact={fact} />)
    expect(screen.getByText(/path to confident/i)).toBeTruthy()
    expect(screen.getByText('1 of 3')).toBeTruthy()
    expect(screen.getByText(/6\.0s/)).toBeTruthy()
  })

  it('shows the mastered thresholds for a confident fact', () => {
    const fact = { ...makeFact(3, 4), confidence: 'confident' as const, recentAttempts: [makeAttempt({ responseTimeMs: 4000 })] }
    render(<MasteryPathCard fact={fact} />)
    expect(screen.getByText(/path to mastered/i)).toBeTruthy()
    expect(screen.getByText('1 of 5')).toBeTruthy()
  })

  it('shows a resting state once mastered', () => {
    const fact = { ...makeFact(3, 4), confidence: 'mastered' as const }
    render(<MasteryPathCard fact={fact} />)
    expect(screen.getByText(/mastered/i)).toBeTruthy()
    expect(screen.queryByText(/path to/i)).toBeNull()
  })

  it('handles a fact with no typed answers yet', () => {
    render(<MasteryPathCard fact={makeFact(3, 7)} />)
    expect(screen.getByText('0 of 3')).toBeTruthy()
    expect(screen.getByText(/no typed answers yet/i)).toBeTruthy()
  })
})
