// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { FactDetailSheet } from './FactDetailSheet'
import { useCurriculumStore } from '../../stores/curriculumStore'
import { makeFact, makeAttempt } from '../../test/factories'

describe('FactDetailSheet', () => {
  beforeEach(() => {
    useCurriculumStore.setState({ active: 'multiply' })
  })
  afterEach(cleanup)

  it('shows wrong answers as red dots in the recent streak', () => {
    const fact = { ...makeFact(3, 4), confidence: 'learning' as const, recentAttempts: [makeAttempt(), makeAttempt({ correct: false })] }
    const { container } = render(<FactDetailSheet fact={fact} onClose={() => {}} />)
    expect(container.querySelectorAll('.bg-red-400')).toHaveLength(1)
    expect(container.querySelectorAll('.bg-garden-500')).toHaveLength(1)
  })
})
