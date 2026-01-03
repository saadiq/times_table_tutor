# Times Table Tutor - Design Document

## Overview

A calm, playful web app where a 9-year-old can learn times tables at her own pace by growing a magical garden. No timers, no pressure - just encouragement and smart hints when stuck.

**Key Design Principles:**
- No time pressure (anxiety-free learning)
- ADHD-friendly: frequent small wins, clear goals, dopamine-positive feedback
- Adaptive learning that focuses on trouble spots
- Multiple strategies to help understand, not just memorize
- Mobile-first, works offline as PWA

---

## Core Experience

### Three Modes

1. **Learn Mode** - Visual introduction to new facts. Shows *why* multiplication works using arrays, groups, and animations. No wrong answers - pure exploration.

2. **Practice Mode** - The main experience. Problems appear one at a time. Multiple choice when learning a fact, typing when more confident. Wrong answers trigger helpful strategies. Right answers grow the garden.

3. **Garden Mode** - View and enjoy the garden she's built. Each mastered times table adds new elements. A peaceful space to see progress.

### Session Flow

- App suggests a small goal: "Let's add 3 flowers to your garden today!"
- She works through problems at her pace
- Celebrates each correct answer with satisfying animations
- When goal is reached: "You did it! Keep going or take a break?"
- Progress saves automatically

### No Pressure Philosophy

- No timers anywhere
- Wrong answers are reframed as "let me show you a trick"
- She can skip any problem
- Can revisit Learn Mode anytime for any fact

---

## Learning System

### Adaptive Learning Engine

The app tracks every fact (e.g., 7x8) separately with:
- **Confidence level** - new / learning / confident / mastered
- **Recent accuracy** - Last 5 attempts
- **Time since last seen** - Spaced repetition brings back facts before she forgets

Problems are selected to prioritize:
1. Facts she's currently learning (just introduced)
2. Trouble spots (frequently missed)
3. Review of mastered facts (spaced repetition)
4. New facts when she's ready

### Strategy Hints

When she answers wrong or asks for help, tailored strategies appear:

| Strategy | Example (7x8) |
|----------|---------------|
| **Break apart** | "7x8 = 7x4 + 7x4 = 28 + 28 = 56" |
| **Use a neighbor** | "You know 7x7=49, so add one more 7" |
| **Tens trick** | "10x8=80, subtract 3x8=24, so 56" |
| **Skip counting** | "Count by 7s: 7, 14, 21, 28, 35, 42, 49, 56" |
| **Visual array** | Shows 7 rows of 8 dots, groups them |
| **Doubles** | For facts like 6x6, 7x7, 8x8 |
| **Nines trick** | 9x7: fingers trick, or "10x7 minus 7" |

The app remembers which strategies help most and leads with those.

### Graduating Facts

- "learning" to "confident": 3 correct in a row
- "confident" to "mastered": correct across multiple sessions
- Mastered facts still appear occasionally for reinforcement

---

## Progression & Rewards (The Garden)

### What She Earns

| Achievement | Reward |
|-------------|--------|
| Correct answer | Coins (small currency) |
| Complete a goal | New plant/decoration to place |
| Master a times table | Special landmark (fountain, treehouse, pond) |
| Streak of correct answers | Bonus sparkle effects on garden |
| Return after a day away | Garden "greets" her |

### Garden Interaction

- After earning an item, she places it where she wants
- Can rearrange anytime in Garden Mode
- Garden grows from a small plot to a full landscape
- Unlockable themes: flower garden, enchanted forest, underwater, space garden

### Celebrating Without Pressure

- Correct answer: Quick satisfying animation + sound (confetti, sparkle, chime)
- Wrong answer: Gentle acknowledgment + strategy help (no negative sounds/visuals)
- Completing a goal: Bigger celebration, new item unlocks
- Mastering a table: Special moment with fanfare

---

## UI/UX Design

### Visual Style

- Warm, inviting color palette (soft greens, warm yellows, gentle blues)
- Rounded, friendly shapes - nothing sharp or harsh
- Playful illustrated style
- Clean problem area with colorful surroundings
- **No emojis** - use Lucide React icons throughout

### Mobile-First Layout

**Phone (portrait):**
```
+----------------+
| Garden  Goal   |
+----------------+
|                |
|    7 x 8       |
|                |
|  [56]   [48]   |
|  [54]   [63]   |
|                |
|   Hint button  |
+----------------+
| Learn Practice |
|     Garden     |
+----------------+
```

**Tablet/Desktop:**
- Garden preview visible alongside practice area
- More horizontal layout

### ADHD-Friendly Design

- One problem at a time (no visual overwhelm)
- Current goal always visible (clear target)
- Large tap targets (min 48px, mobile-friendly)
- Minimal text, visual communication where possible
- Immediate visual feedback

### Accessibility

- Touch-friendly with large tap targets
- Works on phones, tablets, and desktop
- Portrait-optimized for phone use
- No hover states required
- PWA: installable, works offline

---

## Technical Architecture

### Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime/Package Manager | Bun |
| Build Tool | Vite |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| State Management | Zustand |
| Storage | LocalStorage + IndexedDB |
| PWA | Vite PWA plugin |

### Project Structure

```
src/
├── components/
│   ├── common/          # Buttons, modals, progress bars
│   ├── practice/        # Problem display, answer input, hints
│   ├── learn/           # Visual explanations, animations
│   └── garden/          # Garden view, items, placement
├── hooks/               # useProgress, useAdaptive, useRewards
├── lib/
│   ├── adaptive.ts      # Learning algorithm, fact selection
│   ├── strategies.ts    # Hint strategies per problem type
│   └── storage.ts       # Persistence layer
├── stores/
│   ├── progressStore.ts # Tracks all fact confidence levels
│   ├── gardenStore.ts   # Garden items and layout
│   └── sessionStore.ts  # Current session state
├── assets/              # Garden items, sounds, images
└── App.tsx
```

### Key Technical Decisions

- **No backend** - All data in browser storage (can add cloud sync later)
- **PWA** - Installable, works offline, feels native
- **Zustand** - Lightweight state management, less boilerplate than Redux
- **Framer Motion** - Smooth celebratory animations

---

## Data Model

### Fact Progress

```typescript
type FactProgress = {
  fact: string              // "7x8"
  confidence: 'new' | 'learning' | 'confident' | 'mastered'
  correctCount: number
  incorrectCount: number
  lastSeen: Date
  lastCorrect: Date | null
  recentAttempts: boolean[] // Last 5 attempts
  preferredStrategy: string | null
}
```

### Garden State

```typescript
type GardenItem = {
  id: string
  type: 'flower' | 'tree' | 'decoration' | 'landmark'
  itemId: string            // "sunflower", "oak_tree", "fountain"
  position: { x: number, y: number }
  earnedFor: string         // "mastered_6x" or "goal_complete"
  earnedAt: Date
}

type GardenState = {
  items: GardenItem[]
  coins: number
  unlockedThemes: string[]
  currentTheme: string
}
```

### Session State

```typescript
type Session = {
  goal: number              // Target correct answers
  progress: number          // Current correct count
  currentFact: string | null
  mode: 'learn' | 'practice' | 'garden'
}
```

---

## Implementation Notes

- Use **frontend-design** skill when building UI components
- Mobile-first responsive approach
- Focus on smooth, delightful animations for feedback
- Ensure all interactions work with touch
