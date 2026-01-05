import type p5 from 'p5'
import type { AnimalData } from './types'
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

// Reference canvas size for scaling
const REF_WIDTH = 400
const REF_HEIGHT = 500

export function drawAnimal(ctx: AnimalDrawContext, animal: AnimalData): void {
  const { p, colorProgress, time, centerX, centerY, width, height } = ctx
  const sat = getSaturation(animal.x, animal.y, centerX, centerY, width, height, colorProgress)
  // Scale animal size proportionally to canvas
  const canvasScale = Math.min(width / REF_WIDTH, height / REF_HEIGHT)
  const s = animal.scale * 18 * canvasScale

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

function drawBadger(p: p5, s: number, _sat: number): void {
  // Badger uses grayscale colors, sat intentionally unused
  void _sat
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
