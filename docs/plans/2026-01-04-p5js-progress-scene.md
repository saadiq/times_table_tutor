# p5.js Progress Scene Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static image-based progress scene with a procedurally drawn p5.js nature scene that reveals elements as facts are learned.

**Architecture:** Use p5.js in instance mode with a custom React hook for lifecycle management. Scene elements (grass, flowers, leaves) appear progressively as facts are learned (0-144). Color spreads radially from tree center. 12 character animals unlock when their tables are mastered. Tier progression (0-4) shifts scene warmth toward golden hour.

**Tech Stack:** p5.js, React 19, TypeScript, Framer Motion (for sparkle effect only)

---

## Task 1: Install p5.js Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install p5.js and types**

Run:
```bash
bun add p5 @types/p5
```

**Step 2: Verify installation**

Run:
```bash
grep '"p5"' package.json
```
Expected: `"p5": "^1.x.x"` in dependencies

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add p5.js dependency for procedural scene"
```

---

## Task 2: Create Seeded Random Utility

**Files:**
- Create: `src/components/progress/p5/seededRandom.ts`

**Step 1: Create the seeded random module**

```typescript
/**
 * Mulberry32 PRNG - deterministic random for consistent scene layout
 */
export function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
```

**Step 2: Verify file created**

Run:
```bash
cat src/components/progress/p5/seededRandom.ts
```
Expected: File contents displayed

**Step 3: Commit**

```bash
git add src/components/progress/p5/seededRandom.ts
git commit -m "feat(p5): add seeded random utility for deterministic layouts"
```

---

## Task 3: Create Color Utilities

**Files:**
- Create: `src/components/progress/p5/colors.ts`

**Step 1: Create the color utilities module**

```typescript
import type p5 from 'p5'

export type HSBColor = { h: number; s: number; b: number }

/**
 * Color palette matching app theme (HSB: 360, 100, 100)
 */
export const PALETTE = {
  sky: [
    { h: 220, s: 40, b: 85 }, // Tier 0: Dawn
    { h: 210, s: 55, b: 90 }, // Tier 1: Morning
    { h: 200, s: 60, b: 95 }, // Tier 2: Day
    { h: 45, s: 55, b: 95 }, // Tier 3: Afternoon
    { h: 35, s: 65, b: 92 }, // Tier 4: Golden hour
  ],
  tree: {
    trunk: { h: 28, s: 55, b: 32 },
    canopy: { h: 115, s: 65, b: 45 },
  },
  grass: { h: 105, s: 65, b: 45 },
  flowers: [
    { h: 0, s: 80, b: 82 }, // Red
    { h: 45, s: 85, b: 88 }, // Orange
    { h: 280, s: 75, b: 80 }, // Purple
    { h: 330, s: 80, b: 85 }, // Pink
    { h: 55, s: 80, b: 88 }, // Yellow
  ],
  ground: { h: 100, s: 55, b: 50 },
}

/**
 * Calculate saturation based on distance from tree center.
 * Color spreads radially outward as colorProgress increases.
 */
export function getSaturation(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  canvasWidth: number,
  canvasHeight: number,
  colorProgress: number
): number {
  const dx = x - centerX
  const dy = y - centerY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxDist = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) * 0.5
  const normalized = dist / maxDist
  return Math.max(0, Math.min(100, (colorProgress * 1.8 - normalized) * 100))
}

/**
 * Shift hue toward warm (golden hour) based on tier.
 */
export function applyWarmth(hue: number, tier: number): number {
  const shift = tier * 8
  if (hue > 60 && hue < 300) return hue - shift
  return hue
}

/**
 * Helper to set fill color with saturation adjustment
 */
export function setFill(
  p: p5,
  color: HSBColor,
  saturationMultiplier: number,
  tier: number
): void {
  const h = applyWarmth(color.h, tier)
  const s = color.s * saturationMultiplier
  p.fill(h, s, color.b)
}
```

**Step 2: Verify file created**

Run:
```bash
wc -l src/components/progress/p5/colors.ts
```
Expected: ~70 lines

**Step 3: Commit**

```bash
git add src/components/progress/p5/colors.ts
git commit -m "feat(p5): add color utilities with radial spread and warmth"
```

---

## Task 4: Create Scene Types

**Files:**
- Create: `src/components/progress/p5/types.ts`

**Step 1: Create shared types**

```typescript
export type CanopyCircle = {
  x: number
  y: number
  r: number
}

export type TreeData = {
  x: number
  baseY: number
  trunkW: number
  trunkH: number
  canopy: CanopyCircle[]
}

export type GrassElement = {
  x: number
  y: number
  h: number
  revealIdx: number
  sway: number
}

export type FlowerElement = {
  x: number
  y: number
  size: number
  petals: number
  hue: number
  revealIdx: number
  sway: number
}

export type LeafElement = {
  x: number
  y: number
  size: number
  rotation: number
  hue: number
  revealIdx: number
  sway: number
}

export type CloudElement = {
  x: number
  y: number
  size: number
}

export type AnimalData = {
  x: number
  y: number
  type: AnimalType
  scale: number
}

export type AnimalType =
  | 'ladybug'
  | 'butterfly'
  | 'robin'
  | 'squirrel'
  | 'rabbit'
  | 'fox'
  | 'owl'
  | 'deer'
  | 'hedgehog'
  | 'bluebird'
  | 'badger'
  | 'cat'

export type SceneElements = {
  tree: TreeData
  grass: GrassElement[]
  flowers: FlowerElement[]
  leaves: LeafElement[]
  clouds: CloudElement[]
  animals: AnimalData[]
}

export type SketchParams = {
  revealedFacts: number
  revealedTables: number[]
  revealedTier: number
  animatingCharacter: number | null
  width: number
  height: number
}
```

**Step 2: Verify file created**

Run:
```bash
cat src/components/progress/p5/types.ts
```
Expected: Type definitions displayed

**Step 3: Commit**

```bash
git add src/components/progress/p5/types.ts
git commit -m "feat(p5): add scene element type definitions"
```

---

## Task 5: Create Element Drawing Functions

**Files:**
- Create: `src/components/progress/p5/elements.ts`

**Step 1: Create element drawing module**

```typescript
import type p5 from 'p5'
import type {
  TreeData,
  GrassElement,
  FlowerElement,
  LeafElement,
  CloudElement,
} from './types'
import { PALETTE, getSaturation, applyWarmth } from './colors'

type DrawContext = {
  p: p5
  colorProgress: number
  tier: number
  time: number
  centerX: number
  centerY: number
  width: number
  height: number
}

export function drawSky(ctx: DrawContext): void {
  const { p, colorProgress, tier, height, width } = ctx
  const skyColor = PALETTE.sky[tier]
  const skyHeight = height * 0.72

  for (let y = 0; y < skyHeight; y++) {
    const inter = y / skyHeight
    const bri = p.lerp(skyColor.b, skyColor.b - 15, inter)
    p.stroke(skyColor.h, skyColor.s * colorProgress, bri)
    p.line(0, y, width, y)
  }
  p.noStroke()
}

export function drawClouds(ctx: DrawContext, clouds: CloudElement[]): void {
  const { p } = ctx
  p.fill(0, 0, 98, 0.85)
  clouds.forEach((c) => {
    p.ellipse(c.x, c.y, c.size * 1.6, c.size)
    p.ellipse(c.x - c.size * 0.5, c.y + 8, c.size * 1.1, c.size * 0.8)
    p.ellipse(c.x + c.size * 0.5, c.y + 5, c.size * 1.2, c.size * 0.85)
  })
}

export function drawGround(ctx: DrawContext): void {
  const { p, colorProgress, tier, width, height, centerX, centerY } = ctx
  const hue = applyWarmth(PALETTE.ground.h, tier)
  const sat =
    getSaturation(width / 2, height, centerX, centerY, width, height, colorProgress) * 0.55

  // Gentle hill
  p.fill(hue, sat, 50)
  p.beginShape()
  p.vertex(0, height)
  p.vertex(0, height * 0.75)
  p.bezierVertex(width * 0.3, height * 0.7, width * 0.7, height * 0.72, width, height * 0.74)
  p.vertex(width, height)
  p.endShape(p.CLOSE)

  // Darker foreground
  p.fill(hue, sat * 0.9, 42)
  p.beginShape()
  p.vertex(0, height)
  p.vertex(0, height * 0.85)
  p.bezierVertex(width * 0.25, height * 0.82, width * 0.75, height * 0.84, width, height * 0.83)
  p.vertex(width, height)
  p.endShape(p.CLOSE)
}

export function drawTree(ctx: DrawContext, tree: TreeData): void {
  const { p, colorProgress, tier, centerX, centerY, width, height } = ctx
  const trunkHue = applyWarmth(PALETTE.tree.trunk.h, tier)
  const trunkSat =
    getSaturation(tree.x, tree.baseY, centerX, centerY, width, height, colorProgress) * 0.55
  const canopyHue = applyWarmth(PALETTE.tree.canopy.h, tier)
  const canopySat =
    getSaturation(tree.x, tree.baseY - 180, centerX, centerY, width, height, colorProgress) * 0.65

  // Canopy background (darker green mass)
  p.fill(canopyHue, canopySat * 0.8, 38)
  tree.canopy.forEach((c) => {
    p.ellipse(tree.x + c.x, tree.baseY + c.y, c.r * 2.1, c.r * 2)
  })

  // Trunk
  p.fill(trunkHue, trunkSat, 32)
  p.beginShape()
  p.vertex(tree.x - tree.trunkW / 2, tree.baseY)
  p.vertex(tree.x - tree.trunkW / 2.5, tree.baseY - tree.trunkH * 0.3)
  p.vertex(tree.x - tree.trunkW / 3, tree.baseY - tree.trunkH * 0.6)
  p.vertex(tree.x - tree.trunkW / 4, tree.baseY - tree.trunkH)
  p.vertex(tree.x + tree.trunkW / 4, tree.baseY - tree.trunkH)
  p.vertex(tree.x + tree.trunkW / 3, tree.baseY - tree.trunkH * 0.6)
  p.vertex(tree.x + tree.trunkW / 2.5, tree.baseY - tree.trunkH * 0.3)
  p.vertex(tree.x + tree.trunkW / 2, tree.baseY)
  p.endShape(p.CLOSE)

  // Branches
  p.fill(trunkHue, trunkSat, 28)
  p.push()
  p.translate(tree.x - 20, tree.baseY - tree.trunkH)
  p.rotate(-0.6)
  p.rect(-6, 0, 12, -70, 3)
  p.pop()

  p.push()
  p.translate(tree.x + 20, tree.baseY - tree.trunkH)
  p.rotate(0.5)
  p.rect(-6, 0, 12, -65, 3)
  p.pop()

  p.push()
  p.translate(tree.x, tree.baseY - tree.trunkH - 40)
  p.rotate(-0.15)
  p.rect(-5, 0, 10, -50, 3)
  p.pop()

  // Canopy mid-layer
  p.fill(canopyHue, canopySat, 45)
  tree.canopy.forEach((c) => {
    p.ellipse(tree.x + c.x, tree.baseY + c.y + 5, c.r * 1.85, c.r * 1.8)
  })
}

export function drawGrass(ctx: DrawContext, g: GrassElement): void {
  const { p, colorProgress, tier, time, centerX, centerY, width, height } = ctx
  const hue = applyWarmth(105 + ((g.sway * 10) % 20), tier)
  const sat = getSaturation(g.x, g.y, centerX, centerY, width, height, colorProgress) * 0.65
  const sway = Math.sin(time * 2.5 + g.sway) * 0.08

  p.fill(hue, sat, 45)
  p.push()
  p.translate(g.x, g.y)
  p.rotate(sway)
  p.triangle(-2, 0, 0, -g.h, 2, 0)
  p.triangle(-5, 0, -2, -g.h * 0.75, 0, 0)
  p.triangle(0, 0, 2, -g.h * 0.8, 5, 0)
  p.pop()
}

export function drawFlower(ctx: DrawContext, f: FlowerElement): void {
  const { p, colorProgress, tier, time, centerX, centerY, width, height } = ctx
  const sat = getSaturation(f.x, f.y, centerX, centerY, width, height, colorProgress)
  const sway = Math.sin(time * 1.8 + f.sway) * 0.06
  const hue = applyWarmth(f.hue, tier)

  p.push()
  p.translate(f.x, f.y)
  p.rotate(sway)

  // Stem
  p.fill(applyWarmth(115, tier), sat * 0.55, 38)
  p.rect(-1.5, 0, 3, -f.size * 2.2)

  // Petals
  p.fill(hue, sat * 0.8, 82)
  p.translate(0, -f.size * 2.2)
  for (let i = 0; i < f.petals; i++) {
    p.push()
    p.rotate((p.TWO_PI * i) / f.petals)
    p.ellipse(0, -f.size * 0.55, f.size * 0.45, f.size * 0.75)
    p.pop()
  }

  // Center
  p.fill(45, sat * 0.85, 88)
  p.ellipse(0, 0, f.size * 0.4)
  p.pop()
}

export function drawLeaf(ctx: DrawContext, l: LeafElement): void {
  const { p, colorProgress, tier, time, centerX, centerY, width, height } = ctx
  const sat = getSaturation(l.x, l.y, centerX, centerY, width, height, colorProgress)
  const sway = Math.sin(time * 1.2 + l.sway) * 0.12
  const hue = applyWarmth(l.hue, tier)

  p.push()
  p.translate(l.x, l.y)
  p.rotate(l.rotation + sway)

  // Leaf shape
  p.fill(hue, sat * 0.7, 55)
  p.beginShape()
  p.vertex(0, -l.size / 2)
  p.bezierVertex(l.size / 2, -l.size / 3, l.size / 2, l.size / 3, 0, l.size / 2)
  p.bezierVertex(-l.size / 2, l.size / 3, -l.size / 2, -l.size / 3, 0, -l.size / 2)
  p.endShape()

  // Leaf vein
  p.stroke(hue, sat * 0.5, 40)
  p.strokeWeight(1)
  p.line(0, -l.size / 2.5, 0, l.size / 2.5)
  p.noStroke()
  p.pop()
}
```

**Step 2: Verify file created**

Run:
```bash
wc -l src/components/progress/p5/elements.ts
```
Expected: ~180 lines

**Step 3: Commit**

```bash
git add src/components/progress/p5/elements.ts
git commit -m "feat(p5): add element drawing functions (sky, ground, tree, grass, flowers, leaves)"
```

---

## Task 6: Create Animal Drawing Functions

**Files:**
- Create: `src/components/progress/p5/animals.ts`

**Step 1: Create animal drawing module**

```typescript
import type p5 from 'p5'
import type { AnimalData, AnimalType } from './types'
import { getSaturation } from './colors'

type AnimalDrawContext = {
  p: p5
  colorProgress: number
  tier: number
  time: number
  centerX: number
  centerY: number
  width: number
  height: number
}

export function drawAnimal(ctx: AnimalDrawContext, animal: AnimalData): void {
  const { p, colorProgress, time, centerX, centerY, width, height } = ctx
  const sat = getSaturation(animal.x, animal.y, centerX, centerY, width, height, colorProgress)
  const s = animal.scale * 18

  p.push()
  p.translate(animal.x, animal.y)

  switch (animal.type) {
    case 'ladybug':
      drawLadybug(p, s, sat)
      break
    case 'butterfly':
      drawButterfly(p, s, sat, time)
      break
    case 'robin':
      drawRobin(p, s, sat)
      break
    case 'squirrel':
      drawSquirrel(p, s, sat)
      break
    case 'rabbit':
      drawRabbit(p, s, sat)
      break
    case 'fox':
      drawFox(p, s, sat)
      break
    case 'owl':
      drawOwl(p, s, sat)
      break
    case 'deer':
      drawDeer(p, s, sat)
      break
    case 'hedgehog':
      drawHedgehog(p, s, sat)
      break
    case 'bluebird':
      drawBluebird(p, s, sat, time)
      break
    case 'badger':
      drawBadger(p, s, sat)
      break
    case 'cat':
      drawCat(p, s, sat)
      break
  }

  p.pop()
}

function drawLadybug(p: p5, s: number, sat: number): void {
  p.fill(5, sat * 0.9, 55)
  p.ellipse(0, 0, s * 1.2, s)
  p.fill(0, 0, 15)
  p.ellipse(-s * 0.35, 0, s * 0.35)
  p.ellipse(-s * 0.1, -s * 0.15, s * 0.18)
  p.ellipse(s * 0.15, -s * 0.1, s * 0.15)
  p.ellipse(s * 0.1, s * 0.18, s * 0.16)
  p.ellipse(s * 0.3, s * 0.05, s * 0.14)
  p.stroke(0, 0, 15)
  p.strokeWeight(2)
  p.line(0, -s * 0.45, 0, s * 0.45)
  p.noStroke()
}

function drawButterfly(p: p5, s: number, sat: number, time: number): void {
  const flap = Math.sin(time * 6) * 0.4
  p.fill(280, sat * 0.75, 75)
  p.push()
  p.rotate(-0.4 + flap)
  p.ellipse(-s * 0.5, 0, s * 1.2, s * 0.9)
  p.fill(320, sat * 0.7, 80)
  p.ellipse(-s * 0.45, s * 0.35, s * 0.7, s * 0.5)
  p.pop()
  p.push()
  p.rotate(0.4 - flap)
  p.fill(280, sat * 0.75, 75)
  p.ellipse(s * 0.5, 0, s * 1.2, s * 0.9)
  p.fill(320, sat * 0.7, 80)
  p.ellipse(s * 0.45, s * 0.35, s * 0.7, s * 0.5)
  p.pop()
  p.fill(0, 0, 25)
  p.ellipse(0, 0, s * 0.2, s * 0.8)
  p.stroke(0, 0, 25)
  p.strokeWeight(1.5)
  p.noFill()
  p.arc(-s * 0.1, -s * 0.35, s * 0.3, s * 0.4, p.PI, p.PI + p.HALF_PI)
  p.arc(s * 0.1, -s * 0.35, s * 0.3, s * 0.4, -p.HALF_PI, 0)
  p.noStroke()
}

function drawRobin(p: p5, s: number, sat: number): void {
  p.fill(30, sat * 0.55, 48)
  p.ellipse(0, 0, s * 1.1, s * 0.9)
  p.fill(10, sat * 0.85, 58)
  p.ellipse(s * 0.1, s * 0.1, s * 0.6, s * 0.55)
  p.fill(30, sat * 0.55, 45)
  p.ellipse(s * 0.35, -s * 0.25, s * 0.55, s * 0.5)
  p.fill(45, sat * 0.7, 70)
  p.triangle(s * 0.55, -s * 0.25, s * 0.8, -s * 0.2, s * 0.55, -s * 0.15)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.42, -s * 0.3, s * 0.1)
  p.fill(35, sat * 0.5, 42)
  p.ellipse(-s * 0.15, -s * 0.05, s * 0.5, s * 0.4)
}

function drawSquirrel(p: p5, s: number, sat: number): void {
  p.fill(25, sat * 0.65, 50)
  p.ellipse(-s * 0.6, -s * 0.3, s * 0.9, s * 0.6)
  p.ellipse(-s * 0.75, -s * 0.6, s * 0.5, s * 0.5)
  p.fill(28, sat * 0.6, 55)
  p.ellipse(0, 0, s * 0.8, s * 0.9)
  p.ellipse(s * 0.25, -s * 0.45, s * 0.5, s * 0.45)
  p.ellipse(s * 0.1, -s * 0.7, s * 0.15, s * 0.2)
  p.ellipse(s * 0.4, -s * 0.65, s * 0.15, s * 0.2)
  p.fill(0, 0, 90)
  p.ellipse(s * 0.05, s * 0.15, s * 0.35, s * 0.4)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.32, -s * 0.45, s * 0.1)
  p.ellipse(s * 0.45, -s * 0.38, s * 0.08)
}

function drawRabbit(p: p5, s: number, sat: number): void {
  p.fill(0, 0, 92)
  p.ellipse(0, 0, s, s * 0.85)
  p.ellipse(s * 0.3, -s * 0.35, s * 0.6, s * 0.55)
  p.fill(0, 0, 90)
  p.ellipse(s * 0.15, -s * 0.85, s * 0.18, s * 0.5)
  p.ellipse(s * 0.45, -s * 0.8, s * 0.18, s * 0.5)
  p.fill(350, sat * 0.4, 85)
  p.ellipse(s * 0.15, -s * 0.82, s * 0.08, s * 0.3)
  p.ellipse(s * 0.45, -s * 0.77, s * 0.08, s * 0.3)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.38, -s * 0.38, s * 0.1)
  p.fill(350, sat * 0.5, 80)
  p.ellipse(s * 0.52, -s * 0.28, s * 0.1, s * 0.08)
  p.fill(0, 0, 95)
  p.ellipse(-s * 0.5, s * 0.1, s * 0.25)
}

function drawFox(p: p5, s: number, sat: number): void {
  p.fill(25, sat * 0.8, 62)
  p.ellipse(0, 0, s * 1.3, s * 0.8)
  p.fill(25, sat * 0.75, 58)
  p.ellipse(-s * 0.85, s * 0.1, s * 0.7, s * 0.35)
  p.fill(0, 0, 95)
  p.ellipse(-s * 1.05, s * 0.1, s * 0.25, s * 0.2)
  p.fill(25, sat * 0.8, 65)
  p.ellipse(s * 0.55, -s * 0.15, s * 0.6, s * 0.5)
  p.triangle(s * 0.35, -s * 0.35, s * 0.3, -s * 0.7, s * 0.5, -s * 0.35)
  p.triangle(s * 0.7, -s * 0.3, s * 0.75, -s * 0.65, s * 0.85, -s * 0.3)
  p.fill(0, 0, 95)
  p.ellipse(s * 0.72, -s * 0.05, s * 0.3, s * 0.25)
  p.fill(0, 0, 15)
  p.ellipse(s * 0.82, -s * 0.08, s * 0.1, s * 0.08)
  p.ellipse(s * 0.48, -s * 0.22, s * 0.08)
  p.ellipse(s * 0.62, -s * 0.22, s * 0.08)
}

function drawOwl(p: p5, s: number, sat: number): void {
  p.fill(35, sat * 0.45, 52)
  p.ellipse(0, 0, s, s * 1.2)
  p.fill(35, sat * 0.4, 45)
  p.ellipse(-s * 0.25, s * 0.1, s * 0.4, s * 0.6)
  p.ellipse(s * 0.25, s * 0.1, s * 0.4, s * 0.6)
  p.fill(38, sat * 0.35, 65)
  p.ellipse(0, -s * 0.25, s * 0.8, s * 0.7)
  p.fill(0, 0, 95)
  p.ellipse(-s * 0.18, -s * 0.3, s * 0.35)
  p.ellipse(s * 0.18, -s * 0.3, s * 0.35)
  p.fill(50, sat * 0.9, 85)
  p.ellipse(-s * 0.18, -s * 0.3, s * 0.22)
  p.ellipse(s * 0.18, -s * 0.3, s * 0.22)
  p.fill(0, 0, 10)
  p.ellipse(-s * 0.18, -s * 0.3, s * 0.12)
  p.ellipse(s * 0.18, -s * 0.3, s * 0.12)
  p.fill(45, sat * 0.6, 65)
  p.triangle(0, -s * 0.15, -s * 0.08, s * 0.05, s * 0.08, s * 0.05)
  p.fill(35, sat * 0.45, 48)
  p.triangle(-s * 0.3, -s * 0.55, -s * 0.4, -s * 0.85, -s * 0.15, -s * 0.6)
  p.triangle(s * 0.3, -s * 0.55, s * 0.4, -s * 0.85, s * 0.15, -s * 0.6)
}

function drawDeer(p: p5, s: number, sat: number): void {
  p.fill(32, sat * 0.55, 55)
  p.ellipse(0, 0, s * 1.4, s * 0.9)
  p.fill(32, sat * 0.5, 48)
  p.rect(-s * 0.35, s * 0.25, s * 0.15, s * 0.5)
  p.rect(s * 0.2, s * 0.25, s * 0.15, s * 0.5)
  p.fill(32, sat * 0.55, 55)
  p.ellipse(s * 0.55, -s * 0.35, s * 0.35, s * 0.6)
  p.ellipse(s * 0.65, -s * 0.65, s * 0.4, s * 0.35)
  p.fill(32, sat * 0.5, 52)
  p.ellipse(s * 0.5, -s * 0.8, s * 0.12, s * 0.2)
  p.ellipse(s * 0.78, -s * 0.78, s * 0.12, s * 0.2)
  p.stroke(35, sat * 0.45, 45)
  p.strokeWeight(3)
  p.line(s * 0.52, -s * 0.85, s * 0.35, -s * 1.15)
  p.line(s * 0.42, -s * 1.0, s * 0.25, -s * 1.05)
  p.line(s * 0.38, -s * 1.1, s * 0.28, -s * 1.2)
  p.line(s * 0.76, -s * 0.83, s * 0.95, -s * 1.1)
  p.line(s * 0.88, -s * 0.95, s * 1.05, -s * 0.98)
  p.line(s * 0.92, -s * 1.05, s * 1.05, -s * 1.15)
  p.noStroke()
  p.fill(0, 0, 15)
  p.ellipse(s * 0.72, -s * 0.65, s * 0.07)
  p.ellipse(s * 0.82, -s * 0.58, s * 0.08, s * 0.06)
}

function drawHedgehog(p: p5, s: number, sat: number): void {
  p.fill(32, sat * 0.5, 38)
  for (let i = 0; i < 12; i++) {
    const angle = p.PI + (i / 11) * p.PI
    const sx = Math.cos(angle) * s * 0.5
    const sy = Math.sin(angle) * s * 0.3
    p.triangle(
      sx,
      sy,
      sx + Math.cos(angle) * s * 0.35,
      sy + Math.sin(angle) * s * 0.25,
      sx + Math.cos(angle + 0.2) * s * 0.1,
      sy
    )
  }
  p.fill(35, sat * 0.4, 45)
  p.ellipse(0, 0, s * 1.1, s * 0.65)
  p.fill(35, sat * 0.3, 62)
  p.ellipse(s * 0.4, 0, s * 0.45, s * 0.4)
  p.fill(35, sat * 0.25, 68)
  p.ellipse(s * 0.58, s * 0.05, s * 0.22, s * 0.18)
  p.fill(0, 0, 15)
  p.ellipse(s * 0.67, s * 0.03, s * 0.1, s * 0.08)
  p.ellipse(s * 0.42, -s * 0.08, s * 0.08)
}

function drawBluebird(p: p5, s: number, sat: number, time: number): void {
  const bob = Math.sin(time * 3) * s * 0.02
  p.translate(0, bob)
  p.fill(210, sat * 0.75, 65)
  p.ellipse(0, 0, s * 0.9, s * 0.7)
  p.fill(215, sat * 0.7, 55)
  p.ellipse(-s * 0.15, 0, s * 0.5, s * 0.4)
  p.fill(210, sat * 0.75, 68)
  p.ellipse(s * 0.3, -s * 0.2, s * 0.5, s * 0.45)
  p.fill(0, 0, 92)
  p.ellipse(s * 0.1, s * 0.15, s * 0.4, s * 0.35)
  p.fill(45, sat * 0.7, 70)
  p.triangle(s * 0.5, -s * 0.18, s * 0.72, -s * 0.15, s * 0.5, -s * 0.08)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.38, -s * 0.25, s * 0.08)
}

function drawBadger(p: p5, s: number, sat: number): void {
  p.fill(0, 0, 35)
  p.ellipse(0, 0, s * 1.2, s * 0.7)
  p.ellipse(s * 0.45, -s * 0.1, s * 0.55, s * 0.5)
  p.fill(0, 0, 95)
  p.beginShape()
  p.vertex(s * 0.2, -s * 0.35)
  p.vertex(s * 0.35, -s * 0.35)
  p.vertex(s * 0.7, s * 0.05)
  p.vertex(s * 0.55, s * 0.1)
  p.endShape(p.CLOSE)
  p.fill(0, 0, 25)
  p.ellipse(s * 0.55, -s * 0.2, s * 0.25, s * 0.35)
  p.ellipse(s * 0.55, s * 0.05, s * 0.25, s * 0.25)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.48, -s * 0.15, s * 0.08)
  p.ellipse(s * 0.58, -s * 0.12, s * 0.08)
  p.ellipse(s * 0.7, -s * 0.02, s * 0.1, s * 0.08)
}

function drawCat(p: p5, s: number, sat: number): void {
  p.fill(35, sat * 0.25, 70)
  p.ellipse(0, 0, s * 0.9, s)
  p.ellipse(0, -s * 0.6, s * 0.7, s * 0.6)
  p.triangle(-s * 0.28, -s * 0.75, -s * 0.38, -s * 1.05, -s * 0.08, -s * 0.85)
  p.triangle(s * 0.28, -s * 0.75, s * 0.38, -s * 1.05, s * 0.08, -s * 0.85)
  p.fill(350, sat * 0.4, 80)
  p.triangle(-s * 0.25, -s * 0.78, -s * 0.32, -s * 0.95, -s * 0.12, -s * 0.83)
  p.triangle(s * 0.25, -s * 0.78, s * 0.32, -s * 0.95, s * 0.12, -s * 0.83)
  p.fill(35, sat * 0.35, 58)
  p.ellipse(-s * 0.15, -s * 0.55, s * 0.15, s * 0.1)
  p.ellipse(s * 0.15, -s * 0.55, s * 0.15, s * 0.1)
  p.fill(120, sat * 0.6, 70)
  p.ellipse(-s * 0.15, -s * 0.6, s * 0.18, s * 0.15)
  p.ellipse(s * 0.15, -s * 0.6, s * 0.18, s * 0.15)
  p.fill(0, 0, 10)
  p.ellipse(-s * 0.15, -s * 0.6, s * 0.06, s * 0.12)
  p.ellipse(s * 0.15, -s * 0.6, s * 0.06, s * 0.12)
  p.fill(350, sat * 0.5, 75)
  p.triangle(0, -s * 0.45, -s * 0.06, -s * 0.38, s * 0.06, -s * 0.38)
  p.stroke(0, 0, 40)
  p.strokeWeight(1)
  p.line(-s * 0.12, -s * 0.4, -s * 0.4, -s * 0.45)
  p.line(-s * 0.12, -s * 0.38, -s * 0.4, -s * 0.38)
  p.line(s * 0.12, -s * 0.4, s * 0.4, -s * 0.45)
  p.line(s * 0.12, -s * 0.38, s * 0.4, -s * 0.38)
  p.noStroke()
  p.fill(35, sat * 0.25, 70)
  p.ellipse(-s * 0.55, s * 0.2, s * 0.6, s * 0.2)
  p.ellipse(-s * 0.75, 0, s * 0.25, s * 0.2)
}

/**
 * Get animal positions that match the TABLE_CHARACTERS layout
 */
export function getAnimalPositions(width: number, height: number): AnimalData[] {
  return [
    { x: width * 0.08, y: height * 0.88, type: 'ladybug', scale: 1 },
    { x: width * 0.85, y: height * 0.45, type: 'butterfly', scale: 1.2 },
    { x: width * 0.62, y: height * 0.32, type: 'robin', scale: 1 },
    { x: width * 0.38, y: height * 0.5, type: 'squirrel', scale: 1.1 },
    { x: width * 0.88, y: height * 0.85, type: 'rabbit', scale: 1.2 },
    { x: width * 0.15, y: height * 0.82, type: 'fox', scale: 1.3 },
    { x: width * 0.5, y: height * 0.22, type: 'owl', scale: 1.2 },
    { x: width * 0.78, y: height * 0.8, type: 'deer', scale: 1.5 },
    { x: width * 0.25, y: height * 0.9, type: 'hedgehog', scale: 1 },
    { x: width * 0.3, y: height * 0.28, type: 'bluebird', scale: 0.9 },
    { x: width * 0.7, y: height * 0.88, type: 'badger', scale: 1.1 },
    { x: width * 0.55, y: height * 0.78, type: 'cat', scale: 1.2 },
  ]
}
```

**Step 2: Verify file created**

Run:
```bash
wc -l src/components/progress/p5/animals.ts
```
Expected: ~250 lines

**Step 3: Commit**

```bash
git add src/components/progress/p5/animals.ts
git commit -m "feat(p5): add 12 character animal drawing functions"
```

---

## Task 7: Create Scene Generation Logic

**Files:**
- Create: `src/components/progress/p5/scene.ts`

**Step 1: Create scene generation module**

```typescript
import type p5 from 'p5'
import type { SceneElements, SketchParams, TreeData } from './types'
import { PALETTE } from './colors'
import { createSeededRandom } from './seededRandom'
import {
  drawSky,
  drawClouds,
  drawGround,
  drawTree,
  drawGrass,
  drawFlower,
  drawLeaf,
} from './elements'
import { drawAnimal, getAnimalPositions } from './animals'

const SCENE_SEED = 12345

export function generateScene(width: number, height: number): SceneElements {
  const rand = createSeededRandom(SCENE_SEED)

  const tree: TreeData = {
    x: width * 0.5,
    baseY: height * 0.82,
    trunkW: 50,
    trunkH: 160,
    canopy: [
      { x: 0, y: -180, r: 100 },
      { x: -70, y: -150, r: 80 },
      { x: 70, y: -150, r: 80 },
      { x: -50, y: -220, r: 70 },
      { x: 50, y: -220, r: 70 },
      { x: 0, y: -250, r: 60 },
      { x: -30, y: -280, r: 45 },
      { x: 30, y: -280, r: 45 },
    ],
  }

  // Grass (reveal index 1-50)
  const grass = []
  for (let i = 0; i < 60; i++) {
    grass.push({
      x: rand() * width,
      y: height * 0.78 + rand() * height * 0.22,
      h: 12 + rand() * 20,
      revealIdx: Math.floor((i * 50) / 60) + 1,
      sway: rand() * Math.PI * 2,
    })
  }

  // Flowers (reveal index 51-90)
  const flowers = []
  for (let i = 0; i < 35; i++) {
    let fx = rand() * width
    if (fx > width * 0.35 && fx < width * 0.65) {
      fx = rand() < 0.5 ? rand() * width * 0.3 : width * 0.7 + rand() * width * 0.3
    }
    flowers.push({
      x: fx,
      y: height * 0.75 + rand() * height * 0.22,
      size: 6 + rand() * 10,
      petals: 5 + Math.floor(rand() * 3),
      hue: PALETTE.flowers[Math.floor(rand() * PALETTE.flowers.length)].h,
      revealIdx: 51 + Math.floor((i * 40) / 35),
      sway: rand() * Math.PI * 2,
    })
  }

  // Leaves (reveal index 91-144)
  const leaves = []
  for (let i = 0; i < 80; i++) {
    const c = tree.canopy[Math.floor(rand() * tree.canopy.length)]
    const angle = rand() * Math.PI * 2
    const dist = rand() * c.r * 0.85
    leaves.push({
      x: tree.x + c.x + Math.cos(angle) * dist,
      y: tree.baseY + c.y + Math.sin(angle) * dist,
      size: 10 + rand() * 8,
      rotation: rand() * Math.PI * 2,
      hue: 90 + rand() * 50,
      revealIdx: 91 + Math.floor((i * 54) / 80),
      sway: rand() * Math.PI * 2,
    })
  }

  // Clouds
  const clouds = []
  for (let i = 0; i < 4; i++) {
    clouds.push({
      x: width * 0.1 + rand() * width * 0.8,
      y: 30 + rand() * 60,
      size: 35 + rand() * 25,
    })
  }

  return {
    tree,
    grass,
    flowers,
    leaves,
    clouds,
    animals: getAnimalPositions(width, height),
  }
}

export function drawScene(
  p: p5,
  elements: SceneElements,
  params: SketchParams
): void {
  const { revealedFacts, revealedTables, revealedTier, width, height } = params
  const colorProgress = revealedFacts / 144
  const time = p.millis() / 1000

  const centerX = elements.tree.x
  const centerY = elements.tree.baseY - 150

  const ctx = {
    p,
    colorProgress,
    tier: revealedTier,
    time,
    centerX,
    centerY,
    width,
    height,
  }

  // Draw scene layers
  drawSky(ctx)
  drawClouds(ctx, elements.clouds)
  drawGround(ctx)
  drawTree(ctx, elements.tree)

  // Draw revealed grass
  elements.grass.forEach((g) => {
    if (g.revealIdx <= revealedFacts) {
      drawGrass(ctx, g)
    }
  })

  // Draw revealed flowers
  elements.flowers.forEach((f) => {
    if (f.revealIdx <= revealedFacts) {
      drawFlower(ctx, f)
    }
  })

  // Draw revealed leaves
  elements.leaves.forEach((l) => {
    if (l.revealIdx <= revealedFacts) {
      drawLeaf(ctx, l)
    }
  })

  // Draw revealed animals
  elements.animals.forEach((animal, i) => {
    const tableNum = i + 1
    if (revealedTables.includes(tableNum)) {
      drawAnimal(ctx, animal)
    }
  })
}
```

**Step 2: Verify file created**

Run:
```bash
wc -l src/components/progress/p5/scene.ts
```
Expected: ~130 lines

**Step 3: Commit**

```bash
git add src/components/progress/p5/scene.ts
git commit -m "feat(p5): add scene generation and drawing orchestration"
```

---

## Task 8: Create useP5 Hook

**Files:**
- Create: `src/components/progress/p5/useP5.ts`

**Step 1: Create the p5 React hook**

```typescript
import { useEffect, useRef, useState, type RefObject } from 'react'
import p5 from 'p5'
import type { SketchParams, SceneElements } from './types'
import { generateScene, drawScene } from './scene'

type UseP5Result = {
  isReady: boolean
  error: Error | null
}

export function useP5(
  containerRef: RefObject<HTMLDivElement | null>,
  params: SketchParams
): UseP5Result {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const p5InstanceRef = useRef<p5 | null>(null)
  const paramsRef = useRef<SketchParams>(params)
  const elementsRef = useRef<SceneElements | null>(null)

  // Keep params ref updated
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    try {
      const sketch = (p: p5) => {
        p.setup = () => {
          const { width, height } = paramsRef.current
          p.createCanvas(width, height)
          p.colorMode(p.HSB, 360, 100, 100, 1)
          p.noStroke()
          p.frameRate(30)

          elementsRef.current = generateScene(width, height)
          setIsReady(true)
        }

        p.draw = () => {
          if (!elementsRef.current) return
          drawScene(p, elementsRef.current, paramsRef.current)
        }
      }

      p5InstanceRef.current = new p5(sketch, container)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize p5'))
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
        p5InstanceRef.current = null
      }
    }
  }, [containerRef])

  // Handle resize
  useEffect(() => {
    const p5Instance = p5InstanceRef.current
    if (!p5Instance || !isReady) return

    const { width, height } = params
    if (p5Instance.width !== width || p5Instance.height !== height) {
      p5Instance.resizeCanvas(width, height)
      elementsRef.current = generateScene(width, height)
    }
  }, [params.width, params.height, isReady])

  return { isReady, error }
}
```

**Step 2: Verify file created**

Run:
```bash
wc -l src/components/progress/p5/useP5.ts
```
Expected: ~75 lines

**Step 3: Commit**

```bash
git add src/components/progress/p5/useP5.ts
git commit -m "feat(p5): add useP5 React hook for instance mode integration"
```

---

## Task 9: Create p5 Module Index

**Files:**
- Create: `src/components/progress/p5/index.ts`

**Step 1: Create barrel export**

```typescript
export { useP5 } from './useP5'
export type { SketchParams } from './types'
```

**Step 2: Verify file created**

Run:
```bash
cat src/components/progress/p5/index.ts
```
Expected: Export statements displayed

**Step 3: Commit**

```bash
git add src/components/progress/p5/index.ts
git commit -m "feat(p5): add module barrel export"
```

---

## Task 10: Refactor ProgressScene Component

**Files:**
- Modify: `src/components/progress/ProgressScene.tsx`

**Step 1: Replace image-based implementation with p5 canvas**

Replace entire file contents with:

```typescript
import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TreeDeciduous } from 'lucide-react'
import { useP5 } from './p5'

type ProgressSceneProps = {
  revealedFacts: number
  revealedTables: number[]
  revealedTier: number
  animatingCharacter?: number | null
}

export function ProgressScene({
  revealedFacts,
  revealedTables,
  revealedTier,
  animatingCharacter,
}: ProgressSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Observe container size for responsive canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setDimensions({ width: Math.floor(width), height: Math.floor(height) })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const { isReady, error } = useP5(containerRef, {
    revealedFacts,
    revealedTables,
    revealedTier,
    animatingCharacter: animatingCharacter ?? null,
    width: dimensions.width,
    height: dimensions.height,
  })

  // Fallback UI when canvas fails
  if (error) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 to-garden-200 flex items-center justify-center">
        <div className="text-center text-garden-600">
          <TreeDeciduous size={64} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm opacity-75">Your learning tree</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ opacity: isReady ? 1 : 0, transition: 'opacity 0.3s ease-in' }}
      />

      {/* Sparkle effect for animating character */}
      {animatingCharacter && <CharacterSparkle tableNum={animatingCharacter} />}
    </div>
  )
}

function CharacterSparkle({ tableNum }: { tableNum: number }) {
  // Position sparkles based on animal positions (matching animals.ts order)
  const positions = [
    { top: '88%', left: '8%' },
    { top: '45%', left: '85%' },
    { top: '32%', left: '62%' },
    { top: '50%', left: '38%' },
    { top: '85%', left: '88%' },
    { top: '82%', left: '15%' },
    { top: '22%', left: '50%' },
    { top: '80%', left: '78%' },
    { top: '90%', left: '25%' },
    { top: '28%', left: '30%' },
    { top: '88%', left: '70%' },
    { top: '78%', left: '55%' },
  ]

  const pos = positions[tableNum - 1]
  if (!pos) return null

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: pos.top,
        left: pos.left,
        width: '15%',
        height: '12%',
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 1, times: [0, 0.2, 0.7, 1] }}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-300 rounded-full"
          style={{ top: '50%', left: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((i * Math.PI) / 4) * 40,
            y: Math.sin((i * Math.PI) / 4) * 40,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      ))}
    </motion.div>
  )
}
```

**Step 2: Verify file updated**

Run:
```bash
head -20 src/components/progress/ProgressScene.tsx
```
Expected: New implementation with `useP5` import

**Step 3: Commit**

```bash
git add src/components/progress/ProgressScene.tsx
git commit -m "refactor: replace image-based ProgressScene with p5.js canvas"
```

---

## Task 11: Delete Scene Image

**Files:**
- Delete: `public/scene.webp`

**Step 1: Remove the image file**

Run:
```bash
rm public/scene.webp
```

**Step 2: Verify file deleted**

Run:
```bash
ls public/scene.webp 2>&1
```
Expected: "No such file or directory"

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove static scene image (replaced by p5.js)"
```

---

## Task 12: Build and Test

**Files:**
- None (verification only)

**Step 1: Run TypeScript check**

Run:
```bash
bun run tsc
```
Expected: No errors

**Step 2: Run linter**

Run:
```bash
bun run lint
```
Expected: No errors (or only pre-existing ones)

**Step 3: Run build**

Run:
```bash
bun run build
```
Expected: Build succeeds

**Step 4: Manual testing**

Run:
```bash
bun run dev
```

Test checklist:
- [ ] Navigate to Progress/Garden view
- [ ] Scene renders with tree, sky, ground
- [ ] Increase facts → grass/flowers/leaves appear
- [ ] Color spreads from center outward
- [ ] Tier changes → sky color shifts toward golden hour
- [ ] Master a table → animal appears with sparkle effect
- [ ] Resize window → canvas adapts

**Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify p5.js progress scene implementation"
```

---

## Task 13: Cleanup Demo File

**Files:**
- Delete: `p5-scene-demo.html`

**Step 1: Remove the demo file**

Run:
```bash
rm p5-scene-demo.html
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove p5 demo file (no longer needed)"
```

---

## Summary

**Files Created (7):**
- `src/components/progress/p5/seededRandom.ts`
- `src/components/progress/p5/colors.ts`
- `src/components/progress/p5/types.ts`
- `src/components/progress/p5/elements.ts`
- `src/components/progress/p5/animals.ts`
- `src/components/progress/p5/scene.ts`
- `src/components/progress/p5/useP5.ts`
- `src/components/progress/p5/index.ts`

**Files Modified (1):**
- `src/components/progress/ProgressScene.tsx`

**Files Deleted (2):**
- `public/scene.webp`
- `p5-scene-demo.html`

**Dependencies Added:**
- `p5`
- `@types/p5`
