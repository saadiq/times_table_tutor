import type { CurriculumId } from './operations'
import { useCurriculumStore } from '../stores/curriculumStore'
import { useProgressStore } from '../stores/progressStore'
import { useFocusTablesStore } from '../stores/focusTablesStore'
import { useProgressViewStore } from '../stores/progressViewStore'
import { useSessionStore } from '../stores/sessionStore'

/**
 * Switch the active curriculum: persist the preference, swap every
 * curriculum-sliced store (progress BEFORE progressView, which derives
 * its counts from it), and reset the in-flight session run so new-fact
 * pacing doesn't bleed across tracks. The daily streak (attemptsStore)
 * is account-global and untouched.
 */
export function switchCurriculum(next: CurriculumId): void {
  if (useCurriculumStore.getState().active === next) return

  useCurriculumStore.getState().setActive(next)
  useProgressStore.getState().loadCurriculum(next)
  useFocusTablesStore.getState().loadCurriculum(next)
  useProgressViewStore.getState().loadCurriculum(next)
  useSessionStore.getState().resetProgress()
}
