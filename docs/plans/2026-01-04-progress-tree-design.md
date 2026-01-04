# Progress Tree: Replacing the Garden

## Overview

Replace the current garden feature (draggable icons on a canvas) with a progressive reveal illustration that connects learning achievements to visual progress. The core insight: **the learner triggers the reveal**, creating a direct connection between their effort and the visual change.

## Core Concept: "The Learning Tree"

A cozy treehouse illustration in a meadow that transforms as the learner masters times tables:

- **Starts**: Grayscale silhouette at dawn, empty of life
- **Progresses**: Colorizes and brightens with each mastered fact
- **Completes**: Vibrant golden-hour scene with 12 woodland friends

## Progress Layers

| Layer | Trigger | Visual Effect |
|-------|---------|---------------|
| Scene reveal | Each fact mastered (1-144) | ~0.7% more color/brightness per fact |
| Time of day | Tier thresholds (36, 72, 108, 144) | Sky/lighting shifts through day |
| Characters | Complete a table (all 12 facts) | Woodland creature appears |
| Finale | 144/144 mastered | Gentle animation loop, shimmer |

### Tier Transitions

| Tier | Facts | Time of Day | Mood |
|------|-------|-------------|------|
| 0 | 0-35 | Dawn | Cool, misty, silhouette |
| 1 | 36-71 | Morning | Warming, details emerging |
| 2 | 72-107 | Afternoon | Bright, colorful, alive |
| 3 | 108-143 | Late afternoon | Rich, warm, nearly complete |
| 4 | 144 | Golden hour | Full glory, animated |

### The 12 Table Characters

When all 12 facts for a table reach "mastered" status:

| Table | Character | Location in Scene |
|-------|-----------|-------------------|
| ×1 | Ladybug | On a leaf |
| ×2 | Butterfly | Near flowers |
| ×3 | Robin | Tree branch |
| ×4 | Squirrel | Treehouse ladder |
| ×5 | Rabbit | Meadow grass |
| ×6 | Fox | Behind a bush |
| ×7 | Owl | Treehouse window |
| ×8 | Deer | Edge of clearing |
| ×9 | Hedgehog | Base of tree |
| ×10 | Bluebird | In flight |
| ×11 | Badger | Near a log |
| ×12 | Wise old cat | On treehouse roof |

## The Reveal Flow

### Key Principle

Progress is **not automatic**. The scene only changes when the learner visits and activates the reveal. This creates the dopamine loop:

**Practice → Achieve → Visit tree → Activate reveal → See impact**

### UI Layout

```
┌─────────────────────────────────────┐
│  ← Back              72/144 ★       │
├─────────────────────────────────────┤
│                                     │
│         [TREEHOUSE SCENE]           │
│         (current revealed state)    │
│                                     │
│      ┌─────────────────────────┐    │
│      │  ✨ New progress!       │    │  (only if pending)
│      │     [Show me!]          │    │
│      └─────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🐞 🦋 🐦 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡      │
│  "3 of 12 friends discovered"       │
└─────────────────────────────────────┘
```

### Reveal Sequence

When user taps "Show me!":

1. **Fact progress reveals first**
   - Scene colorizes/brightens
   - Text: "You've mastered 12 more facts!"
   - Tap to continue

2. **Character reveals (if any)**
   - Character animates in with spring physics
   - Sparkle/pop particle effect
   - Warm musical chime
   - Text: "Owl joined your tree! You've mastered your 7s!"
   - Tap to continue

3. **Tier transition (if threshold crossed)**
   - Sky color transitions over ~2 seconds
   - Ambient sound (birds, breeze)
   - Text: "The afternoon sun warms your meadow!"
   - Tap to continue

4. **Final state**
   - Scene reflects all progress
   - User can tap characters to replay their reveal

### Full Mastery Celebration

At 144/144:
- All 12 characters animate (wave, bounce, fly)
- Scene gets subtle shimmer/glow
- Richer celebratory sound
- Confetti across screen
- Text: "You've mastered all your times tables!"
- Future: "Choose a new scene to grow"

## Technical Implementation

### Image Assets

```
/public/progress-tree/
  scene.svg              # Full-color final scene
  characters/
    01-ladybug.svg
    02-butterfly.svg
    03-robin.svg
    04-squirrel.svg
    05-rabbit.svg
    06-fox.svg
    07-owl.svg
    08-deer.svg
    09-hedgehog.svg
    10-bluebird.svg
    11-badger.svg
    12-cat.svg
```

### CSS-Based Reveal

The scene uses CSS filters based on progress:

```tsx
const progress = revealedFacts / 144  // 0 to 1

const filters = {
  grayscale: 1 - progress,           // 1 → 0
  brightness: 0.6 + (progress * 0.4), // 0.6 → 1.0
  sepia: progress * 0.15,            // 0 → 0.15 (warmth)
}

// Tier-based sky hue shift could use additional overlay
```

### Character Animation

```tsx
// Framer Motion spring animation
const characterVariants = {
  hidden: { opacity: 0, scale: 0, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", bounce: 0.5 }
  }
}
```

### Data Model

**New store** (`progressViewStore.ts`):

```ts
type ProgressViewState = {
  lastRevealedFactCount: number     // Facts already shown in scene
  revealedTables: number[]          // Tables whose characters are visible
  lastRevealedTier: 0 | 1 | 2 | 3 | 4
}

type ProgressViewActions = {
  getPendingReveals: () => PendingReveals
  markRevealed: (facts: number, tables: number[], tier: number) => void
}

type PendingReveals = {
  newFacts: number                  // Count of facts to reveal
  newTables: number[]               // Table numbers to reveal
  newTier: number | null            // New tier if crossed
}
```

**Deriving pending reveals**:

```ts
const getPendingReveals = () => {
  const currentMastered = countMasteredFacts()
  const completedTables = getTablesFullyMastered()
  const currentTier = Math.floor(currentMastered / 36)

  return {
    newFacts: currentMastered - lastRevealedFactCount,
    newTables: completedTables.filter(t => !revealedTables.includes(t)),
    newTier: currentTier > lastRevealedTier ? currentTier : null,
  }
}
```

## Files to Change

### Delete
- `src/components/garden/GardenItem.tsx`
- `src/components/garden/ShopModal.tsx`
- `src/components/garden/ThemePicker.tsx`
- `src/stores/gardenStore.ts`

### Rename/Replace
- `src/components/garden/GardenView.tsx` → `src/components/progress/ProgressView.tsx`
- `src/views/GardenViewPage.tsx` → `src/views/ProgressViewPage.tsx`

### Create
- `src/stores/progressViewStore.ts`
- `src/components/progress/ProgressScene.tsx` (the illustration)
- `src/components/progress/CharacterReveal.tsx` (character animation)
- `src/components/progress/RevealModal.tsx` (the reveal sequence UI)
- `src/components/progress/CharacterBar.tsx` (bottom bar with icons)

### Modify
- `src/components/common/Navigation.tsx` - rename "Garden" to "Progress" or "Your Tree"
- `src/stores/index.ts` - export new store, remove garden store
- `src/types/index.ts` - remove garden types, add progress view types

## Migration

Existing users with garden items/coins: data is ignored. Their fact mastery (in `progressStore`) carries over unchanged. On first visit to the new Progress view, they'll have pending reveals waiting.

## Future Extensibility

- **Multiple scenes**: Once mastered, unlock new scenes to "grow" again
- **Scene picker**: Let users choose their preferred illustration style
- **Seasonal variants**: Holiday-themed scenes
- **Harder modes**: Same scene, but with timed challenges or extended facts (13+)

## Art Requirements

Need to commission or source:
1. One cozy treehouse illustration (SVG preferred for scaling)
2. 12 woodland character illustrations (separate SVGs for animation)

Style: Children's book illustration, warm and inviting, not babyish. Think Studio Ghibli meets Richard Scarry.
