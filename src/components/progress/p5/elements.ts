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
