# Times Table Tutor

A calm, anxiety-free web app for learning times tables through practice and a garden reward system.

## Quick Start

```bash
bun install
bun run dev      # Start dev server
bun run build    # Build for production
bun run lint     # Run ESLint
```

## Tech Stack

- **Runtime/Package Manager**: Bun
- **Build Tool**: Vite 7
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/index.css`)
- **Animations**: Framer Motion
- **Icons**: Lucide React (no emojis)
- **State**: Zustand with localStorage persistence
- **PWA**: vite-plugin-pwa

## Project Structure

```
src/
├── components/
│   ├── common/       # Button, Modal, ProgressBar, Navigation, Layout, Celebration, SettingsModal, FocusTablePicker
│   ├── practice/     # ProblemDisplay, AnswerInput, HintPanel, MultipleChoice, NumberPad
│   ├── learn/        # FactCard, VisualExplainer
│   └── garden/       # GardenItem, GardenView
├── views/            # PracticeView, LearnView, GardenViewPage
├── stores/           # Zustand stores (progress, garden, session, focusTables)
├── lib/              # Core logic (adaptive, strategies, rewards, sounds, storage)
├── hooks/            # useSound
└── types/            # TypeScript types
```

## Key Concepts

### Three Modes + Settings
1. **Learn** - Visual introduction to facts (no wrong answers)
2. **Practice** - Adaptive problems with hints on mistakes
3. **Garden** - View earned rewards, place items
4. **Settings** - Focus table selection (bottom nav)

### Adaptive Learning (`src/lib/adaptive.ts`)
- Tracks each of 144 facts (1x1 through 12x12) individually
- Confidence levels: `new` → `learning` → `confident` → `mastered`
- Prioritizes: learning facts > trouble spots > spaced review > new facts
- Multiple choice for new facts, number pad for confident facts
- Supports focus tables filter (Settings → select specific tables to practice)

### Strategy Hints (`src/lib/strategies.ts`)
Nine strategies: visual_array, skip_counting, break_apart, use_neighbor, nines_trick, fives_trick, doubles, tens_trick, ones_zeros

### State Stores
- **progressStore**: All 144 fact confidence levels, persisted to localStorage
- **gardenStore**: Coins, garden items, themes
- **sessionStore**: Current goal, progress, streak, mode
- **focusTablesStore**: Which tables (1-12) to focus on, with enable/disable toggle

## Tailwind v4 Notes

Uses CSS-first configuration (not `tailwind.config.js`):

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-garden-500: #22c55e;
  --color-warm-500: #f59e0b;
}
```

Custom colors: `garden-*` (greens), `warm-*` (yellows), `sky-*` (blues)

## Design Principles

- **No timers** - Anxiety-free learning
- **ADHD-friendly** - Frequent small wins, clear goals, dopamine-positive feedback
- **Mobile-first** - Large tap targets (48px+), touch-friendly
- **Wrong answers** reframe as learning opportunities with strategy hints
