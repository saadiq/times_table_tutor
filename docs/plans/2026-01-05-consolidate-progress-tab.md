# Consolidate Progress Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move analytics (MasteryGrid, ActivityCalendar) from LearnView into the tree tab, rename "Garden" to "Progress", making Learn purely educational.

**Architecture:** The tree tab becomes the single source for all progress visualization. Tree scene is the default view (emotional reward). A "View Stats" button opens a bottom sheet with MasteryGrid and ActivityCalendar (data-driven view). LearnView becomes simpler, focused only on fact exploration.

**Tech Stack:** React, Zustand, Framer Motion, Tailwind CSS, Lucide icons

---

## Task 1: Create StatsSheet Component

**Files:**
- Create: `src/components/progress/StatsSheet.tsx`
- Modify: `src/components/progress/index.ts`

**Step 1: Create StatsSheet component**

Create a bottom sheet that displays MasteryGrid and ActivityCalendar:

```tsx
// src/components/progress/StatsSheet.tsx
import { motion } from 'framer-motion'
import { X, BarChart3 } from 'lucide-react'
import { MasteryGrid } from './MasteryGrid'
import { ActivityCalendar } from './ActivityCalendar'
import { FactDetailSheet } from './FactDetailSheet'
import { SyncStatusBadge } from './SyncStatusBadge'
import { useState } from 'react'
import type { FactProgress } from '../../types'

type StatsSheetProps = {
  isOpen: boolean
  onClose: () => void
}

export function StatsSheet({ isOpen, onClose }: StatsSheetProps) {
  const [detailFact, setDetailFact] = useState<FactProgress | null>(null)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-garden-600" />
            <h2 className="text-lg font-semibold text-gray-800">Detailed Stats</h2>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mastery grid card */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Mastery Overview
            </h3>
            <MasteryGrid onFactSelect={setDetailFact} />
          </div>

          {/* Activity calendar card */}
          <ActivityCalendar />
        </div>
      </motion.div>

      {/* Fact detail sheet (nested) */}
      {detailFact && (
        <FactDetailSheet fact={detailFact} onClose={() => setDetailFact(null)} />
      )}
    </>
  )
}
```

**Step 2: Export from index**

Modify `src/components/progress/index.ts` to add the export:

```ts
// src/components/progress/index.ts
// Tree progress visualization (new)
export { ProgressView } from "./ProgressView"
export { ProgressScene } from "./ProgressScene"
export { CharacterBar } from "./CharacterBar"
export { RevealSequence } from "./RevealSequence"

// Mastery tracking components (existing)
export { MasteryGrid } from "./MasteryGrid"
export { ActivityCalendar } from "./ActivityCalendar"
export { FactDetailSheet } from "./FactDetailSheet"
export { SyncStatusBadge } from "./SyncStatusBadge"
export { StatsSheet } from "./StatsSheet"
```

**Step 3: Verify it builds**

Run: `bun run build`
Expected: Build succeeds (component not used yet)

**Step 4: Commit**

```bash
git add src/components/progress/StatsSheet.tsx src/components/progress/index.ts
git commit -m "feat: add StatsSheet bottom sheet component"
```

---

## Task 2: Add Stats Button to ProgressView

**Files:**
- Modify: `src/components/progress/ProgressView.tsx`

**Step 1: Import StatsSheet and add state**

At the top of ProgressView.tsx, add the import and state:

```tsx
import { StatsSheet } from './StatsSheet'
```

Inside the component, add state:

```tsx
const [showStats, setShowStats] = useState(false)
```

**Step 2: Add stats button to header**

Replace the header section (lines 102-110) with:

```tsx
{/* Header */}
<div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
  <div className="flex items-center gap-2">
    <Star size={20} className="text-warm-500" />
    <span className="font-semibold text-gray-800">
      {totalProgress} / 144
    </span>
  </div>
  <button
    onClick={() => setShowStats(true)}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-600"
  >
    <BarChart3 size={16} />
    <span>Stats</span>
  </button>
</div>
```

**Step 3: Add StatsSheet at the end of the component**

Before the closing `</div>` of the main container (just before the debug panel), add:

```tsx
{/* Stats sheet */}
<AnimatePresence>
  {showStats && (
    <StatsSheet isOpen={showStats} onClose={() => setShowStats(false)} />
  )}
</AnimatePresence>
```

**Step 4: Add BarChart3 to imports**

Update the lucide-react import:

```tsx
import { Sparkles, Star, BarChart3 } from 'lucide-react'
```

**Step 5: Verify it builds**

Run: `bun run build`
Expected: Build succeeds

**Step 6: Manual test**

Run: `bun run dev`
1. Navigate to Tree tab
2. Click "Stats" button in header
3. Verify StatsSheet opens with MasteryGrid and ActivityCalendar
4. Click a fact cell, verify FactDetailSheet opens
5. Close sheets, verify they animate out

**Step 7: Commit**

```bash
git add src/components/progress/ProgressView.tsx
git commit -m "feat: add stats button to progress view header"
```

---

## Task 3: Simplify LearnView (Remove Progress Tab)

**Files:**
- Modify: `src/views/LearnView.tsx`

**Step 1: Remove progress-related imports**

Remove these imports (they're no longer needed):

```tsx
// REMOVE these lines:
import { useAttemptsStore } from '../stores/attemptsStore'
import {
  MasteryGrid,
  ActivityCalendar,
  FactDetailSheet,
  SyncStatusBadge,
} from '../components/progress'
```

Keep only:

```tsx
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useProgressStore } from '../stores'
import { FactCard, VisualExplainer } from '../components/learn'
import type { FactProgress } from '../types'
import { TIMES_TABLES } from '../lib/constants'
```

**Step 2: Remove tab state and progress-only state**

Remove:
- `const [activeTab, setActiveTab] = useState<'learn' | 'progress'>('learn')`
- `const [detailFact, setDetailFact] = useState<FactProgress | null>(null)`
- `const { getStreakDays } = useAttemptsStore()`
- `const streakDays = getStreakDays()`

**Step 3: Remove tab header and ProgressTabContent**

Remove the entire tab header JSX (lines 44-78) and replace the tab content conditional with just the learn content:

```tsx
export function LearnView() {
  const { facts } = useProgressStore()

  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedFact, setSelectedFact] = useState<FactProgress | null>(null)

  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  const getTableFacts = (table: number) =>
    Object.values(facts).filter(f => f.a === table)

  const getTableMastery = (table: number) => {
    const tableFacts = getTableFacts(table)
    const mastered = tableFacts.filter(f => f.confidence === 'mastered').length
    return Math.round((mastered / tableFacts.length) * 100)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Table selector */}
      <div className="p-4 bg-white border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Choose a Times Table
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tables.map(table => {
            const mastery = getTableMastery(table)
            const isSelected = selectedTable === table
            return (
              <button
                key={table}
                onClick={() => setSelectedTable(isSelected ? null : table)}
                className={`flex-shrink-0 w-12 h-12 rounded-xl font-bold transition-colors ${
                  isSelected
                    ? 'bg-garden-500 text-white'
                    : mastery === 100
                    ? 'bg-warm-100 text-warm-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {table}
              </button>
            )
          })}
        </div>
      </div>

      {/* Facts grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedTable ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedTable} Times Table
              </h3>
              <span className="text-sm text-gray-500">
                {getTableMastery(selectedTable)}% mastered
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {getTableFacts(selectedTable).map(fact => (
                <FactCard
                  key={fact.fact}
                  fact={fact}
                  onClick={() => setSelectedFact(fact)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Select a times table above to see its facts
          </div>
        )}
      </div>

      {/* Visual explainer modal */}
      <AnimatePresence>
        {selectedFact && (
          <VisualExplainer
            fact={selectedFact}
            onClose={() => setSelectedFact(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 4: Remove ProgressTabContent function**

Delete the entire `ProgressTabContent` component and its type (lines 196-219 in original).

**Step 5: Remove LearnTabContent wrapper**

Since there's no tab switching, inline the content directly (already done in step 3).

Delete the `LearnTabContentProps` type and `LearnTabContent` component.

**Step 6: Verify it builds**

Run: `bun run build`
Expected: Build succeeds

**Step 7: Manual test**

Run: `bun run dev`
1. Navigate to Learn tab
2. Verify only fact exploration is shown (no Progress sub-tab)
3. Select a table, click a fact, verify VisualExplainer works

**Step 8: Commit**

```bash
git add src/views/LearnView.tsx
git commit -m "refactor: simplify LearnView to only show fact exploration"
```

---

## Task 4: Rename Navigation Label from "Tree" to "Progress"

**Files:**
- Modify: `src/components/common/Navigation.tsx`

**Step 1: Update nav label**

Change line 28 from:

```tsx
{ mode: 'garden', icon: TreeDeciduous, label: 'Tree' },
```

To:

```tsx
{ mode: 'garden', icon: TreeDeciduous, label: 'Progress' },
```

**Step 2: Verify it builds**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Manual test**

Run: `bun run dev`
1. Look at bottom navigation
2. Verify third tab now says "Progress" instead of "Tree"
3. Tap it, verify tree view loads

**Step 4: Commit**

```bash
git add src/components/common/Navigation.tsx
git commit -m "refactor: rename Tree nav label to Progress"
```

---

## Task 5: Update ProgressView Header Title

**Files:**
- Modify: `src/components/progress/ProgressView.tsx`

**Step 1: Remove "Your Learning Tree" text**

The header currently says "Your Learning Tree" which is redundant now that the tab is called "Progress". Update line 109 from:

```tsx
<span className="text-sm text-gray-500">Your Learning Tree</span>
```

To:

```tsx
<span className="text-sm text-gray-500">Facts Learned</span>
```

**Step 2: Verify it builds**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/progress/ProgressView.tsx
git commit -m "refactor: update progress view header text"
```

---

## Task 6: Final Integration Test

**Step 1: Full manual test**

Run: `bun run dev`

Test the complete flow:
1. **Learn tab**: Only shows fact exploration (table selector + fact cards + visual explainer)
2. **Practice tab**: Works as before
3. **Progress tab** (renamed from Tree):
   - Shows tree scene by default
   - "Stats" button in header opens bottom sheet
   - Bottom sheet shows MasteryGrid and ActivityCalendar
   - Clicking a fact in MasteryGrid opens FactDetailSheet
   - All animations work smoothly

**Step 2: Build verification**

Run: `bun run build`
Expected: Production build succeeds with no errors

**Step 3: Lint check**

Run: `bun run lint`
Expected: No new lint errors

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: final polish for progress tab consolidation"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/progress/StatsSheet.tsx` | NEW - Bottom sheet with MasteryGrid + ActivityCalendar |
| `src/components/progress/index.ts` | Export StatsSheet |
| `src/components/progress/ProgressView.tsx` | Add Stats button + StatsSheet |
| `src/views/LearnView.tsx` | Remove Progress tab, simplify to fact exploration only |
| `src/components/common/Navigation.tsx` | Rename "Tree" → "Progress" |

**Result:**
- Learn tab: Pure education (fact exploration + visual explanations)
- Practice tab: Unchanged
- Progress tab: Tree visualization (default) + Stats button → detailed analytics
