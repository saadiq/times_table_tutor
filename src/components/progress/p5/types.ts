import type p5 from 'p5'
import type { SceneState } from '../../../types/scene'

// Reference canvas size for proportional scaling
export const REF_WIDTH = 400
export const REF_HEIGHT = 500

export type HSB = { h: number; s: number; b: number }

export type ScenePalette = {
  sky: HSB[] // one entry per tier (5)
  tree: { trunk: HSB; canopy: HSB }
  grass: HSB
  flowers: HSB[]
  ground: HSB
}

export type AnimalDrawer = (p: p5, s: number, sat: number, time: number) => void

export type SceneVisuals = {
  palette: ScenePalette
  /** 12 entries, one per character slot (slot i unlocks with table i+1). */
  animals: Array<{ type: AnimalType; scale: number }>
}

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

export type AmbientCreature = {
  baseX: number
  baseY: number
  speed: number
  offset: number
  size: number
  hue: number
}

export type AmbientData = {
  butterflies: AmbientCreature[]
  birds: AmbientCreature[]
  fireflies: AmbientCreature[]
}

export type SceneElements = {
  tree: TreeData
  grass: GrassElement[]
  flowers: FlowerElement[]
  leaves: LeafElement[]
  clouds: CloudElement[]
  animals: AnimalData[]
  ambient: AmbientData
}

export type SketchParams = {
  scene: SceneState
  animatingCharacter: number | null
  width: number
  height: number
  visuals: SceneVisuals
}
