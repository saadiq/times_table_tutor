/**
 * Wall-clock timings for one served problem. Total time still runs from serve
 * to the final answer; `firstInputMs` isolates recall from keypad navigation
 * by latching the first digit tap. With no marked input (multiple choice),
 * the answering tap is the first input, so both timings coincide.
 *
 * Both values are raw and uncapped, like responseTimeMs has always been —
 * a walk-away records minutes. Consumers must cap at read time the way
 * typicalResponseTime caps with responseTimeCap. The engine still judges
 * responseTimeMs via the perDigitTimeAllowance heuristic (constants.ts);
 * firstInputMs is collected to calibrate or replace that heuristic.
 */
export type AttemptTimings = {
  responseTimeMs: number
  firstInputMs: number
}

export type AttemptTimer = {
  /** Begin timing a newly served problem. */
  start: () => void
  /** Latch the first input tap; later calls are ignored until the next start. */
  markInput: () => void
  /** Timings as of now, for the attempt being answered. */
  read: () => AttemptTimings
}

export function createAttemptTimer(now: () => number = Date.now): AttemptTimer {
  let startedAt = now()
  let firstInputAt: number | null = null

  return {
    start() {
      startedAt = now()
      firstInputAt = null
    },
    markInput() {
      if (firstInputAt === null) firstInputAt = now()
    },
    read() {
      const t = now()
      return {
        responseTimeMs: t - startedAt,
        firstInputMs: (firstInputAt ?? t) - startedAt,
      }
    },
  }
}
