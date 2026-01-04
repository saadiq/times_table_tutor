# Garden Features Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the garden reward system with shop UI, theme unlocking, mastery rewards integration, and celebration animations.

**Architecture:** Add a ShopModal component for purchasing decorations with coins, a ThemePicker for unlocking/switching themes, wire mastery rewards to progress tracking, and integrate the existing Celebration component into practice flow.

**Tech Stack:** React 19, TypeScript, Zustand, Framer Motion, Lucide React, Tailwind CSS v4

---

## Overview

The garden feature is ~75% complete. Missing pieces:
1. **Shop UI** - Purchase decorations with coins
2. **Theme Picker** - Unlock and switch garden themes
3. **Mastery Rewards** - Wire `getMasteryReward()` to progress tracking
4. **Celebration Integration** - Use existing `Celebration.tsx` in practice flow

---

## Task 1: Add Theme Costs to Constants

**Files:**
- Modify: `src/lib/constants.ts`

**Step 1: Add theme unlock costs**

Add after the `GARDEN_ITEMS` export:

```typescript
export const THEME_COSTS: Record<string, number> = {
  flower: 0,      // Default, always unlocked
  forest: 50,
  underwater: 100,
  space: 200,
}
```

**Step 2: Verify the file still exports correctly**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat(garden): add theme unlock costs"
```

---

## Task 2: Create ShopModal Component

**Files:**
- Create: `src/components/garden/ShopModal.tsx`
- Modify: `src/components/garden/index.ts`

**Step 1: Create the ShopModal component**

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, ShoppingBag, Sparkles } from 'lucide-react'
import { useGardenStore } from '../../stores'
import { getPurchasableItems } from '../../lib/rewards'
import { GARDEN_ITEMS } from '../../lib/constants'
import { Button } from '../common'

type ShopModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const { coins, spendCoins, addItem } = useGardenStore()

  const allDecorations = Object.entries(GARDEN_ITEMS)
    .filter(([, item]) => item.cost > 0)
    .map(([itemId, item]) => ({
      itemId,
      ...item,
      canAfford: coins >= item.cost,
    }))

  const handlePurchase = (itemId: string, cost: number, type: 'decoration') => {
    if (spendCoins(cost)) {
      addItem({
        type,
        itemId,
        position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
        earnedFor: 'shop_purchase',
      })
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-purple-500" />
                <h2 className="font-semibold text-gray-800">Garden Shop</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-warm-600">
                  <Coins size={16} />
                  <span className="font-medium">{coins}</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Items grid */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-3">
                {allDecorations.map((item) => (
                  <motion.div
                    key={item.itemId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-xl border-2 ${
                      item.canAfford
                        ? 'border-purple-200 bg-purple-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Sparkles
                        size={32}
                        className={item.canAfford ? 'text-purple-500' : 'text-gray-400'}
                      />
                      <span className="text-sm font-medium text-gray-700 mt-2">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-warm-600 mt-1">
                        <Coins size={14} />
                        <span>{item.cost}</span>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => handlePurchase(item.itemId, item.cost, 'decoration')}
                        disabled={!item.canAfford}
                        className="mt-2 text-xs py-1 px-3"
                      >
                        {item.canAfford ? 'Buy' : 'Need more'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {allDecorations.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No items available for purchase.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Export from index**

Update `src/components/garden/index.ts`:

```typescript
export { GardenView } from './GardenView'
export { GardenItem } from './GardenItem'
export { ShopModal } from './ShopModal'
```

**Step 3: Verify compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/garden/ShopModal.tsx src/components/garden/index.ts
git commit -m "feat(garden): add ShopModal for purchasing decorations"
```

---

## Task 3: Create ThemePicker Component

**Files:**
- Create: `src/components/garden/ThemePicker.tsx`
- Modify: `src/components/garden/index.ts`

**Step 1: Create the ThemePicker component**

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette, Lock, Check, Coins } from 'lucide-react'
import { useGardenStore } from '../../stores'
import { THEME_COSTS } from '../../lib/constants'
import { Button } from '../common'
import type { GardenTheme } from '../../types'

type ThemePickerProps = {
  isOpen: boolean
  onClose: () => void
}

const themeInfo: Record<GardenTheme, { name: string; description: string; colors: string }> = {
  flower: {
    name: 'Flower Garden',
    description: 'A sunny meadow with colorful blooms',
    colors: 'bg-gradient-to-r from-pink-200 via-green-100 to-sky-200',
  },
  forest: {
    name: 'Enchanted Forest',
    description: 'A mystical woodland setting',
    colors: 'bg-gradient-to-r from-green-300 via-green-200 to-emerald-200',
  },
  underwater: {
    name: 'Ocean Floor',
    description: 'A peaceful underwater scene',
    colors: 'bg-gradient-to-r from-blue-300 via-cyan-200 to-teal-200',
  },
  space: {
    name: 'Space Station',
    description: 'A garden among the stars',
    colors: 'bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-300',
  },
}

export function ThemePicker({ isOpen, onClose }: ThemePickerProps) {
  const { coins, currentTheme, unlockedThemes, setTheme, unlockTheme, spendCoins } = useGardenStore()
  const themes: GardenTheme[] = ['flower', 'forest', 'underwater', 'space']

  const handleThemeSelect = (theme: GardenTheme) => {
    if (unlockedThemes.includes(theme)) {
      setTheme(theme)
      onClose()
    }
  }

  const handleUnlock = (theme: GardenTheme) => {
    const cost = THEME_COSTS[theme]
    if (spendCoins(cost)) {
      unlockTheme(theme)
      setTheme(theme)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-garden-500" />
                <h2 className="font-semibold text-gray-800">Garden Themes</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-warm-600">
                  <Coins size={16} />
                  <span className="font-medium">{coins}</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Theme list */}
            <div className="p-4 space-y-3">
              {themes.map((theme) => {
                const info = themeInfo[theme]
                const isUnlocked = unlockedThemes.includes(theme)
                const isCurrent = currentTheme === theme
                const cost = THEME_COSTS[theme]
                const canAfford = coins >= cost

                return (
                  <motion.div
                    key={theme}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`p-3 rounded-xl border-2 ${
                      isCurrent
                        ? 'border-garden-400 bg-garden-50'
                        : isUnlocked
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Theme preview */}
                      <div className={`w-12 h-12 rounded-lg ${info.colors}`} />

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{info.name}</span>
                          {isCurrent && (
                            <Check size={16} className="text-garden-500" />
                          )}
                          {!isUnlocked && (
                            <Lock size={14} className="text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{info.description}</p>
                      </div>

                      {/* Action */}
                      {isCurrent ? (
                        <span className="text-xs text-garden-600 font-medium">Active</span>
                      ) : isUnlocked ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleThemeSelect(theme)}
                          className="text-xs py-1 px-3"
                        >
                          Select
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => handleUnlock(theme)}
                          disabled={!canAfford}
                          className="text-xs py-1 px-3 flex items-center gap-1"
                        >
                          <Coins size={12} />
                          {cost}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Export from index**

Update `src/components/garden/index.ts`:

```typescript
export { GardenView } from './GardenView'
export { GardenItem } from './GardenItem'
export { ShopModal } from './ShopModal'
export { ThemePicker } from './ThemePicker'
```

**Step 3: Verify compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/garden/ThemePicker.tsx src/components/garden/index.ts
git commit -m "feat(garden): add ThemePicker for unlocking and switching themes"
```

---

## Task 4: Add Shop and Theme Buttons to GardenView

**Files:**
- Modify: `src/components/garden/GardenView.tsx`

**Step 1: Add state and imports for modals**

Update the imports and add modal state:

```typescript
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Coins, Palette, ShoppingBag } from 'lucide-react'
import { useGardenStore } from '../../stores'
import { GardenItem } from './GardenItem'
import { ShopModal } from './ShopModal'
import { ThemePicker } from './ThemePicker'
```

**Step 2: Add modal state inside the component**

After the `useGardenStore` hook:

```typescript
const [showShop, setShowShop] = useState(false)
const [showThemes, setShowThemes] = useState(false)
```

**Step 3: Update the header with clickable buttons**

Replace the header section:

```typescript
{/* Header */}
<div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
  <button
    onClick={() => setShowShop(true)}
    className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
  >
    <Coins size={20} className="text-warm-500" />
    <span className="font-semibold text-gray-800">{coins}</span>
    <ShoppingBag size={16} className="text-gray-400" />
  </button>
  <button
    onClick={() => setShowThemes(true)}
    className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
  >
    <Palette size={18} />
    <span className="text-sm capitalize">{currentTheme} Garden</span>
  </button>
</div>
```

**Step 4: Add modals at the end of the component, before the closing div**

```typescript
      {/* Modals */}
      <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />
      <ThemePicker isOpen={showThemes} onClose={() => setShowThemes(false)} />
    </div>
  )
}
```

**Step 5: Verify compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/garden/GardenView.tsx
git commit -m "feat(garden): integrate shop and theme picker into GardenView"
```

---

## Task 5: Wire Mastery Rewards to Progress Store

**Files:**
- Modify: `src/stores/progressStore.ts`

**Step 1: Import garden store and rewards**

Add to imports:

```typescript
import { useGardenStore } from './gardenStore'
import { getMasteryReward } from '../lib/rewards'
import { REWARDS } from '../lib/constants'
```

**Step 2: Add mastery check function**

Add this helper function after `calculateConfidence`:

```typescript
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
```

**Step 3: Update recordAttempt to check for mastery**

In the `recordAttempt` function, after `saveToStorage('progress', facts)` and before `return { facts }`:

```typescript
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
    position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
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
    position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
    earnedFor: `mastered_${tableB}x`,
  })
}
```

**Step 4: Add helper to get mastered tables from facts object**

Add this function after `checkTableMastery`:

```typescript
function getMasteredTablesFromFacts(facts: Record<string, FactProgress>): number[] {
  const mastered: number[] = []
  for (let table = TIMES_TABLES.min; table <= TIMES_TABLES.max; table++) {
    if (checkTableMastery(facts, table)) {
      mastered.push(table)
    }
  }
  return mastered
}
```

**Step 5: Verify compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/stores/progressStore.ts
git commit -m "feat(garden): wire mastery rewards to progress tracking"
```

---

## Task 6: Integrate Celebration Component into PracticeView

**Files:**
- Modify: `src/views/PracticeView.tsx`

**Step 1: Import Celebration component**

Add to imports:

```typescript
import { Celebration } from '../components/common'
```

**Step 2: Add celebration state**

After the existing state declarations, add:

```typescript
const [celebrationType, setCelebrationType] = useState<'correct' | 'streak' | 'goal' | null>(null)
```

**Step 3: Update handleAnswer to trigger celebrations**

Replace the success handling block (inside `if (isCorrect)`) with celebration triggers:

```typescript
if (isCorrect) {
  incrementStreak()
  incrementProgress()

  const reward = calculateReward(streakCount + 1, progress, goal)
  addCoins(reward.coins)

  if (reward.item) {
    addItem({
      type: reward.item.type,
      itemId: reward.item.itemId,
      position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      earnedFor: `practice_${currentFact.fact}`,
    })
  }

  setMessage(reward.bonusMessage || getCelebrationMessage(streakCount + 1))

  // Trigger celebration animation
  if (progress + 1 >= goal) {
    setCelebrationType('goal')
  } else if ((streakCount + 1) % 5 === 0) {
    setCelebrationType('streak')
  } else {
    setCelebrationType('correct')
  }

  // Clear celebration and auto-advance
  setTimeout(() => {
    setCelebrationType(null)
    if (!isGoalComplete()) {
      nextProblem()
    }
  }, 1200)
} else {
  // ... existing else block unchanged
}
```

**Step 4: Add Celebration component to the render**

Add right after the opening `<div className="flex-1 flex flex-col p-4">`:

```typescript
<Celebration show={celebrationType !== null} type={celebrationType || 'correct'} />
```

**Step 5: Verify compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/views/PracticeView.tsx
git commit -m "feat(practice): integrate celebration animations on correct answers"
```

---

## Task 7: Export Celebration from Common Index

**Files:**
- Modify: `src/components/common/index.ts`

**Step 1: Check current exports and add Celebration**

Read the current file, then add if not present:

```typescript
export { Celebration } from './Celebration'
```

**Step 2: Verify compilation**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/common/index.ts
git commit -m "feat(common): export Celebration component"
```

---

## Task 8: Build and Manual Test

**Files:**
- None (testing only)

**Step 1: Run full build**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 2: Run lint**

Run: `bun run lint`
Expected: No errors or warnings

**Step 3: Test in browser**

Run: `bun run dev`

Manual test checklist:
- [ ] Practice: Correct answers show sparkle celebration
- [ ] Practice: 5-streak shows larger celebration
- [ ] Practice: Goal complete shows star celebration
- [ ] Garden: Tap coins to open shop
- [ ] Garden: Can purchase decorations when affordable
- [ ] Garden: Items appear after purchase
- [ ] Garden: Tap theme name to open theme picker
- [ ] Garden: Can switch between unlocked themes
- [ ] Garden: Can unlock themes with coins

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues from manual testing"
```

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Constants | Add theme costs |
| 2 | ShopModal | Purchase decorations UI |
| 3 | ThemePicker | Theme unlock/switch UI |
| 4 | GardenView | Integrate shop + themes |
| 5 | progressStore | Mastery rewards wiring |
| 6 | PracticeView | Celebration integration |
| 7 | Common index | Export Celebration |
| 8 | Testing | Build and manual verification |
