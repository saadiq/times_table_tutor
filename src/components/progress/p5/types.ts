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
