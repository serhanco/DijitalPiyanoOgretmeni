import { type Application, Container, Graphics } from 'pixi.js'
import type { Clef } from '../../../music/notes'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { fitStaff, type StaffLayout, staffStep, stepY } from '../staffGeometry'
import { LEAVE_S, SIGNAL_X, type TrainEvent, type TrainGame } from './engine'

const SKY = 0xe9f6ff
const HILL = 0xc7ecb0
const RAIL = 0x7a5c3e
const SLEEPER = 0xa77b50
const ENGINE = 0xff4b4b
const ENGINE_DARK = 0xc62828
const WAGONS = [0x1cb0f6, 0xffc800, 0x58cc02, 0xce82ff, 0xff9600]
const ACCENT = 0x7c4dff
const INK = 0x2b1a5c

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Puff {
  x: number
  y: number
  age: number
}

export function createTrainScene(
  app: Application,
  game: TrainGame,
  clef: Clef,
  range: number[],
  onEvents: (events: TrainEvent[]) => void,
  onLayout: (layout: StaffLayout) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const fx = new Graphics()
  root.addChild(bg, world, fx)
  const reduced = reducedMotion()

  const steps = range.map((m) => staffStep(m, clef))
  const minStep = Math.min(...steps)
  const maxStep = Math.max(...steps)
  let layout: StaffLayout = fitStaff(app.screen.height * 0.66, minStep, maxStep)
  let size = { w: 0, h: 0 }
  let railY = 0
  let puffs: Puff[] = []
  let sincePuff = 0
  // The engine bobs a little after each coupling.
  let bump = 0

  function layoutIfResized() {
    const { width: w, height: h } = app.screen
    if (w === size.w && h === size.h) return
    size = { w, h }
    layout = fitStaff(h * 0.62, minStep, maxStep, 1.2, w / 14)
    railY = h * 0.88
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKY)
    // soft hills behind the track
    bg.moveTo(0, railY)
    for (let x = 0; x <= w; x += w / 8) bg.lineTo(x, railY - h * (0.06 + 0.04 * Math.sin(x / (w / 3))))
    bg.lineTo(w, railY).closePath().fill(HILL)
    drawStaffLines(bg, 0, w, layout, 0x2b2f3a, 0.55)
    // sleepers and two rails
    const sleeper = Math.max(10, w / 40)
    for (let x = 0; x < w; x += sleeper * 1.6) bg.rect(x, railY - 2, sleeper, h * 0.035).fill(SLEEPER)
    bg.rect(0, railY - 3, w, 3).fill(RAIL)
    bg.rect(0, railY + h * 0.02, w, 3).fill(RAIL)
    onLayout(layout)
  }

  function drawWagon(x: number, color: number, front: boolean, tilt: number, alpha: number) {
    const { gap } = layout
    const ww = Math.min(gap * 2.2, size.w * 0.12)
    const wh = ww * 0.55
    const y = railY - wh * 0.35 + tilt * wh * 1.4
    const cx = x + tilt * ww * 0.3
    if (front) world.roundRect(cx - ww / 2 - 4, y - wh - 4, ww + 8, wh + 8, 8).fill({ color: ACCENT, alpha: 0.35 })
    world.roundRect(cx - ww / 2, y - wh, ww, wh, ww * 0.12).fill({ color, alpha })
    world.rect(cx - ww / 2, y - wh * 0.3, ww, wh * 0.12).fill({ color: 0xffffff, alpha: alpha * 0.35 })
    for (const dx of [-0.28, 0.28]) {
      world.circle(cx + dx * ww, y + wh * 0.05, ww * 0.12).fill({ color: INK, alpha })
      world.circle(cx + dx * ww, y + wh * 0.05, ww * 0.05).fill({ color: 0xdddddd, alpha })
    }
    return { y: y - wh, ww }
  }

  function drawEngine(now: number) {
    const { gap } = layout
    const ww = Math.min(gap * 2.6, size.w * 0.14)
    const x = Math.max(ww * 0.6, SIGNAL_X * size.w - ww * 0.9)
    const bob = reduced ? 0 : Math.sin(now / 90) * 1.2 - bump * ww * 0.08
    const y = railY - ww * 0.2 + bob
    // cab, boiler, chimney, cow-catcher
    world.roundRect(x - ww * 0.55, y - ww * 0.75, ww * 0.42, ww * 0.62, ww * 0.06).fill(ENGINE_DARK)
    world.rect(x - ww * 0.5, y - ww * 0.68, ww * 0.3, ww * 0.22).fill(0xbfe8ff)
    world.roundRect(x - ww * 0.15, y - ww * 0.48, ww * 0.62, ww * 0.36, ww * 0.16).fill(ENGINE)
    world.rect(x + ww * 0.25, y - ww * 0.72, ww * 0.12, ww * 0.26).fill(INK)
    world.poly([x + ww * 0.47, y - ww * 0.12, x + ww * 0.62, y, x + ww * 0.47, y]).fill(INK)
    // a friendly face on the boiler's front
    world.circle(x + ww * 0.36, y - ww * 0.32, ww * 0.05).fill(0xffffff)
    world.circle(x + ww * 0.37, y - ww * 0.32, ww * 0.025).fill(INK)
    world
      .moveTo(x + ww * 0.3, y - ww * 0.22)
      .quadraticCurveTo(x + ww * 0.37, y - ww * 0.17, x + ww * 0.44, y - ww * 0.22)
      .stroke({ width: ww * 0.03, color: INK, cap: 'round' })
    for (const dx of [-0.38, -0.05, 0.3]) {
      world.circle(x + dx * ww, y + ww * 0.02, ww * 0.12).fill(INK)
      world.circle(x + dx * ww, y + ww * 0.02, ww * 0.05).fill(0xdddddd)
    }
    return { chimneyX: x + ww * 0.31, chimneyY: y - ww * 0.74, ww }
  }

  function drawSignal(green: boolean) {
    const x = SIGNAL_X * size.w
    const { gap } = layout
    const top = railY - gap * 3.2
    world.rect(x - 2, top, 4, railY - top).fill(0x555555)
    world.roundRect(x - gap * 0.4, top - gap * 0.9, gap * 0.8, gap * 1.0, gap * 0.2).fill(0x333333)
    world.circle(x, top - gap * 0.4, gap * 0.26).fill(green ? 0x58cc02 : 0xff4b4b)
  }

  return {
    tick(dtMs, now) {
      layoutIfResized()
      const events = game.update(dtMs, now)
      if (events.length) onEvents(events)
      if (events.some((e) => e.type === 'couple')) bump = 1
      bump = Math.max(0, bump - dtMs / 300)

      const { w } = size
      world.clear()
      const front = game.front
      // The front wagon close to the signal turns it red.
      drawSignal(!front || front.x - SIGNAL_X > 0.12)
      for (const wg of game.wagons) {
        const color = WAGONS[wg.index % WAGONS.length]
        const t = Math.min(1, wg.since / LEAVE_S)
        let x = wg.x * w
        let tilt = 0
        let alpha = 1
        if (wg.state === 'coupled') {
          // slides into the engine and fades
          x = x + (SIGNAL_X * w - x) * t
          alpha = 1 - t
        } else if (wg.state === 'derailed') {
          tilt = reduced ? 0 : t
          alpha = 1 - t * 0.8
        }
        const isFront = wg === front
        const top = drawWagon(x, wg.state === 'derailed' ? 0xff4b4b : color, isFront, tilt, alpha)
        if (wg.state === 'coming') {
          const step = staffStep(wg.record.target, clef)
          // a dotted pole from the wagon up to its note
          const ny = stepY(step, layout)
          for (let y = top.y - 4; y > ny + layout.gap * 0.7; y -= 8)
            world.rect(x - 1, y - 3, 2, 4).fill({ color: 0x2b2f3a, alpha: 0.25 })
          drawNote(world, x, step, layout, isFront ? ACCENT : 0x2b2f3a)
        }
      }
      const loco = drawEngine(now)

      // chimney smoke, more of it after a coupling
      sincePuff += dtMs
      if (!reduced && sincePuff > (bump > 0 ? 90 : 420)) {
        sincePuff = 0
        puffs.push({ x: loco.chimneyX, y: loco.chimneyY, age: 0 })
      }
      fx.clear()
      puffs = puffs.filter((p) => (p.age += dtMs) < 1600)
      for (const p of puffs) {
        const k = p.age / 1600
        fx.circle(p.x - k * loco.ww * 0.6, p.y - k * loco.ww * 1.2, loco.ww * (0.08 + k * 0.18)).fill({
          color: 0xffffff,
          alpha: 0.8 * (1 - k),
        })
      }
    },
  }
}
