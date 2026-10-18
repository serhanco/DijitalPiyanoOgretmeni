import { type Application, Container, Graphics, Text } from 'pixi.js'
import { type Clef, solfegeName } from '../../../music/notes'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { fitStaff, type StaffLayout, staffStep, stepY } from '../staffGeometry'
import { type FrogEvent, type FrogGame, JUMP_S, jumpLabel } from './engine'

const WATER = 0xcdeefc
const WATER_DEEP = 0xa8e0f5
const PAD = 0x58cc02
const PAD_DARK = 0x3f9b00
const FROG = 0x7bd389
const FROG_DARK = 0x3f9b5a
const INK = 0x2b1a5c
const ACCENT = 0x7c4dff

/** Where the frog sits and where the next pad floats, as shares of the width. */
const FROG_X = 0.3
const PAD_X = 0.68
/** The frog's pad slides back to FROG_X when a new pad comes up. */
const SLIDE_S = 0.3

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const ease = (t: number) => 1 - (1 - t) ** 2

interface Ring {
  x: number
  y: number
  age: number
}

export function createFrogScene(
  app: Application,
  game: FrogGame,
  clef: Clef,
  range: number[],
  onEvents: (events: FrogEvent[]) => void,
  onLayout: (layout: StaffLayout) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const fx = new Graphics()
  const labels = new Container()
  root.addChild(bg, world, fx, labels)
  const reduced = reducedMotion()

  const steps = range.map((m) => staffStep(m, clef))
  const minStep = Math.min(...steps)
  const maxStep = Math.max(...steps)
  let layout: StaffLayout = fitStaff(app.screen.height, minStep, maxStep)
  let size = { w: 0, h: 0 }
  let rings: Ring[] = []
  let labelFor = -1
  const jumpText = new Text({
    text: '',
    style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontSize: 18, fontWeight: '900', fill: 0xffffff },
  })
  const nameText = new Text({
    text: '',
    style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontSize: 14, fontWeight: '900', fill: INK },
  })
  jumpText.anchor.set(0.5, 0.5)
  nameText.anchor.set(0.5, 0)
  labels.addChild(jumpText, nameText)

  function layoutIfResized() {
    const { width: w, height: h } = app.screen
    if (w === size.w && h === size.h) return
    size = { w, h }
    layout = fitStaff(h * 0.9, minStep, maxStep, 2.4, w / 12)
    bg.clear()
    bg.rect(0, 0, w, h).fill(WATER)
    // gentle bands of deeper water and reeds on the edges
    for (let i = 0; i < 4; i++) bg.rect(0, h * (0.2 + i * 0.22), w, h * 0.05).fill({ color: WATER_DEEP, alpha: 0.35 })
    for (const x of [w * 0.03, w * 0.06, w * 0.95, w * 0.975]) {
      bg.roundRect(x, h * 0.55, 4, h * 0.45, 2).fill(0x6fa83a)
      bg.ellipse(x + 2, h * 0.55, 5, 14).fill(0x8a5a2b)
    }
    drawStaffLines(bg, 0, w, layout, 0x2b2f3a, 0.45)
    jumpText.style.fontSize = Math.max(13, layout.gap * 0.95)
    nameText.style.fontSize = Math.max(11, layout.gap * 0.8)
    onLayout(layout)
  }

  function lilyPad(x: number, y: number, rx: number, alpha: number, squash = 1) {
    world.ellipse(x, y + rx * 0.08, rx, rx * 0.42 * squash).fill({ color: PAD_DARK, alpha })
    world.ellipse(x, y, rx, rx * 0.4 * squash).fill({ color: PAD, alpha })
    // the notch
    world.poly([x, y, x + rx * 0.95, y - rx * 0.1, x + rx * 0.95, y + rx * 0.12]).fill({ color: WATER, alpha })
  }

  function frog(x: number, y: number, r: number, mood: 'calm' | 'happy' | 'sad' | 'oops', swim: boolean) {
    // legs (hidden while swimming)
    if (!swim)
      for (const d of [-1, 1]) world.ellipse(x + d * r * 0.85, y + r * 0.35, r * 0.45, r * 0.25).fill(FROG_DARK)
    world.ellipse(x, y, r, r * 0.78).fill(FROG)
    world.ellipse(x, y + r * 0.28, r * 0.62, r * 0.36).fill({ color: 0xffffff, alpha: 0.35 })
    for (const d of [-1, 1]) {
      const ex = x + d * r * 0.45
      const ey = y - r * 0.62
      world.circle(ex, ey, r * 0.34).fill(FROG)
      if (mood === 'happy') {
        world
          .moveTo(ex - r * 0.17, ey + r * 0.04)
          .quadraticCurveTo(ex, ey - r * 0.16, ex + r * 0.17, ey + r * 0.04)
          .stroke({ width: r * 0.09, color: INK, cap: 'round' })
      } else {
        world.circle(ex, ey, r * 0.24).fill(0xffffff)
        const look = mood === 'oops' ? r * 0.08 * d : r * 0.04
        world.circle(ex + look, ey + (mood === 'sad' ? r * 0.06 : 0), r * 0.12).fill(INK)
      }
    }
    world.circle(x - r * 0.62, y + r * 0.02, r * 0.13).fill({ color: 0xff8fb1, alpha: 0.7 })
    world.circle(x + r * 0.62, y + r * 0.02, r * 0.13).fill({ color: 0xff8fb1, alpha: 0.7 })
    if (mood === 'sad' || mood === 'oops')
      world
        .moveTo(x - r * 0.3, y + r * 0.3)
        .quadraticCurveTo(x, y + r * 0.12, x + r * 0.3, y + r * 0.3)
        .stroke({ width: r * 0.08, color: INK, cap: 'round' })
    else
      world
        .moveTo(x - r * 0.4, y + r * 0.12)
        .quadraticCurveTo(x, y + r * 0.42, x + r * 0.4, y + r * 0.12)
        .stroke({ width: r * 0.08, color: INK, cap: 'round' })
    if (swim) world.rect(x - r * 1.3, y + r * 0.35, r * 2.6, r * 0.6).fill({ color: WATER, alpha: 0.85 })
  }

  return {
    tick(dtMs, now) {
      layoutIfResized()
      const events = game.update(dtMs, now)
      if (events.length) onEvents(events)
      const { w } = size
      const { gap } = layout
      const rx = Math.min(gap * 1.5, w * 0.09)
      const fr = rx * 0.55
      const yOf = (midi: number) => stepY(staffStep(midi, clef), layout)
      for (const e of events) if (e.type === 'splash') rings.push({ x: PAD_X * w, y: yOf(e.pad.record.target), age: 0 })

      world.clear()
      const p = game.pad
      const wobble = !reduced && now - game.wrongAt < 400 ? Math.sin(now / 30) * fr * 0.15 : 0

      if (p && p.state === 'floating') {
        // the frog's pad slides back to its place, the new pad fades in
        const slide = reduced ? 1 : ease(Math.min(1, p.since / SLIDE_S))
        const fx0 = (PAD_X + (FROG_X - PAD_X) * slide) * w
        const fy = yOf(p.from)
        lilyPad(fx0, fy, rx, 1)
        const left = game.floatLeft
        const sinking = left < 0.35 ? left / 0.35 : 1
        const bob = reduced ? 0 : Math.sin(now / 400) * gap * 0.08
        const px = PAD_X * w
        const py = yOf(p.record.target) + bob
        lilyPad(px, py, rx * (0.75 + 0.25 * sinking), 0.35 + 0.65 * sinking * slide, sinking)
        drawNote(world, px, staffStep(p.record.target, clef), layout, ACCENT)
        if (!reduced && left < 0.35)
          world.circle(px, py, rx * (1.1 + (1 - sinking) * 0.4)).stroke({ width: 2, color: 0xffffff, alpha: 0.6 })
        frog(
          fx0 + wobble,
          fy - fr * 0.55,
          fr,
          now - game.wrongAt < 600 ? 'oops' : game.streak >= 3 ? 'happy' : 'calm',
          false,
        )
        // the jump to make, in a bubble above the pad; the note the frog sits on, under its pad
        if (labelFor !== p.index) {
          labelFor = p.index
          jumpText.text = jumpLabel(p.from, p.record.target)
          nameText.text = solfegeName(p.from)
        }
        const top = Math.min(py, yOf(p.from)) - gap * 2.6
        const bw = jumpText.width + gap
        world.roundRect(px - bw / 2, top - gap * 0.75, bw, gap * 1.5, gap * 0.6).fill(ACCENT)
        world.poly([px - gap * 0.3, top + gap * 0.7, px + gap * 0.3, top + gap * 0.7, px, top + gap * 1.1]).fill(ACCENT)
        jumpText.position.set(px, top)
        jumpText.alpha = slide
        nameText.position.set(fx0, fy + rx * 0.5)
        nameText.alpha = 1
      } else if (p) {
        // landed: the frog leaps in an arc; sunk: it swims over
        const t = Math.min(1, p.since / JUMP_S)
        const e = reduced ? 1 : ease(t)
        const x0 = FROG_X * w
        const x1 = PAD_X * w
        const y0 = yOf(p.from)
        const y1 = yOf(p.record.target)
        if (p.state === 'landed') {
          lilyPad(x0, y0, rx, 1 - e * 0.5)
          lilyPad(x1, y1, rx, 1)
          const arc = reduced ? 0 : Math.sin(t * Math.PI) * gap * 3
          frog(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - fr * 0.55 - arc, fr, 'happy', false)
        } else {
          lilyPad(x0, y0, rx, 1 - e * 0.5)
          frog(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, fr, 'sad', true)
        }
        jumpText.alpha = 0
        nameText.alpha = 0
      } else {
        lilyPad(FROG_X * w, yOf(game.at), rx, 1)
        frog(FROG_X * w, yOf(game.at) - fr * 0.55, fr, 'calm', false)
        nameText.text = solfegeName(game.at)
        nameText.position.set(FROG_X * w, yOf(game.at) + rx * 0.5)
        jumpText.alpha = 0
      }

      fx.clear()
      rings = rings.filter((r) => (r.age += dtMs) < 900)
      for (const r of rings) {
        const k = r.age / 900
        fx.ellipse(r.x, r.y, rx * (0.6 + k * 1.4), rx * (0.25 + k * 0.5)).stroke({
          width: 3,
          color: 0xffffff,
          alpha: 1 - k,
        })
      }
    },
  }
}
