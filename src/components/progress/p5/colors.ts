import type { ScenePalette } from './types'

/**
 * Color palette matching app theme (HSB: 360, 100, 100)
 */
export const PALETTE: ScenePalette = {
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
 * Calculate saturation for sky/ground using warmth (effort-based).
 * Color spreads radially outward as warmth increases.
 */
export function getWarmthSaturation(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  canvasWidth: number,
  canvasHeight: number,
  warmth: number
): number {
  const dx = x - centerX
  const dy = y - centerY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxDist = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) * 0.5
  const normalized = dist / maxDist
  return Math.max(0, Math.min(100, (warmth * 1.8 - normalized) * 100))
}

/**
 * Calculate saturation for scene elements using vibrancy (confidence-based).
 * Vibrancy ranges from 0.3 (all learning) to 1.0 (all mastered).
 */
export function getVibrancySaturation(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  canvasWidth: number,
  canvasHeight: number,
  warmth: number,
  vibrancy: number
): number {
  // Base radial spread from warmth, then scaled by vibrancy
  const base = getWarmthSaturation(x, y, centerX, centerY, canvasWidth, canvasHeight, warmth)
  return base * vibrancy
}

/**
 * Shift hue toward warm (golden hour) based on tier.
 */
export function applyWarmth(hue: number, tier: number): number {
  const shift = tier * 8
  if (hue > 60 && hue < 300) return hue - shift
  return hue
}
