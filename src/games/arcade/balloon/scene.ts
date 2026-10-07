import { type Application, Container, Graphics } from 'pixi.js'
import type { Clef } from '../../../music/notes'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { staffStep } from '../staffGeometry'
import { type BalloonEvent, type BalloonGame, LANES } from './engine'

const SKY = 0xe8f6ff

export function createBalloonScene(
  app: Application,
  game: BalloonGame,
  clef: Clef,
  range: number[],
  onEvents: (events: BalloonEvent[]) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  root.addChild(bg, world)

  const steps = range.map((m) => staffStep(m, clef))
  const minStep = Math.min(...steps)
  const maxStep = Math.max(...steps)
  let size = { w: 0, h: 0 }
  const wobble = new Map<number, number>()

  return {
    tick(dtMs, now) {
      const { width: w, height: h } = app.screen
      if (w !== size.w || h !== size.h) {
        size = { w, h }
        bg.clear()
        bg.rect(0, 0, w, h).fill(SKY)
        // a few soft clouds
        for (const [cx, cy, r] of [
          [0.15, 0.2, 0.06],
          [0.7, 0.12, 0.05],
          [0.85, 0.55, 0.07],
          [0.3, 0.7, 0.05],
        ]) {
          bg.circle(cx * w, cy * h, r * w).fill({ color: 0xffffff, alpha: 0.8 })
          bg.circle((cx + r) * w, cy * h + r * w * 0.2, r * w * 0.8).fill({ color: 0xffffff, alpha: 0.8 })
        }
      }

      const events = game.update(dtMs, now)
      if (events.length) onEvents(events)

      const laneW = w / LANES
      const rx = Math.min(laneW * 0.46, h * 0.15)
      const ry = rx * 1.2
      world.clear()
      for (const b of game.balloons) {
        let phase = wobble.get(b.index)
        if (phase === undefined) {
          phase = Math.random() * Math.PI * 2
          wobble.set(b.index, phase)
        }
        const x = (b.lane + 0.5) * laneW + Math.sin(now / 600 + phase) * rx * 0.12
        const y = b.y * h

        if (b.state === 'popped') {
          const t = b.poppedFor / 0.4
          world.circle(x, y, rx * (1 + t)).stroke({ width: 4, color: b.color, alpha: 1 - t })
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2
            world.circle(x + Math.cos(a) * rx * (0.6 + t), y + Math.sin(a) * rx * (0.6 + t), rx * 0.08).fill({
              color: b.color,
              alpha: 1 - t,
            })
          }
          continue
        }

        // string, knot, balloon, shine
        world.moveTo(x, y + ry).bezierCurveTo(x - rx * 0.2, y + ry * 1.4, x + rx * 0.2, y + ry * 1.7, x, y + ry * 2.1)
        world.stroke({ width: 2, color: 0x8a94a6 })
        world.poly([x - rx * 0.12, y + ry * 1.05, x + rx * 0.12, y + ry * 1.05, x, y + ry * 0.92]).fill(b.color)
        world.ellipse(x, y, rx, ry).fill(b.color)
        world.ellipse(x - rx * 0.45, y - ry * 0.45, rx * 0.16, ry * 0.24).fill({ color: 0xffffff, alpha: 0.5 })

        // a small staff card with the note
        const cardW = rx * 1.62
        const cardH = rx * 1.45
        world.roundRect(x - cardW / 2, y - cardH / 2, cardW, cardH, rx * 0.18).fill({ color: 0xffffff, alpha: 0.95 })
        const span = Math.max(maxStep, 8) - Math.min(minStep, 0) + 2
        const gap = (cardH / span) * 2 * 0.95
        const layout = { gap, bottomY: y + cardH / 2 - (0 - (Math.min(minStep, 0) - 1)) * (gap / 2) }
        drawStaffLines(world, x - cardW * 0.42, x + cardW * 0.42, layout, 0x2b2f3a, 0.7)
        drawNote(world, x, staffStep(b.record.target, clef), layout)
      }
    },
  }
}
