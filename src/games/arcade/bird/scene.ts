import { type Application, Container, Graphics } from 'pixi.js'
import type { Clef } from '../../../music/notes'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { fitStaff, type StaffLayout, staffStep, stepY } from '../staffGeometry'
import { BIRD_X, type BirdEvent, type BirdGame } from './engine'

const SKY_TOP = 0xdff4ff
const PIPE = 0x58cc02
const PIPE_DARK = 0x46a302
const BIRD = 0xffc800
const BIRD_DARK = 0xf0a500

export function createBirdScene(
  app: Application,
  game: BirdGame,
  clef: Clef,
  range: number[],
  onEvents: (events: BirdEvent[]) => void,
  onLayout: (layout: StaffLayout) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const bird = new Graphics()
  root.addChild(bg, world, bird)

  const steps = range.map((m) => staffStep(m, clef))
  const minStep = Math.min(...steps)
  const maxStep = Math.max(...steps)
  let layout: StaffLayout = fitStaff(app.screen.height, minStep, maxStep)
  let size = { w: 0, h: 0 }
  let flapT = 1
  let lastStep = game.birdStep
  let shakeT = 0

  function layoutIfResized() {
    const { width: w, height: h } = app.screen
    if (w === size.w && h === size.h) return
    size = { w, h }
    layout = fitStaff(h, minStep, maxStep, 1.5, w / 11)
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKY_TOP)
    drawStaffLines(bg, 0, w, layout, 0x2b2f3a, 0.55)
    onLayout(layout)
  }

  function drawBird(x: number, y: number, r: number) {
    bird.clear()
    const wing = Math.sin(Math.min(1, flapT) * Math.PI) * r * 0.5
    bird.circle(0, 0, r).fill(BIRD)
    bird.ellipse(-r * 0.15, r * 0.25, r * 0.55, r * 0.4).fill(0xfff1b8)
    bird.ellipse(-r * 0.45, -wing * 0.6 + r * 0.05, r * 0.5, r * 0.28).fill(BIRD_DARK)
    bird.circle(r * 0.38, -r * 0.28, r * 0.28).fill(0xffffff)
    bird.circle(r * 0.46, -r * 0.28, r * 0.13).fill(0x2b1a5c)
    bird.poly([r * 0.8, -r * 0.05, r * 1.35, r * 0.12, r * 0.8, r * 0.32]).fill(0xff9600)
    bird.position.set(x, y)
    bird.rotation = Math.max(-0.4, Math.min(0.4, (game.birdStep - game.birdY) * -0.12))
  }

  return {
    tick(dtMs, now) {
      layoutIfResized()
      const events = game.update(dtMs, now)
      if (events.some((e) => e.type === 'crash')) shakeT = 0.35
      if (events.length) onEvents(events)
      if (game.birdStep !== lastStep) {
        lastStep = game.birdStep
        flapT = 0
      }
      flapT += dtMs / 250
      shakeT = Math.max(0, shakeT - dtMs / 1000)

      const { w, h } = size
      const { gap } = layout
      const pipeW = gap * 1.7
      const opening = gap * 1.25
      world.clear()
      for (const p of game.pipes) {
        const x = p.x * w
        const cy = stepY(p.step, layout)
        const color = p.state === 'crashed' ? 0xff4b4b : PIPE
        const alpha = p.state === 'flying' ? 1 : 0.55
        // top and bottom columns with caps
        world.rect(x - pipeW / 2, -10, pipeW, cy - opening / 2 + 10).fill({ color, alpha })
        world.rect(x - pipeW / 2, cy + opening / 2, pipeW, h - cy - opening / 2 + 10).fill({ color, alpha })
        world
          .rect(x - pipeW * 0.62, cy - opening / 2 - gap * 0.5, pipeW * 1.24, gap * 0.5)
          .fill({ color: PIPE_DARK, alpha })
        world.rect(x - pipeW * 0.62, cy + opening / 2, pipeW * 1.24, gap * 0.5).fill({ color: PIPE_DARK, alpha })
        if (p.state === 'flying') drawNote(world, x, p.step, layout)
      }

      const shake = shakeT > 0 ? Math.sin(now / 20) * gap * 0.25 : 0
      drawBird(BIRD_X * w + shake, stepY(game.birdY, layout), gap * 0.55)
    },
  }
}
