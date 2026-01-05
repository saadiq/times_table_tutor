# Times Table Tutor

A calm, anxiety-free web app for learning times tables through adaptive practice and a progressive scene reveal reward system.

**[Try it live](https://times-table-tutor.pages.dev)**

## Why This Exists

Most math practice apps create anxiety with timers, leaderboards, and pressure. Times Table Tutor takes a different approach—designed to be ADHD-friendly with frequent small wins, clear goals, and positive feedback. Wrong answers aren't failures; they're learning opportunities that reveal helpful strategies.

## Features

- **Adaptive Learning** — Tracks all 144 facts (1×1 through 12×12) individually. Prioritizes facts you're learning, revisits trouble spots, and uses spaced repetition for mastered facts.

- **Strategy Hints** — When you miss a problem, get helpful strategies like visual arrays, skip counting, the nines trick, or breaking apart numbers.

- **Multiple Input Modes** — New facts use multiple choice to build recognition. Confident facts switch to a number pad for recall practice.

- **Focus Tables** — Choose specific times tables to practice (e.g., just 7s and 8s) or work on all of them.

- **Scene Reveal Rewards** — Watch a meadow scene come to life as you learn. Grass, flowers, and leaves appear progressively. Master each times table to unlock one of 12 animal friends. The sky shifts from dawn to golden hour as you approach full mastery.

- **Cloud Sync** — Create profiles for multiple learners and sync progress across devices.

- **Works Offline** — Full PWA support. Practice anywhere, even without internet.

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS v4
- Zustand (state management)
- Framer Motion (animations)
- Vite 7 + vite-plugin-pwa
- Cloudflare Pages + D1 (backend)

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Start API server (separate terminal)
bun run dev:api

# Build for production
bun run build

# Run linting
bun run lint
```

## License

MIT
