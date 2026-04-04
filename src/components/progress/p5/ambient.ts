import type { DrawContext } from './elements'
import type { AmbientData, AmbientCreature } from './types'

/**
 * Draw ambient creatures based on streak days using pre-computed positions.
 * 2+ days: butterflies, 5+ days: birds, 7+ days: fireflies.
 */
export function drawAmbient(ctx: DrawContext, streakDays: number, ambient: AmbientData): void {
  if (streakDays >= 2) drawButterflies(ctx, streakDays, ambient.butterflies)
  if (streakDays >= 5) drawBirds(ctx, ambient.birds)
  if (streakDays >= 7) drawFireflies(ctx, ambient.fireflies)
}

function drawButterflies(ctx: DrawContext, streakDays: number, data: AmbientCreature[]): void {
  const { p, time, width, height } = ctx
  const count = Math.min(2 + Math.floor((streakDays - 2) / 3), data.length)

  for (let i = 0; i < count; i++) {
    const b = data[i]
    const x = b.baseX + Math.sin(time * b.speed + b.offset) * width * 0.08
    const y = b.baseY + Math.cos(time * b.speed * 0.7 + b.offset) * height * 0.04
    const flap = Math.sin(time * 8 + b.offset) * 0.5

    p.push()
    p.translate(x, y)

    p.fill(b.hue, 55, 75, 0.7)
    p.push()
    p.rotate(-0.3 + flap)
    p.ellipse(-b.size * 0.4, 0, b.size * 1.1, b.size * 0.7)
    p.pop()
    p.push()
    p.rotate(0.3 - flap)
    p.ellipse(b.size * 0.4, 0, b.size * 1.1, b.size * 0.7)
    p.pop()

    p.fill(0, 0, 30, 0.7)
    p.ellipse(0, 0, b.size * 0.15, b.size * 0.5)

    p.pop()
  }
}

function drawBirds(ctx: DrawContext, data: AmbientCreature[]): void {
  const { p, time } = ctx

  for (const b of data) {
    const x = b.baseX
    const y = b.baseY + Math.sin(time * b.speed + b.offset) * 2

    p.push()
    p.translate(x, y)

    p.fill(200, 40, 55, 0.8)
    p.ellipse(0, 0, b.size * 0.9, b.size * 0.6)
    p.ellipse(b.size * 0.35, -b.size * 0.15, b.size * 0.4, b.size * 0.35)

    p.fill(40, 60, 70, 0.8)
    p.triangle(b.size * 0.5, -b.size * 0.15, b.size * 0.7, -b.size * 0.1, b.size * 0.5, -b.size * 0.05)

    p.fill(0, 0, 10)
    p.ellipse(b.size * 0.4, -b.size * 0.2, b.size * 0.07)

    p.fill(200, 45, 48, 0.8)
    p.triangle(-b.size * 0.3, 0, -b.size * 0.6, -b.size * 0.15, -b.size * 0.55, b.size * 0.1)

    p.pop()
  }
}

function drawFireflies(ctx: DrawContext, data: AmbientCreature[]): void {
  const { p, time } = ctx

  for (const f of data) {
    const x = f.baseX + Math.sin(time * f.speed + f.offset) * 8
    const y = f.baseY + Math.cos(time * f.speed * 0.6 + f.offset) * 6

    const glow = (Math.sin(time * 3 + f.offset) + 1) * 0.5
    const alpha = 0.3 + glow * 0.5
    const size = 3 + glow * 2

    p.fill(55, 70, 95, alpha * 0.3)
    p.ellipse(x, y, size * 3)

    p.fill(55, 80, 98, alpha)
    p.ellipse(x, y, size)
  }
}
