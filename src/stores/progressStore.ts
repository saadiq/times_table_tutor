import { create } from 'zustand'
import type { FactProgress, Confidence, FactProgressSync, RecentAttempt, InputMethod } from '../types'
import { TIMES_TABLES, REWARDS, CONFIDENCE_THRESHOLDS } from '../lib/constants'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useGardenStore } from './gardenStore'
import { getMasteryReward } from '../lib/rewards'

type RecordAttemptParams = {
  fact: string
  correct: boolean
  inputMethod: InputMethod
  responseTimeMs: number
}

type ProgressState = {
  facts: Record<string, FactProgress>
  initialized: boolean
}

type ProgressActions = {
  initialize: () => void
  recordAttempt: (params: RecordAttemptParams) => void
  getFactProgress: (fact: string) => FactProgress | undefined
  getFactsByConfidence: (confidence: Confidence) => FactProgress[]
  getMasteredTables: () => number[]
  setPreferredStrategy: (fact: string, strategy: string) => void
  loadFromServer: (facts: FactProgressSync[]) => void
  toSyncPayload: (fact: string) => FactProgressSync | null
}

function generateAllFacts(): Record<string, FactProgress> {
  const facts: Record<string, FactProgress> = {}

  for (let a = TIMES_TABLES.min; a <= TIMES_TABLES.max; a++) {
    for (let b = TIMES_TABLES.min; b <= TIMES_TABLES.max; b++) {
      const fact = `${a}x${b}`
      facts[fact] = {
        fact,
        a,
        b,
        answer: a * b,
        confidence: 'new',
        correctCount: 0,
        incorrectCount: 0,
        lastSeen: null,
        lastCorrect: null,
        recentAttempts: [],
        preferredStrategy: null,
      }
    }
  }

  return facts
}

/**
 * Calculate confidence based on number pad performance.
 * Multiple choice can only get you to 'learning' - number pad is required for confident/mastered.
 */
function calculateConfidence(fact: FactProgress): Confidence {
  const recent = fact.recentAttempts.slice(-CONFIDENCE_THRESHOLDS.recentAttemptsWindow)

  // No attempts = new
  if (recent.length === 0) return 'new'

  // Filter to number pad attempts only for confident/mastered evaluation
  const recentNP = recent.filter(a => a.inputMethod === 'number_pad')
  const correctNP = recentNP.filter(a => a.correct)

  // Calculate NP metrics
  const npAccuracy = recentNP.length > 0
    ? correctNP.length / recentNP.length
    : 0
  const avgNPTime = correctNP.length > 0
    ? correctNP.reduce((sum, a) => sum + a.responseTimeMs, 0) / correctNP.length
    : Infinity

  // MASTERED: 5+ NP correct, <5s avg, 90%+ accuracy
  if (
    correctNP.length >= CONFIDENCE_THRESHOLDS.masteredMinCorrect &&
    avgNPTime < CONFIDENCE_THRESHOLDS.masteredMaxTime &&
    npAccuracy >= CONFIDENCE_THRESHOLDS.masteredMinAccuracy
  ) {
    return 'mastered'
  }

  // CONFIDENT: 3+ NP correct, <10s avg, 70%+ accuracy
  if (
    correctNP.length >= CONFIDENCE_THRESHOLDS.confidentMinCorrect &&
    avgNPTime < CONFIDENCE_THRESHOLDS.confidentMaxTime &&
    npAccuracy >= CONFIDENCE_THRESHOLDS.confidentMinAccuracy
  ) {
    return 'confident'
  }

  // LEARNING: Has any attempts
  return 'learning'
}

function checkTableMastery(
  facts: Record<string, FactProgress>,
  tableNumber: number
): boolean {
  for (let i = TIMES_TABLES.min; i <= TIMES_TABLES.max; i++) {
    const fact1 = facts[`${tableNumber}x${i}`]
    const fact2 = facts[`${i}x${tableNumber}`]
    if (fact1?.confidence !== 'mastered' || fact2?.confidence !== 'mastered') {
      return false
    }
  }
  return true
}

function getMasteredTablesFromFacts(facts: Record<string, FactProgress>): number[] {
  const mastered: number[] = []
  for (let table = TIMES_TABLES.min; table <= TIMES_TABLES.max; table++) {
    if (checkTableMastery(facts, table)) {
      mastered.push(table)
    }
  }
  return mastered
}

function getRandomPosition(): { x: number; y: number } {
  return {
    x: Math.random() * 200 + 50,
    y: Math.random() * 200 + 50,
  }
}

/**
 * Migrate old boolean[] recentAttempts to new RecentAttempt[] format
 */
function migrateRecentAttempts(attempts: unknown[]): RecentAttempt[] {
  if (attempts.length === 0) return []

  // Check if already in new format (has inputMethod property)
  const first = attempts[0]
  if (typeof first === 'object' && first !== null && 'inputMethod' in first) {
    return attempts as RecentAttempt[]
  }

  // Migrate from old boolean[] format
  const now = new Date().toISOString()
  return (attempts as boolean[]).map(correct => ({
    correct,
    inputMethod: 'multiple_choice' as InputMethod, // Assume MC for legacy data
    responseTimeMs: 5000, // Default to 5s for legacy
    timestamp: now,
  }))
}

/**
 * Migrate all facts in storage to new format and recalculate confidence
 */
function migrateFacts(facts: Record<string, FactProgress>): Record<string, FactProgress> {
  const migrated: Record<string, FactProgress> = {}

  for (const [key, fact] of Object.entries(facts)) {
    const migratedAttempts = migrateRecentAttempts(fact.recentAttempts as unknown[])
    const migratedFact = { ...fact, recentAttempts: migratedAttempts }
    // Recalculate confidence with new algorithm
    migratedFact.confidence = calculateConfidence(migratedFact)
    migrated[key] = migratedFact
  }

  return migrated
}

export const useProgressStore = create<ProgressState & ProgressActions>((set, get) => ({
  facts: {},
  initialized: false,

  initialize: () => {
    const saved = loadFromStorage<Record<string, FactProgress>>('progress')
    if (saved) {
      // Migrate old format to new format if needed
      const migrated = migrateFacts(saved)
      set({ facts: migrated, initialized: true })
      saveToStorage('progress', migrated)
    } else {
      const facts = generateAllFacts()
      set({ facts, initialized: true })
      saveToStorage('progress', facts)
    }
  },

  recordAttempt: ({ fact, correct, inputMethod, responseTimeMs }) => {
    set(state => {
      const current = state.facts[fact]
      if (!current) return state

      const now = new Date().toISOString()
      const newAttempt: RecentAttempt = {
        correct,
        inputMethod,
        responseTimeMs,
        timestamp: now,
      }
      const recentAttempts = [...current.recentAttempts, newAttempt]
        .slice(-CONFIDENCE_THRESHOLDS.recentAttemptsWindow)

      const updated: FactProgress = {
        ...current,
        correctCount: current.correctCount + (correct ? 1 : 0),
        incorrectCount: current.incorrectCount + (correct ? 0 : 1),
        lastSeen: now,
        lastCorrect: correct ? now : current.lastCorrect,
        recentAttempts,
        confidence: 'new', // Will be recalculated
      }
      updated.confidence = calculateConfidence(updated)

      const facts = { ...state.facts, [fact]: updated }
      saveToStorage('progress', facts)

      // Check if this completes a table mastery
      const tableA = current.a
      const tableB = current.b
      const gardenStore = useGardenStore.getState()
      const previousMastered = getMasteredTablesFromFacts(state.facts)

      const nowMasteredA = checkTableMastery(facts, tableA)
      const nowMasteredB = checkTableMastery(facts, tableB)
      const wasMasteredA = previousMastered.includes(tableA)
      const wasMasteredB = previousMastered.includes(tableB)

      // Award mastery reward for newly mastered tables
      if (nowMasteredA && !wasMasteredA) {
        const totalMastered = getMasteredTablesFromFacts(facts).length
        const reward = getMasteryReward(tableA, totalMastered)
        gardenStore.addCoins(REWARDS.masteredTable)
        gardenStore.addItem({
          type: reward.type,
          itemId: reward.itemId,
          position: getRandomPosition(),
          earnedFor: `mastered_${tableA}x`,
        })
      }

      if (tableA !== tableB && nowMasteredB && !wasMasteredB) {
        const totalMastered = getMasteredTablesFromFacts(facts).length
        const reward = getMasteryReward(tableB, totalMastered)
        gardenStore.addCoins(REWARDS.masteredTable)
        gardenStore.addItem({
          type: reward.type,
          itemId: reward.itemId,
          position: getRandomPosition(),
          earnedFor: `mastered_${tableB}x`,
        })
      }

      return { facts }
    })
  },

  getFactProgress: (fact) => get().facts[fact],

  getFactsByConfidence: (confidence) =>
    Object.values(get().facts).filter(f => f.confidence === confidence),

  getMasteredTables: () => {
    const facts = get().facts
    return getMasteredTablesFromFacts(facts)
  },

  setPreferredStrategy: (fact, strategy) => {
    set(state => {
      const current = state.facts[fact]
      if (!current) return state

      const facts = {
        ...state.facts,
        [fact]: { ...current, preferredStrategy: strategy }
      }
      saveToStorage('progress', facts)

      return { facts }
    })
  },

  loadFromServer: (facts) => {
    const factMap: Record<string, FactProgress> = {}
    for (const f of facts) {
      const [aStr, bStr] = f.fact.split('x')
      const a = parseInt(aStr)
      const b = parseInt(bStr)
      // Migrate recentAttempts to new format
      const migratedAttempts = migrateRecentAttempts(f.recentAttempts as unknown[])
      const factData: FactProgress = {
        fact: f.fact,
        a,
        b,
        answer: a * b,
        confidence: 'new', // Will be recalculated
        correctCount: f.correctCount,
        incorrectCount: f.incorrectCount,
        lastSeen: f.lastSeen ? new Date(f.lastSeen).toISOString() : null,
        lastCorrect: f.lastCorrect ? new Date(f.lastCorrect).toISOString() : null,
        recentAttempts: migratedAttempts,
        preferredStrategy: f.preferredStrategy,
      }
      // Recalculate confidence with new algorithm
      factData.confidence = calculateConfidence(factData)
      factMap[f.fact] = factData
    }
    // Merge with defaults for any missing facts
    const allFacts = generateAllFacts()
    for (const factKey of Object.keys(allFacts)) {
      if (!factMap[factKey]) {
        factMap[factKey] = allFacts[factKey]
      }
    }
    set({ facts: factMap, initialized: true })
  },

  toSyncPayload: (factKey) => {
    const fact = get().facts[factKey]
    if (!fact) return null
    return {
      fact: fact.fact,
      confidence: fact.confidence,
      correctCount: fact.correctCount,
      incorrectCount: fact.incorrectCount,
      lastSeen: fact.lastSeen ? new Date(fact.lastSeen).getTime() : null,
      lastCorrect: fact.lastCorrect ? new Date(fact.lastCorrect).getTime() : null,
      recentAttempts: fact.recentAttempts,
      preferredStrategy: fact.preferredStrategy,
    }
  },
}))
