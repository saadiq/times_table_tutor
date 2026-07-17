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

  describe('comeback lifecycle', () => {
    it('keeps the comeback pending while displayed and clears it when answered', async () => {
      // Four equal-priority confident facts: serve order is insertion order.
      loadFacts({
        '7x5': confidentFact(7, 5),
        '7x2': confidentFact(7, 2),
        '7x3': confidentFact(7, 3),
        '7x4': confidentFact(7, 4),
      })
      render(<PracticeView />)
      await flushMount()

      // Serve 1 is 7x5 — skip it (comeback queued, delay 2).
      fireEvent.click(screen.getByRole('button', { name: /skip/i }))
      expect(useSessionStore.getState().pendingComeback).toBe('7x5')

      // Two intervening problems: 7x2 then 7x3 (delay ticks 1 → 0).
      await answerOnPad('14')
      await answerOnPad('21')

      // Serve 4 is the comeback, as multiple choice (the correct answer is a choice button).
      const comebackChoice = screen.getByRole('button', { name: '35' })
      // Still pending while merely displayed — surviving an unmount here is the point.
      expect(useSessionStore.getState().pendingComeback).toBe('7x5')

      fireEvent.click(comebackChoice)
      expect(useSessionStore.getState().pendingComeback).toBeNull()
    })
  })

  describe('remount serving', () => {
    it('serves a due comeback on mount, as multiple choice, and resolves it when answered', async () => {
      const skipped = { ...confidentFact(7, 5), skippedCount: 1 }
      loadFacts({
        '7x5': skipped,
        '7x2': confidentFact(7, 2),
        '7x3': confidentFact(7, 3),
      })
      // State a previous mount left behind: 7x5 skipped, comeback now due.
      useSessionStore.setState({ pendingComeback: '7x5', comebackDelay: 0, skipsUsed: 1 })

      render(<PracticeView />)
      await flushMount()

      // Comeback route forces multiple choice: the answer appears as a choice
      // button. The adaptive route would give confident 7x5 the number pad.
      fireEvent.click(screen.getByRole('button', { name: '35' }))
      expect(useSessionStore.getState().pendingComeback).toBeNull()
    })

    it('discards a stale queued follow-up on mount instead of serving it later', async () => {
      loadFacts({
        '7x5': confidentFact(7, 5),
        '7x3': { ...makeFact(7, 3), confidence: 'learning' },
      })
      // A previous mount answered something and queued a follow-up, then unmounted.
      useSessionStore.setState({ pendingFollowUp: '7x3' })

      render(<PracticeView />)
      await flushMount()

      expect(useSessionStore.getState().pendingFollowUp).toBeNull()
    })
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
