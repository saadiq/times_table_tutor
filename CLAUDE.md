# Times Table Tutor

A calm, anxiety-free web app for learning times tables through adaptive practice and a progressive scene reveal reward system.

## Backend Development

The app uses Cloudflare Pages Functions with D1 database for user profiles and cloud sync.

### Deployment

Before deploying to production:
1. Create D1 database: `bunx wrangler d1 create ttt-db`
2. Update `database_id` in `wrangler.toml` with the real ID
3. Run production migrations: `bun run db:migrate`

`db:migrate` replays `schema.sql`, which is all `CREATE TABLE IF NOT EXISTS` — it
adds missing tables but never alters an existing one. Column changes live in
`migrations/*.sql` and must be applied once each, by hand, before the Functions
that read the new column ship: `bun run db:migrate:file migrations/000X_....sql`.

## Key Concepts

### Three Modes + Settings
1. **Learn** - Visual introduction to facts (no wrong answers)
2. **Practice** - Adaptive problems with hints on mistakes
3. **Progress** - Scene reveal reward system with stats
4. **Settings** - Focus table selection (bottom nav)

### Scene Reveal Reward System (`src/components/progress/`)
- p5.js canvas renders a tree scene that evolves as you master facts
- **4 tiers** based on facts learned (0-36-72-108-144): dawn → morning → afternoon → golden hour
- **Progressive elements**: grass (facts 1-50), flowers (51-90), leaves (91-144)
- **12 animal characters** unlock when you master each times table (1-12)
- Interactive reveal sequences with sparkle animations

### Adaptive Learning (`src/lib/adaptive.ts`)
- Tracks each of 144 facts (1x1 through 12x12) individually
- Confidence levels: `new` → `learning` → `confident` → `mastered`
- Prioritizes: learning facts > trouble spots > spaced review > new facts
- Multiple choice for new facts, number pad for confident facts
- Supports focus tables filter (Settings → select specific tables to practice)
- Allows one skip per goal block; `pendingComeback` and `decideNextProblem` guarantee the skipped fact returns in the same block, while `skippedCount` separately boosts its adaptive priority
- Confident/mastered progress requires unaided number-pad answers; attempts after `hintShown` count toward learning only
- Correct answers can queue the commuted fact as the next problem

### Operation Abstraction (`src/lib/operations/`)
- An `Operation` descriptor holds everything curriculum-specific: fact generation, problem formatting, answer choices, strategies, speech
- UI components resolve the active operation via `useActiveOperation()` — the seam where the division curriculum plugs in
- The engine (`adaptive.ts`, confidence logic, stores) stays operation-agnostic

### Strategy Hints (`src/lib/strategies.ts`)
Eleven strategies: visual_array, skip_counting, break_apart, use_neighbor, nines_trick, fives_trick, doubles, tens_trick, ones_zeros, fact_family (flip it), known_anchor (derived-fact chains). Hints personalize against confident/mastered facts via `makeKnownFacts`.

### State Stores
- **progressStore**: All 144 fact confidence levels, persisted to localStorage
- **progressViewStore**: Scene reveal state (revealed facts, unlocked characters, tier level)
- **gardenStore**: (legacy) Coins, garden items, themes
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
- **No emojis** - use Lucide React icons
