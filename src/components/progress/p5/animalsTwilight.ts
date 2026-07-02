import type p5 from 'p5'
import type { TwilightAnimalType, AnimalDrawer } from './types'

function drawFrog(p: p5, s: number, sat: number): void {
  p.fill(110, sat * 0.7, 55)
  p.ellipse(0, 0, s * 1.1, s * 0.8)
  p.ellipse(-s * 0.45, s * 0.25, s * 0.4, s * 0.25)
  p.ellipse(s * 0.45, s * 0.25, s * 0.4, s * 0.25)
  p.ellipse(0, -s * 0.45, s * 0.9, s * 0.6)
  p.fill(0, 0, 95)
  p.ellipse(-s * 0.28, -s * 0.7, s * 0.3)
  p.ellipse(s * 0.28, -s * 0.7, s * 0.3)
  p.fill(0, 0, 10)
  p.ellipse(-s * 0.28, -s * 0.7, s * 0.12)
  p.ellipse(s * 0.28, -s * 0.7, s * 0.12)
  p.fill(110, sat * 0.5, 70)
  p.ellipse(0, -s * 0.3, s * 0.55, s * 0.3)
  p.stroke(0, 0, 20)
  p.strokeWeight(1.5)
  p.noFill()
  p.arc(0, -s * 0.42, s * 0.35, s * 0.2, 0, p.PI)
  p.noStroke()
}

function drawDragonfly(p: p5, s: number, sat: number, time: number): void {
  const flutter = Math.sin(time * 10) * 0.15
  p.fill(190, sat * 0.5, 85, 0.7)
  p.push()
  p.rotate(-0.5 + flutter)
  p.ellipse(-s * 0.5, -s * 0.1, s * 1.1, s * 0.28)
  p.pop()
  p.push()
  p.rotate(0.5 - flutter)
  p.ellipse(s * 0.5, -s * 0.1, s * 1.1, s * 0.28)
  p.pop()
  p.push()
  p.rotate(-0.2 + flutter)
  p.ellipse(-s * 0.45, s * 0.1, s * 0.9, s * 0.22)
  p.pop()
  p.push()
  p.rotate(0.2 - flutter)
  p.ellipse(s * 0.45, s * 0.1, s * 0.9, s * 0.22)
  p.pop()
  p.fill(210, sat * 0.8, 65)
  p.ellipse(0, s * 0.15, s * 0.18, s * 1.1)
  p.ellipse(0, -s * 0.35, s * 0.35, s * 0.4)
  p.fill(0, 0, 15)
  p.ellipse(-s * 0.09, -s * 0.55, s * 0.16)
  p.ellipse(s * 0.09, -s * 0.55, s * 0.16)
}

function drawTurtle(p: p5, s: number, sat: number): void {
  p.fill(75, sat * 0.5, 60)
  p.ellipse(s * 0.7, -s * 0.1, s * 0.4, s * 0.35)
  p.ellipse(-s * 0.55, s * 0.05, s * 0.3, s * 0.18)
  p.ellipse(-s * 0.3, s * 0.12, s * 0.25, s * 0.18)
  p.ellipse(s * 0.3, s * 0.12, s * 0.25, s * 0.18)
  p.fill(95, sat * 0.6, 42)
  p.arc(0, s * 0.1, s * 1.3, s * 1.1, p.PI, 0, p.CHORD)
  p.fill(95, sat * 0.5, 55)
  p.ellipse(0, -s * 0.18, s * 0.5, s * 0.35)
  p.ellipse(-s * 0.38, -s * 0.02, s * 0.3, s * 0.25)
  p.ellipse(s * 0.38, -s * 0.02, s * 0.3, s * 0.25)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.78, -s * 0.18, s * 0.08)
}

function drawDuck(p: p5, s: number, sat: number): void {
  p.fill(45, sat * 0.35, 88)
  p.ellipse(0, 0, s * 1.1, s * 0.8)
  p.fill(45, sat * 0.3, 82)
  p.ellipse(-s * 0.25, -s * 0.05, s * 0.5, s * 0.4)
  p.fill(45, sat * 0.35, 90)
  p.ellipse(s * 0.4, -s * 0.5, s * 0.5, s * 0.45)
  p.fill(35, sat * 0.9, 80)
  p.triangle(s * 0.6, -s * 0.5, s * 0.9, -s * 0.42, s * 0.6, -s * 0.35)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.47, -s * 0.56, s * 0.09)
  p.stroke(200, sat * 0.4, 70)
  p.strokeWeight(1.5)
  p.noFill()
  p.arc(0, s * 0.42, s * 1.5, s * 0.25, 0, p.PI)
  p.noStroke()
}

function drawMouse(p: p5, s: number, sat: number): void {
  p.fill(25, sat * 0.3, 62)
  p.ellipse(0, 0, s * 1.05, s * 0.7)
  p.ellipse(s * 0.4, -s * 0.15, s * 0.5, s * 0.4)
  p.fill(350, sat * 0.35, 80)
  p.ellipse(s * 0.3, -s * 0.5, s * 0.3)
  p.ellipse(s * 0.55, -s * 0.45, s * 0.3)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.55, -s * 0.2, s * 0.08)
  p.ellipse(s * 0.68, -s * 0.1, s * 0.07)
  p.stroke(25, sat * 0.3, 45)
  p.strokeWeight(1.5)
  p.noFill()
  p.arc(-s * 0.5, 0, s * 0.8, s * 0.6, p.HALF_PI, p.PI)
  p.noStroke()
}

function drawRaccoon(p: p5, s: number, _sat: number): void {
  // Raccoon reads as grayscale at night, sat intentionally unused
  void _sat
  p.fill(0, 0, 45)
  p.ellipse(0, 0, s * 1.25, s * 0.8)
  p.fill(0, 0, 40)
  p.ellipse(-s * 0.75, s * 0.05, s * 0.6, s * 0.3)
  p.fill(0, 0, 25)
  p.ellipse(-s * 0.65, s * 0.05, s * 0.15, s * 0.28)
  p.ellipse(-s * 0.9, s * 0.05, s * 0.14, s * 0.24)
  p.fill(0, 0, 50)
  p.ellipse(s * 0.5, -s * 0.3, s * 0.55, s * 0.45)
  p.triangle(s * 0.3, -s * 0.5, s * 0.28, -s * 0.75, s * 0.45, -s * 0.5)
  p.triangle(s * 0.62, -s * 0.5, s * 0.72, -s * 0.75, s * 0.75, -s * 0.48)
  p.fill(0, 0, 20)
  p.ellipse(s * 0.4, -s * 0.32, s * 0.22, s * 0.15)
  p.ellipse(s * 0.62, -s * 0.32, s * 0.22, s * 0.15)
  p.fill(0, 0, 95)
  p.ellipse(s * 0.5, -s * 0.15, s * 0.3, s * 0.18)
  p.ellipse(s * 0.4, -s * 0.32, s * 0.09)
  p.ellipse(s * 0.62, -s * 0.32, s * 0.09)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.52, -s * 0.13, s * 0.09, s * 0.07)
}

function drawHeron(p: p5, s: number, sat: number): void {
  p.fill(215, sat * 0.35, 70)
  p.ellipse(0, 0, s * 0.9, s * 0.65)
  p.stroke(215, sat * 0.35, 65)
  p.strokeWeight(3)
  p.line(s * 0.25, -s * 0.25, s * 0.35, -s * 0.9)
  p.line(-s * 0.05, s * 0.3, -s * 0.05, s * 0.95)
  p.line(s * 0.15, s * 0.3, s * 0.15, s * 0.95)
  p.noStroke()
  p.fill(215, sat * 0.35, 72)
  p.ellipse(s * 0.38, -s * 0.95, s * 0.32, s * 0.28)
  p.fill(45, sat * 0.8, 78)
  p.triangle(s * 0.5, -s * 0.98, s * 0.85, -s * 0.92, s * 0.5, -s * 0.88)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.42, -s * 0.98, s * 0.07)
  p.fill(215, sat * 0.3, 60)
  p.ellipse(-s * 0.15, -s * 0.05, s * 0.5, s * 0.4)
}

function drawOtter(p: p5, s: number, sat: number): void {
  p.fill(28, sat * 0.55, 45)
  p.ellipse(0, 0, s * 1.35, s * 0.65)
  p.ellipse(-s * 0.8, s * 0.1, s * 0.5, s * 0.22)
  p.ellipse(s * 0.55, -s * 0.2, s * 0.5, s * 0.42)
  p.fill(28, sat * 0.5, 50)
  p.ellipse(s * 0.4, -s * 0.45, s * 0.15)
  p.ellipse(s * 0.72, -s * 0.42, s * 0.15)
  p.fill(28, sat * 0.3, 70)
  p.ellipse(s * 0.62, -s * 0.08, s * 0.3, s * 0.2)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.48, -s * 0.28, s * 0.08)
  p.ellipse(s * 0.68, -s * 0.25, s * 0.08)
  p.ellipse(s * 0.68, -s * 0.12, s * 0.09, s * 0.07)
}

function drawSnailTwilight(p: p5, s: number, sat: number): void {
  p.fill(35, sat * 0.6, 68)
  p.ellipse(0, s * 0.25, s * 1.2, s * 0.35)
  p.ellipse(s * 0.55, s * 0.05, s * 0.35, s * 0.4)
  p.stroke(35, sat * 0.6, 60)
  p.strokeWeight(1.5)
  p.line(s * 0.6, -s * 0.15, s * 0.5, -s * 0.45)
  p.line(s * 0.68, -s * 0.13, s * 0.75, -s * 0.42)
  p.noStroke()
  p.fill(35, sat * 0.6, 62)
  p.ellipse(s * 0.5, -s * 0.45, s * 0.09)
  p.ellipse(s * 0.75, -s * 0.42, s * 0.09)
  p.fill(280, sat * 0.5, 55)
  p.ellipse(-s * 0.15, -s * 0.1, s * 0.75)
  p.noFill()
  p.stroke(280, sat * 0.4, 40)
  p.strokeWeight(2)
  p.arc(-s * 0.15, -s * 0.1, s * 0.45, s * 0.45, 0, p.PI * 1.5)
  p.noStroke()
  p.fill(0, 0, 10)
  p.ellipse(s * 0.62, 0, s * 0.06)
}

function drawMoth(p: p5, s: number, sat: number, time: number): void {
  const flap = Math.sin(time * 5) * 0.3
  p.fill(50, sat * 0.35, 85, 0.9)
  p.push()
  p.rotate(-0.35 + flap)
  p.ellipse(-s * 0.5, 0, s * 1.1, s * 0.8)
  p.pop()
  p.push()
  p.rotate(0.35 - flap)
  p.ellipse(s * 0.5, 0, s * 1.1, s * 0.8)
  p.pop()
  p.fill(50, sat * 0.5, 70)
  p.push()
  p.rotate(-0.35 + flap)
  p.ellipse(-s * 0.45, s * 0.05, s * 0.3)
  p.pop()
  p.push()
  p.rotate(0.35 - flap)
  p.ellipse(s * 0.45, s * 0.05, s * 0.3)
  p.pop()
  p.fill(40, sat * 0.4, 45)
  p.ellipse(0, 0, s * 0.25, s * 0.7)
  p.stroke(40, sat * 0.4, 45)
  p.strokeWeight(1.5)
  p.line(-s * 0.05, -s * 0.3, -s * 0.2, -s * 0.55)
  p.line(s * 0.05, -s * 0.3, s * 0.2, -s * 0.55)
  p.noStroke()
}

function drawBeaver(p: p5, s: number, sat: number): void {
  p.fill(22, sat * 0.5, 30)
  p.ellipse(-s * 0.7, s * 0.15, s * 0.55, s * 0.35)
  p.fill(22, sat * 0.65, 40)
  p.ellipse(0, 0, s * 1.1, s * 0.85)
  p.fill(22, sat * 0.65, 45)
  p.ellipse(s * 0.42, -s * 0.35, s * 0.5, s * 0.45)
  p.ellipse(s * 0.28, -s * 0.6, s * 0.16)
  p.ellipse(s * 0.6, -s * 0.58, s * 0.16)
  p.fill(0, 0, 10)
  p.ellipse(s * 0.38, -s * 0.4, s * 0.08)
  p.ellipse(s * 0.58, -s * 0.38, s * 0.08)
  p.fill(22, sat * 0.4, 25)
  p.ellipse(s * 0.5, -s * 0.22, s * 0.14, s * 0.1)
  p.fill(0, 0, 95)
  p.rect(s * 0.44, -s * 0.16, s * 0.06, s * 0.12)
  p.rect(s * 0.51, -s * 0.16, s * 0.06, s * 0.12)
}

function drawBat(p: p5, s: number, sat: number, time: number): void {
  const flap = Math.sin(time * 7) * 0.25
  p.fill(270, sat * 0.35, 35)
  p.push()
  p.rotate(-0.2 + flap)
  p.beginShape()
  p.vertex(-s * 0.15, 0)
  p.vertex(-s * 1.0, -s * 0.35)
  p.vertex(-s * 0.75, 0)
  p.vertex(-s * 0.5, s * 0.12)
  p.endShape(p.CLOSE)
  p.pop()
  p.push()
  p.rotate(0.2 - flap)
  p.beginShape()
  p.vertex(s * 0.15, 0)
  p.vertex(s * 1.0, -s * 0.35)
  p.vertex(s * 0.75, 0)
  p.vertex(s * 0.5, s * 0.12)
  p.endShape(p.CLOSE)
  p.pop()
  p.fill(270, sat * 0.4, 42)
  p.ellipse(0, 0, s * 0.5, s * 0.6)
  p.triangle(-s * 0.18, -s * 0.25, -s * 0.22, -s * 0.5, -s * 0.02, -s * 0.3)
  p.triangle(s * 0.18, -s * 0.25, s * 0.22, -s * 0.5, s * 0.02, -s * 0.3)
  p.fill(50, sat * 0.7, 85)
  p.ellipse(-s * 0.1, -s * 0.12, s * 0.09)
  p.ellipse(s * 0.1, -s * 0.12, s * 0.09)
}

export const TWILIGHT_DRAWERS: Record<TwilightAnimalType, AnimalDrawer> = {
  frog: drawFrog,
  dragonfly: drawDragonfly,
  turtle: drawTurtle,
  duck: drawDuck,
  mouse: drawMouse,
  raccoon: drawRaccoon,
  heron: drawHeron,
  otter: drawOtter,
  snail: drawSnailTwilight,
  moth: drawMoth,
  beaver: drawBeaver,
  bat: drawBat,
}
