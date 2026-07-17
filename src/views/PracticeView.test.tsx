// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, act, cleanup, screen } from '@testing-library/react'
import { PracticeView } from './PracticeView'
import { useProgressStore } from '../stores/progressStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useFocusTablesStore } from '../stores/focusTablesStore'
import { useCurriculumStore } from '../stores/curriculumStore'
import { makeFact } from '../test/factories'
import type { FactProgress } from '../types'

function confidentFact(a: number, b: number): FactProgress {
  return { ...makeFact(a, b), confidence: 'confident' }
}

/**
 * Deterministic serving: Math.random is pinned to 0, so selectNextFact always
 * takes the top-scored candidate, and equal scores resolve in insertion order.
 * Commuted keys (e.g. 2x7) are deliberately absent so follow-ups never fire.
 */
function loadFacts(facts: Record<string, FactProgress>) {
  useProgressStore.setState({ facts, initialized: true, curriculum: 'multiply' })
}

async function flushMount() {
  await act(async () => {})
}

/** Type an answer on the number pad and let the advance timer fire. */
async function answerOnPad(digits: string) {
  for (const d of digits) {
    fireEvent.click(screen.getByRole('button', { name: d }))
  }
  fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000)
  })
}

describe('PracticeView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useCurriculumStore.setState({ active: 'multiply' })
    useSettingsStore.setState({ ttsEnabled: false })
    useFocusTablesStore.setState({ focusTables: [], isEnabled: false })
    useSessionStore.getState().resetProgress()
    useSessionStore.setState({ goal: 5, mode: 'practice' })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('hint-gated mastery', () => {
    it('records hintShown when the hint was opened and closed before answering', async () => {
      loadFacts({ '7x5': confidentFact(7, 5) })
      render(<PracticeView />)
      await flushMount()

      fireEvent.click(screen.getByRole('button', { name: /hint/i }))
      fireEvent.click(screen.getByRole('button', { name: /got it/i }))
      await answerOnPad('35')

      const attempts = useProgressStore.getState().facts['7x5'].recentAttempts
      expect(attempts).toHaveLength(1)
      expect(attempts[0].correct).toBe(true)
      expect(attempts[0].hintShown).toBe(true)
    })
  })
})
