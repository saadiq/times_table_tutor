import { REF_WIDTH, REF_HEIGHT } from './types'
import type { AnimalData, AnimalType, AnimalDrawer, SceneVisuals } from './types'
import { getVibrancySaturation } from './colors'
import type { DrawContext } from './elements'
import { FOREST_DRAWERS } from './animals'

// Task 11 merges TWILIGHT_DRAWERS into this map.
const DRAWERS: Record<AnimalType, AnimalDrawer> = {
  ...FOREST_DRAWERS,
}

/** Canvas positions for the 12 character slots (slot i unlocks with table i+1). */
const ANIMAL_SLOTS = [
  { x: 0.08, y: 0.88 },
  { x: 0.85, y: 0.45 },
  { x: 0.62, y: 0.32 },
  { x: 0.38, y: 0.5 },
  { x: 0.88, y: 0.85 },
  { x: 0.15, y: 0.82 },
  { x: 0.5, y: 0.22 },
  { x: 0.78, y: 0.8 },
  { x: 0.25, y: 0.9 },
  { x: 0.3, y: 0.28 },
  { x: 0.7, y: 0.88 },
  { x: 0.55, y: 0.78 },
] as const

export function getAnimalPositions(
  width: number,
  height: number,
  animals: SceneVisuals['animals']
): AnimalData[] {
  return ANIMAL_SLOTS.map((slot, i) => ({
    x: width * slot.x,
    y: height * slot.y,
    type: animals[i].type,
    scale: animals[i].scale,
  }))
}

export function drawAnimal(ctx: DrawContext, animal: AnimalData): void {
  const { p, warmth, vibrancy, time, centerX, centerY, width, height } = ctx
  const sat = getVibrancySaturation(animal.x, animal.y, centerX, centerY, width, height, warmth, vibrancy)
  // Scale animal size proportionally to canvas
  const canvasScale = Math.min(width / REF_WIDTH, height / REF_HEIGHT)
  const s = animal.scale * 18 * canvasScale

  p.push()
  p.translate(animal.x, animal.y)
  DRAWERS[animal.type](p, s, sat, time)
  p.pop()
}
