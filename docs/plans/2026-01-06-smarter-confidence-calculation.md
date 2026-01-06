# Smarter Confidence Calculation

## Problem Statement

The current confidence calculation system has several flaws:

1. **Ignores input method**: Multiple choice (recognition) counts the same as number pad (recall)
2. **Ignores response time**: A 30-second labored answer counts the same as instant recall
3. **No regression**: Once switched to number pad, users are stuck even if struggling
4. **Timezone bug**: "Today" stats use UTC instead of user's local timezone

### Evidence from Real Data (Zola's 2x12 Journey)

| Time | Method | Result | Response Time | Hint |
|------|--------|--------|---------------|------|
| 00:30 | MC | ✓ | 22.5s | No |
| 00:32 | MC | ✓ | 17.5s | No |
| 00:34 | NP | ✗ | 63.5s | No |
| 00:35 | NP | ✗ | 75.5s | Yes |
| 00:35 | NP | ✗ | 24.4s | Yes |
| 00:36 | NP | ✓ | 47.3s | Yes |

Two slow MC answers triggered number pad, then 3 failures with no regression back to MC.

## Design

### 1. Enhanced Data Model

**Current:**
```typescript
type FactProgress = {
  recentAttempts: boolean[]  // Just correct/incorrect
}
```

**New:**
```typescript
type RecentAttempt = {
  correct: boolean
  inputMethod: 'multiple_choice' | 'number_pad'
  responseTimeMs: number
  timestamp: string
}

type FactProgress = {
  recentAttempts: RecentAttempt[]  // Last 8 attempts with full context
}
```

**Migration:** Existing `boolean[]` entries convert to `RecentAttempt` with defaults:
- `inputMethod: 'multiple_choice'`
- `responseTimeMs: 5000`
- `timestamp: new Date().toISOString()`

### 2. Confidence Level Definitions

| Level | Requirements | Max Input Method |
|-------|-------------|------------------|
| **new** | No attempts yet | Multiple choice |
| **learning** | Has attempts, not yet confident | Multiple choice |
| **confident** | 3+ correct on NP, avg time <10s, 70%+ accuracy | Number pad |
| **mastered** | 5+ correct on NP, avg time <5s, 90%+ accuracy | Number pad |

**Key principle:** Multiple choice can only get you to "learning". Number pad is required for confident/mastered.

**Regression rules:**
- confident → learning: Recent NP accuracy <60%
- mastered → confident: Recent NP accuracy <80% OR avg time >8s

### 3. Time Thresholds (Based on Zola's Data)

| Category | Number Pad | Multiple Choice |
|----------|------------|-----------------|
| **Fast (fluent)** | < 5 seconds | < 3 seconds |
| **Moderate** | 5-10 seconds | 3-6 seconds |
| **Slow (laboring)** | > 10 seconds | > 6 seconds |

### 4. Input Method Selection (with Regression)

```typescript
function shouldUseMultipleChoice(fact: FactProgress): boolean {
  // New facts: always MC
  if (fact.confidence === 'new') return true

  // Confident/Mastered: always number pad
  if (fact.confidence === 'confident' || fact.confidence === 'mastered') {
    return false
  }

  // Learning: check recent number pad performance
  const recentNP = fact.recentAttempts
    .filter(a => a.inputMethod === 'number_pad')
    .slice(-5)

  // Not enough NP attempts? Use MC until 2 correct on MC
  if (recentNP.length < 2) {
    const mcCorrect = fact.recentAttempts
      .filter(a => a.inputMethod === 'multiple_choice' && a.correct)
      .length
    return mcCorrect < 2
  }

  // Check if struggling on NP
  const npCorrect = recentNP.filter(a => a.correct).length
  const npAccuracy = npCorrect / recentNP.length

  // REGRESSION: If <60% on recent NP, go back to MC
  if (npAccuracy < 0.6) return true

  // Check if answers are labored
  const correctNP = recentNP.filter(a => a.correct)
  if (correctNP.length > 0) {
    const avgTime = correctNP.reduce((sum, a) => sum + a.responseTimeMs, 0) / correctNP.length
    // REGRESSION: If correct but slow (>12s avg), go back to MC
    if (avgTime > 12000) return true
  }

  return false
}
```

### 5. Confidence Calculation

```typescript
function calculateConfidence(fact: FactProgress): Confidence {
  const recent = fact.recentAttempts.slice(-8)

  if (recent.length === 0) return 'new'

  const recentNP = recent.filter(a => a.inputMethod === 'number_pad')
  const correctNP = recentNP.filter(a => a.correct)

  const npAccuracy = recentNP.length > 0
    ? correctNP.length / recentNP.length
    : 0
  const avgNPTime = correctNP.length > 0
    ? correctNP.reduce((sum, a) => sum + a.responseTimeMs, 0) / correctNP.length
    : Infinity

  // MASTERED: 5+ NP correct, <5s avg, 90%+ accuracy
  if (correctNP.length >= 5 && avgNPTime < 5000 && npAccuracy >= 0.9) {
    return 'mastered'
  }

  // CONFIDENT: 3+ NP correct, <10s avg, 70%+ accuracy
  if (correctNP.length >= 3 && avgNPTime < 10000 && npAccuracy >= 0.7) {
    return 'confident'
  }

  return 'learning'
}
```

### 6. Timezone Fix

Replace UTC-based date extraction with local timezone:

```typescript
function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateKeyFromTimestamp(timestamp: string): string {
  return getLocalDateKey(new Date(timestamp))
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `RecentAttempt` type, update `FactProgress.recentAttempts` |
| `src/stores/progressStore.ts` | Update `calculateConfidence()`, `recordAttempt()`, add migration |
| `src/stores/attemptsStore.ts` | Fix timezone with `getLocalDateKey()` |
| `src/lib/adaptive.ts` | Rewrite `shouldUseMultipleChoice()` with regression |
| `src/views/PracticeView.tsx` | Pass rich data to `progressStore.recordAttempt()` |
| `src/lib/constants.ts` | Add threshold constants |

## Constants to Add

```typescript
export const CONFIDENCE_THRESHOLDS = {
  // Time thresholds (ms)
  masteredMaxTime: 5000,      // <5s for mastered
  confidentMaxTime: 10000,    // <10s for confident
  laboredTime: 12000,         // >12s triggers regression

  // Accuracy thresholds
  masteredMinAccuracy: 0.9,   // 90% for mastered
  confidentMinAccuracy: 0.7,  // 70% for confident
  regressionThreshold: 0.6,   // <60% triggers regression

  // Count thresholds
  masteredMinCorrect: 5,      // 5+ NP correct for mastered
  confidentMinCorrect: 3,     // 3+ NP correct for confident
  mcCorrectToAdvance: 2,      // 2 MC correct before trying NP

  // Window sizes
  recentAttemptsWindow: 8,    // Track last 8 attempts
  regressionWindow: 5,        // Check last 5 NP attempts for regression

  reviewInterval: 3,          // Days before reviewing mastered facts
}
```
