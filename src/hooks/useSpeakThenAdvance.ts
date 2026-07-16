import { useCallback, useEffect, useRef } from 'react'
import type { FactProgress } from '../types'
import type { Operation } from '../lib/operations'

/** Speak the completed fact, then advance after a minimum delay. */
export function useSpeakThenAdvance(ttsEnabled: boolean, operation: Operation) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const clearAdvanceTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const speakThenAdvance = useCallback((
    fact: FactProgress,
    minDelayMs: number,
    onAdvance: () => void
  ) => {
    const start = Date.now()
    const ttsPromise = ttsEnabled ? operation.speakFact(fact) : Promise.resolve()
    ttsPromise.then(() => {
      if (cancelledRef.current) return
      const remaining = Math.max(0, minDelayMs - (Date.now() - start))
      timerRef.current = setTimeout(onAdvance, remaining)
    })
  }, [ttsEnabled, operation])

  return { speakThenAdvance, clearAdvanceTimer }
}
