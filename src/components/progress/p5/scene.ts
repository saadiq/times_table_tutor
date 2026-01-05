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
