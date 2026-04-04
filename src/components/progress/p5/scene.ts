import type p5 from 'p5'
import { REF_WIDTH, REF_HEIGHT, type SceneElements, type SketchParams, type TreeData } from './types'
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
import { drawAmbient } from './ambient'

const SCENE_SEED = 12345

export function generateScene(width: number, height: number): SceneElements {
  const rand = createSeededRandom(SCENE_SEED)

  const scaleX = width / REF_WIDTH
  const scaleY = height / REF_HEIGHT
  const scale = Math.min(scaleX, scaleY)

  const tree: TreeData = {
    x: width * 0.5,
    baseY: height * 0.82,
    trunkW: 50 * scaleX,
    trunkH: 160 * scaleY,
    canopy: [
      { x: 0, y: -180 * scaleY, r: 100 * scale },
      { x: -70 * scaleX, y: -150 * scaleY, r: 80 * scale },
      { x: 70 * scaleX, y: -150 * scaleY, r: 80 * scale },
      { x: -50 * scaleX, y: -220 * scaleY, r: 70 * scale },
      { x: 50 * scaleX, y: -220 * scaleY, r: 70 * scale },
      { x: 0, y: -250 * scaleY, r: 60 * scale },
      { x: -30 * scaleX, y: -280 * scaleY, r: 45 * scale },
      { x: 30 * scaleX, y: -280 * scaleY, r: 45 * scale },
    ],
  }

  // Grass: 60 elements, reveal indices 1-50
  const grass = []
  for (let i = 0; i < 60; i++) {
    grass.push({
      x: rand() * width,
      y: height * 0.78 + rand() * height * 0.22,
      h: (12 + rand() * 20) * scale,
      revealIdx: Math.floor((i * 50) / 60) + 1,
      sway: rand() * Math.PI * 2,
    })
  }

  // Flowers: 40 elements (up from 35), reveal indices 51-95
  const flowers = []
  for (let i = 0; i < 40; i++) {
    let fx = rand() * width
    if (fx > width * 0.35 && fx < width * 0.65) {
      fx = rand() < 0.5 ? rand() * width * 0.3 : width * 0.7 + rand() * width * 0.3
    }
    flowers.push({
      x: fx,
      y: height * 0.75 + rand() * height * 0.22,
      size: (6 + rand() * 10) * scale,
      petals: 5 + Math.floor(rand() * 3),
      hue: PALETTE.flowers[Math.floor(rand() * PALETTE.flowers.length)].h,
      revealIdx: 51 + Math.floor((i * 45) / 40),
      sway: rand() * Math.PI * 2,
    })
  }

  // Leaves: 70 elements (down from 80), reveal indices 96-144
  const leaves = []
  for (let i = 0; i < 70; i++) {
    const c = tree.canopy[Math.floor(rand() * tree.canopy.length)]
    const angle = rand() * Math.PI * 2
    const dist = rand() * c.r * 0.85
    leaves.push({
      x: tree.x + c.x + Math.cos(angle) * dist,
      y: tree.baseY + c.y + Math.sin(angle) * dist,
      size: (10 + rand() * 8) * scale,
      rotation: rand() * Math.PI * 2,
      hue: 90 + rand() * 50,
      revealIdx: 96 + Math.floor((i * 49) / 70),
      sway: rand() * Math.PI * 2,
    })
  }

  // Clouds
  const clouds = []
  for (let i = 0; i < 4; i++) {
    clouds.push({
      x: width * 0.1 + rand() * width * 0.8,
      y: 30 * scaleY + rand() * 60 * scaleY,
      size: (35 + rand() * 25) * scale,
    })
  }

  // Pre-compute ambient creature base positions (avoids PRNG per frame)
  const ambientRand = createSeededRandom(67890)
  const butterflies = Array.from({ length: 5 }, () => ({
    baseX: ambientRand() * width * 0.8 + width * 0.1,
    baseY: ambientRand() * height * 0.5 + height * 0.15,
    speed: 0.3 + ambientRand() * 0.4,
    offset: ambientRand() * Math.PI * 2,
    size: 4 + ambientRand() * 3,
    hue: 260 + ambientRand() * 60,
  }))
  const ambientRand2 = createSeededRandom(67990)
  const birds = Array.from({ length: 2 }, () => ({
    baseX: ambientRand2() * width * 0.6 + width * 0.2,
    baseY: ambientRand2() * height * 0.3 + height * 0.05,
    speed: 0.15 + ambientRand2() * 0.1,
    offset: ambientRand2() * Math.PI * 2,
    size: 6 + ambientRand2() * 2,
    hue: 200,
  }))
  const ambientRand3 = createSeededRandom(68090)
  const fireflies = Array.from({ length: 6 }, () => ({
    baseX: ambientRand3() * width * 0.7 + width * 0.15,
    baseY: ambientRand3() * height * 0.5 + height * 0.1,
    speed: 0.5 + ambientRand3() * 0.5,
    offset: ambientRand3() * Math.PI * 2,
    size: 0,
    hue: 55,
  }))

  return {
    tree,
    grass,
    flowers,
    leaves,
    clouds,
    animals: getAnimalPositions(width, height),
    ambient: { butterflies, birds, fireflies },
  }
}

export function drawScene(
  p: p5,
  elements: SceneElements,
  params: SketchParams
): void {
  const { scene, width, height } = params
  const revealedCount = scene.details.revealedCount
  const time = p.millis() / 1000

  const centerX = elements.tree.x
  const centerY = elements.tree.baseY - 150

  const ctx = {
    p,
    warmth: scene.foundation.warmth,
    vibrancy: scene.details.vibrancy,
    tier: scene.tier,
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
    if (g.revealIdx <= revealedCount) {
      drawGrass(ctx, g)
    }
  })

  // Draw revealed flowers
  elements.flowers.forEach((f) => {
    if (f.revealIdx <= revealedCount) {
      drawFlower(ctx, f)
    }
  })

  // Draw revealed leaves
  elements.leaves.forEach((l) => {
    if (l.revealIdx <= revealedCount) {
      drawLeaf(ctx, l)
    }
  })

  // Draw revealed animals
  elements.animals.forEach((animal, i) => {
    const tableNum = i + 1
    if (scene.landmarks.unlockedTables.includes(tableNum)) {
      drawAnimal(ctx, animal)
    }
  })

  // Ambient creatures (streak-based)
  drawAmbient(ctx, scene.ambient.streakDays, elements.ambient)
}
