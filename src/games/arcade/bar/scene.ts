import { type Application, Container, Graphics, type Sprite, Text } from 'pixi.js'
import { type Clef, naturalClef } from '../../../music/notes'
import { clefSprite, placeClef } from '../clef'
import { drawNote, drawStaffLines, INK } from '../draw'
import type { Scene } from '../PixiStage'
import { staffStep } from '../staffGeometry'
import {
  bartenderLook,
  type BartenderLook,
  type BarEyes,
  type BarMouth,
  juggleBottle,
  KIND_COLOR,
  kindOf,
  type MoodState,
  nextMood,
  patienceOf,
  servedFx,
} from './character'
import { BAR_X } from './engine'

/** What the scene needs of a customer, in both bar games. */
export interface BarCustomer {
  index: number
  counter: number
  x: number
  look: number
  state: 'waiting' | 'served' | 'angry'
  leftFor: number
}

/** The game the bar draws: Nota Barmeni or Akor Barmeni. */
export interface BarView<C extends BarCustomer, E extends { type: string }> {
  /** The staff of each counter, top to bottom. */
  rows: Clef[]
  customers: C[]
  drinks: { counter: number; x: number }[]
  update(dtMs: number, now: number): E[]
  /** The latest serve or mistake, for the bartender's reaction. */
  lastPress?: { kind: 'serve' | 'wrong'; at: number } | null
}

export interface BarSceneOptions<C> {
  /** Staff steps each staff's cards must fit (see `noteSpans`, `chordSpans`). */
  spans: Partial<Record<Clef, { lo: number; hi: number }>>
  /** A customer's order: the notes on the card, and a name written beside them. */
  order: (c: C) => { clef: Clef; notes: number[]; name?: string }
}

type Span = { lo: number; hi: number }
const spanOf = (steps: number[]): Span => {
  const all = [...steps, 0, 8]
  return { lo: Math.min(...all) - 1, hi: Math.max(...all) + 1 }
}

/** Card spans for single notes: the lesson's notes (`range`, `bothStaves`) per staff. */
export function noteSpans(range: number[], bothStaves: number[]): Record<Clef, Span> {
  const steps = (clef: Clef) =>
    range.filter((m) => naturalClef(m) === clef || bothStaves.includes(m)).map((m) => staffStep(m, clef))
  return { treble: spanOf(steps('treble')), bass: spanOf(steps('bass')) }
}

/** Card spans for chords, each read on the staff of its notes. */
export function chordSpans(chords: { clef: Clef; notes: number[] }[]): Partial<Record<Clef, Span>> {
  const out: Partial<Record<Clef, Span>> = {}
  for (const clef of ['treble', 'bass'] as Clef[]) {
    const own = chords.filter((c) => c.clef === clef)
    if (own.length) out[clef] = spanOf(own.flatMap((c) => c.notes.map((m) => staffStep(m, clef))))
  }
  return out
}

const label = (text: string, size: number) =>
  new Text({
    text,
    style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontSize: size, fontWeight: '900', fill: INK },
  })

/** SMuFL clef glyphs (Bravura) and the staff step their origin sits on. */
const CLEF_GLYPH: Record<Clef, { glyph: string; step: number }> = {
  treble: { glyph: '', step: 2 },
  bass: { glyph: '', step: 6 },
}
const ROW_BG: Record<Clef, number> = { treble: 0xfff3dc, bass: 0xe3f2ff }
const WOOD = 0xa0622d
const WOOD_TOP = 0xc47f3f
const SKIN = [0xffc800, 0xff9fb2, 0x7bd389, 0x9fb7ff, 0xffa95e, 0xd6a2ff]
const BARTENDER = 0xce82ff
const BARTENDER_DARK = 0xa85fe0
const APRON = 0xffffff
const BOTTLE = 0x58cc02
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const GOLD_LED = 0xffc800

function heart(g: Graphics, x: number, y: number, r: number, color: number, alpha: number) {
  g.circle(x - r * 0.5, y - r * 0.2, r * 0.55).fill({ color, alpha })
  g.circle(x + r * 0.5, y - r * 0.2, r * 0.55).fill({ color, alpha })
  g.poly([x - r * 1.0, y, x + r * 1.0, y, x, y + r * 1.15]).fill({ color, alpha })
}

function clefText(clef: Clef, size: number): Text {
  return new Text({
    text: CLEF_GLYPH[clef].glyph,
    // Bravura glyphs reach far outside the measured line box: pad the texture so they are not cut.
    style: { fontFamily: 'Bravura', fontSize: size, fill: INK, padding: size },
  })
}

/**
 * Draw the bar: a counter per row (treble rows above bass rows), customers
 * holding a card with their order, sliding drinks and the bartender on the
 * right.
 */
export function createBarScene<C extends BarCustomer, E extends { type: string }>(
  app: Application,
  game: BarView<C, E>,
  { spans, order }: BarSceneOptions<C>,
  onEvents: (events: E[]) => void,
): Scene {
  const COUNTERS = game.rows.length
  const clefOfCounter = (row: number) => game.rows[row]
  const handLine = game.rows.indexOf('bass')
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const cards = new Container()
  const front = new Graphics()
  root.addChild(bg, world, cards, front)
  const signs = new Container()
  root.addChild(signs)

  /** Per customer: its card container (white card, staff, notes, clef, name). */
  const cardOf = new Map<number, { box: Container; g: Graphics; clef: Sprite | null; name: Text | null }>()
  let size = { w: 0, h: 0 }
  let bartenderRow = (COUNTERS - 1) / 2
  let shakeT = 0
  let lastServedRow: number | null = null
  let mood: MoodState = { mood: 'idle', since: -1e9 }
  let streak = 0
  let seenPress: number | null = null

  const rowH = () => size.h / COUNTERS
  const left = () => size.w * 0.13
  const barPx = () => size.w * 0.84
  // Customers enter right of the door sign, so their card does not cover it.
  const door = () => left() + rowH() * 0.42
  const xOf = (x: number) => door() + (x / BAR_X) * (barPx() - door())
  const counterY = (row: number) => row * rowH() + rowH() * 0.84

  function layoutIfResized() {
    const { width: w, height: h } = app.screen
    if (w === size.w && h === size.h) return
    size = { w, h }
    const rh = rowH()
    bg.clear()
    signs.removeChildren().forEach((c) => c.destroy())
    for (let row = 0; row < COUNTERS; row++) {
      const clef = clefOfCounter(row)
      const top = row * rh
      bg.rect(0, top, w, rh).fill(ROW_BG[clef])
      // back wall shelf with bottles
      for (let i = 0; i < 5; i++) {
        const bx = left() + ((i + 0.5) / 5) * (barPx() - left())
        bg.roundRect(bx - rh * 0.04, top + rh * 0.08, rh * 0.08, rh * 0.2, 2).fill({
          color: SKIN[(i + row) % 6],
          alpha: 0.25,
        })
      }
      // the sign by the door: the staff this counter reads
      bg.roundRect(4, top + rh * 0.12, left() - 8, rh * 0.76, 8).fill({ color: 0xffffff, alpha: 0.9 })
      const sign = clefText(clef, Math.min(rh * 0.42, left() * 0.9))
      sign.anchor.set(0.5, 0.5)
      sign.position.set(left() / 2, top + rh * (clef === 'treble' ? 0.52 : 0.42))
      signs.addChild(sign)
    }
    // the line between the right hand's and the left hand's counters
    if (handLine > 0) bg.rect(0, rh * handLine - 2, w, 4).fill({ color: INK, alpha: 0.35 })
    // counters and taps
    for (let row = 0; row < COUNTERS; row++) {
      const y = counterY(row)
      bg.rect(left(), y, barPx() - left() + rh * 0.2, rh * 0.14).fill(WOOD)
      bg.rect(left(), y - rh * 0.03, barPx() - left() + rh * 0.2, rh * 0.05).fill(WOOD_TOP)
      bg.roundRect(barPx() + rh * 0.12, y - rh * 0.3, rh * 0.1, rh * 0.3, 3).fill(0x8a94a6)
    }
  }

  function drawCustomer(c: C, now: number) {
    const rh = rowH()
    const r = rh * 0.185
    const reduced = reducedMotion()
    const kind = kindOf(c.look)
    const waiting = c.state === 'waiting'
    const patience = waiting ? patienceOf(c.x / BAR_X) : 'calm'
    const x0 = xOf(c.x) + (c.state === 'served' ? -c.leftFor * rh * 1.4 : 0)
    // bobbing walk; an impatient customer bounces on the spot, an angry one stomps
    const rate = patience === 'calm' ? 160 : patience === 'tapping' ? 110 : 160
    const bob =
      waiting && !reduced ? Math.abs(Math.sin(now / rate + c.index)) * r * (patience === 'calm' ? 0.25 : 0.18) : 0
    const stomp = c.state === 'angry' && !reduced ? Math.abs(Math.sin(c.leftFor * 18)) * r * 0.5 : 0
    const y = counterY(c.counter) - r * 0.62 - bob - stomp
    const alpha = waiting ? 1 : Math.max(0, 1 - c.leftFor / 0.8)
    const shake = (c.state === 'angry' || patience === 'steaming') && !reduced ? Math.sin(now / 25) * r * 0.2 : 0
    const x = x0 + shake
    const color = c.state === 'angry' ? 0xff4b4b : KIND_COLOR[kind]
    const dark = c.state === 'angry' ? 0xcc3a3a : 0x000000
    const darkAlpha = c.state === 'angry' ? 1 : 0.18
    const fill = { color, alpha }
    // ears and other things behind the head
    if (kind === 'cat') {
      for (const d of [-1, 1])
        world
          .poly([x + d * r * 0.95, y - r * 0.2, x + d * r * 0.3, y - r * 1.05, x + d * r * 0.1, y - r * 0.6 - r * 0.25])
          .fill(fill)
    } else if (kind === 'bear') {
      for (const d of [-1, 1]) world.circle(x + d * r * 0.78, y - r * 0.78, r * 0.34).fill(fill)
    } else if (kind === 'bunny') {
      for (const d of [-1, 1]) {
        world.ellipse(x + d * r * 0.42, y - r * 1.35, r * 0.2, r * 0.62).fill(fill)
        world.ellipse(x + d * r * 0.42, y - r * 1.3, r * 0.1, r * 0.4).fill({ color: 0xffffff, alpha: alpha * 0.55 })
      }
    } else if (kind === 'octopus') {
      for (let i = -1; i <= 1; i++) world.circle(x + i * r * 0.62, y + r * 0.85, r * 0.26).fill(fill)
    } else if (kind === 'robot') {
      world
        .moveTo(x, y - r)
        .lineTo(x, y - r * 1.4)
        .stroke({ width: 2, color: 0x8a94a6, alpha })
      world
        .circle(x, y - r * 1.45, r * 0.16)
        .fill({ color: patience === 'steaming' || c.state === 'angry' ? 0xff4b4b : GOLD_LED, alpha })
    }
    // head
    if (kind === 'robot') world.roundRect(x - r, y - r * 0.9, r * 2, r * 1.8, r * 0.38).fill(fill)
    else if (kind === 'frog') {
      world.circle(x, y, r).fill(fill)
      for (const d of [-1, 1]) world.circle(x + d * r * 0.55, y - r * 0.78, r * 0.36).fill(fill)
    } else world.circle(x, y, r).fill(fill)
    world.ellipse(x - r * 0.3, y - r * 0.5, r * 0.35, r * 0.16).fill({ color: 0xffffff, alpha: alpha * 0.25 })
    // tummy/cheek shade so the head is not a flat disc
    world.circle(x, y, r).stroke({ width: 1.5, color: dark, alpha: darkAlpha * alpha })
    if (kind === 'bear') world.ellipse(x, y + r * 0.35, r * 0.45, r * 0.32).fill({ color: 0xf6dcb8, alpha })
    if (kind === 'cat')
      for (const d of [-1, 1]) {
        world
          .moveTo(x + d * r * 0.55, y + r * 0.28)
          .lineTo(x + d * r * 1.15, y + r * 0.18)
          .stroke({ width: 1.2, color: INK, alpha: alpha * 0.6 })
        world
          .moveTo(x + d * r * 0.55, y + r * 0.4)
          .lineTo(x + d * r * 1.15, y + r * 0.5)
          .stroke({ width: 1.2, color: INK, alpha: alpha * 0.6 })
      }
    world.circle(x - r * 0.62, y + r * 0.25, r * 0.13).fill({ color: 0xff8fb1, alpha: alpha * 0.65 })
    world.circle(x + r * 0.62, y + r * 0.25, r * 0.13).fill({ color: 0xff8fb1, alpha: alpha * 0.65 })
    // eyes look towards the bartender; happy customers squint, impatient ones glance up
    for (const dx of [-0.32, 0.32]) {
      const ex = x + (dx + 0.12) * r
      if (c.state === 'served') {
        world
          .moveTo(ex - r * 0.14, y - r * 0.15)
          .lineTo(ex, y - r * 0.28)
          .lineTo(ex + r * 0.14, y - r * 0.15)
          .stroke({ width: Math.max(1.5, r * 0.12), color: INK, alpha })
      } else if (c.state === 'angry') {
        world
          .moveTo(ex - r * 0.2, y - r * 0.42)
          .lineTo(ex + r * 0.2 * -dx * 3, y - r * 0.28)
          .stroke({ width: 2, color: INK, alpha })
        world.circle(ex, y - r * 0.12, r * 0.12).fill({ color: INK, alpha })
      } else {
        world.circle(ex, y - r * 0.2, r * 0.2).fill({ color: 0xffffff, alpha })
        const glance = patience === 'watching' ? Math.sin(now / 300 + c.index) * 0.05 : 0.08
        world.circle(ex + r * (0.08 + glance), y - r * 0.2, r * 0.1).fill({ color: INK, alpha })
        if (patience === 'steaming' || patience === 'watching')
          world
            .moveTo(ex - r * 0.2, y - r * 0.5)
            .lineTo(ex + r * 0.2, y - r * (patience === 'steaming' ? 0.4 : 0.5))
            .stroke({ width: 1.8, color: INK, alpha })
      }
    }
    // mouth: smile → flat → frown
    const mx = x + r * 0.12
    const my = y + r * 0.42
    const line = { width: Math.max(1.5, r * 0.1), color: INK, alpha, cap: 'round' as const }
    if (c.state === 'served') {
      world
        .poly([mx - r * 0.3, my - r * 0.06, mx + r * 0.3, my - r * 0.06, mx, my + r * 0.3])
        .fill({ color: INK, alpha })
    } else if (c.state === 'angry') {
      world.ellipse(mx, my + r * 0.05, r * 0.22, r * 0.16).fill({ color: INK, alpha })
    } else if (patience === 'calm') {
      world
        .moveTo(mx - r * 0.25, my)
        .quadraticCurveTo(mx, my + r * 0.25, mx + r * 0.25, my)
        .stroke(line)
    } else if (patience === 'tapping')
      world
        .moveTo(mx - r * 0.2, my + r * 0.05)
        .lineTo(mx + r * 0.2, my + r * 0.05)
        .stroke(line)
    else
      world
        .moveTo(mx - r * 0.25, my + r * 0.15)
        .quadraticCurveTo(mx, my - r * 0.1, mx + r * 0.25, my + r * 0.15)
        .stroke(line)

    if (!reduced) {
      // tapping: little impact marks beside the head, alternating
      if (patience === 'tapping') {
        const on = Math.floor(now / 220 + c.index) % 2
        const sx = x + (on ? r * 1.15 : -r * 1.15)
        for (const [dy, len] of [
          [-0.15, 0.2],
          [0.05, 0.28],
        ])
          world
            .moveTo(sx, y + dy * r)
            .lineTo(sx + (on ? len : -len) * r, y + dy * r)
            .stroke({ width: 2, color: INK, alpha: 0.55 })
      }
      // watching: a hand with a wristwatch next to the head
      if (patience === 'watching') {
        world.circle(x + r * 1.25, y + r * 0.1, r * 0.3).fill({ color: 0xffffff, alpha })
        world.circle(x + r * 1.25, y + r * 0.1, r * 0.3).stroke({ width: 2, color: INK, alpha })
        const a = now / 400
        world
          .moveTo(x + r * 1.25, y + r * 0.1)
          .lineTo(x + r * 1.25 + Math.cos(a) * r * 0.2, y + r * 0.1 + Math.sin(a) * r * 0.2)
          .stroke({ width: 1.8, color: INK, alpha })
      }
      // steaming: puffs of steam from the head
      if (patience === 'steaming' || c.state === 'angry') {
        for (let i = 0; i < 3; i++) {
          const k = (now / 700 + i / 3 + c.index * 0.13) % 1
          const a = alpha * (1 - k) * 0.7
          world
            .circle(
              x + (i - 1) * r * 0.55 + Math.sin(k * 6 + i) * r * 0.1,
              y - r * (1.15 + k * 0.9),
              r * (0.14 + k * 0.14),
            )
            .fill({ color: 0xffffff, alpha: a })
        }
      }
    }
    if (c.state === 'served') {
      const fx = servedFx(c.leftFor)
      // a sip from the glass, then a heart and a coin float up
      const gx = x + r * (1.5 - fx.sip * 0.95)
      const gy = y + r * (0.9 - fx.sip * 0.75)
      world
        .roundRect(gx - r * 0.2, gy - r * 0.3, r * 0.4, r * 0.55, 3)
        .fill({ color: 0xffc800, alpha: alpha * (1 - fx.sip * 0.6) })
      world.roundRect(gx - r * 0.2, gy - r * 0.38, r * 0.4, r * 0.14, 3).fill({ color: 0xffffff, alpha })
      heart(world, x - r * 0.1, y - r * (1.3 + fx.rise * 1.1), r * 0.3, 0xff4b6e, fx.fade)
      world.circle(x + r * 0.9, y - r * (0.9 + fx.rise * 1.3), r * 0.2).fill({ color: GOLD_LED, alpha: fx.fade })
      world
        .circle(x + r * 0.9, y - r * (0.9 + fx.rise * 1.3), r * 0.2)
        .stroke({ width: 1.5, color: 0xe0a800, alpha: fx.fade })
    }
    if (c.state === 'angry') {
      // the red "anger" mark
      const mxk = x + r * 0.8
      const myk = y - r * 1.1
      for (const d of [-1, 1])
        world
          .moveTo(mxk - r * 0.2, myk - d * r * 0.05)
          .lineTo(mxk + r * 0.2, myk - d * r * 0.05)
          .stroke({ width: 3, color: 0xff2e2e, alpha })
    }
  }

  function drawCard(c: C) {
    const rh = rowH()
    const { clef, notes, name } = order(c)
    let card = cardOf.get(c.index)
    if (!card) {
      const box = new Container()
      const g = new Graphics()
      box.addChild(g)
      const text = name ? label(name, 10) : null
      if (text) {
        text.anchor.set(0.5, 0.5)
        box.addChild(text)
      }
      cards.addChild(box)
      card = { box, g, clef: null, name: text }
      cardOf.set(c.index, card)
    }
    // Never taller than on four counters: with three, the card would cover its customer.
    const cardH = Math.min(rh, size.h / 4) * 0.54
    const cardW = cardH * (card.name ? 1.9 : 1.3)
    const { lo, hi } = spans[clef] ?? spanOf([])
    const gap = (cardH / (hi - lo)) * 2
    const layout = { gap, bottomY: cardH - (0 - lo) * (gap / 2) }
    const g = card.g
    g.clear()
    const border = c.state === 'angry' ? 0xff4b4b : c.state === 'served' ? 0x22a559 : 0xd5dbe1
    g.roundRect(0, 0, cardW, cardH, cardH * 0.12)
      .fill(0xffffff)
      .stroke({ width: 2, color: border })
    const staffEnd = card.name ? 0.62 : 0.94
    drawStaffLines(g, cardW * 0.06, cardW * staffEnd, layout, INK, 0.7)
    const color = c.state === 'served' ? 0x22a559 : INK
    for (const m of notes) drawNote(g, cardW * (card.name ? 0.42 : 0.66), staffStep(m, clef), layout, color)
    if (card.name) {
      card.name.style.fontSize = Math.max(10, cardH * 0.26)
      card.name.position.set(cardW * 0.81, cardH / 2)
    }
    if (!card.clef) {
      // null until Bravura has loaded; the next frame tries again
      const glyph = clefSprite(clef)
      if (glyph) {
        glyph.tint = 0x3a3f4b
        glyph.alpha = 0.85
        card.box.addChild(glyph)
        card.clef = glyph
      }
    }
    if (card.clef) placeClef(card.clef, clef, cardW * 0.06, layout.bottomY, gap)
    const x = xOf(c.x) + (c.state === 'served' ? -c.leftFor * rh * 1.4 : 0)
    card.box.position.set(x - cardW / 2, c.counter * rh + rh * 0.02)
    card.box.alpha = c.state === 'waiting' ? 1 : Math.max(0, 1 - c.leftFor / 0.8)
  }

  /** A bottle (or glass) as a rotated polygon on `g`. */
  function bottle(g: Graphics, x: number, y: number, h: number, rot: number, color: number, alpha = 1) {
    const pts = [
      [-0.28, 0.5],
      [0.28, 0.5],
      [0.28, -0.1],
      [0.1, -0.25],
      [0.1, -0.5],
      [-0.1, -0.5],
      [-0.1, -0.25],
      [-0.28, -0.1],
    ].flatMap(([px, py]) => [
      x + (px * Math.cos(rot) - py * Math.sin(rot)) * h,
      y + (px * Math.sin(rot) + py * Math.cos(rot)) * h,
    ])
    g.poly(pts).fill({ color, alpha })
  }

  function eyeAt(x: number, y: number, r: number, eyes: BarEyes, side: -1 | 1) {
    const line = { width: Math.max(2, r * 0.09), color: INK, cap: 'round' as const }
    if (eyes === 'happy' || (eyes === 'wink' && side === 1)) {
      front
        .moveTo(x - r * 0.17, y + r * 0.05)
        .quadraticCurveTo(x, y - r * 0.2, x + r * 0.17, y + r * 0.05)
        .stroke(line)
    } else if (eyes === 'blink') {
      front
        .moveTo(x - r * 0.16, y)
        .lineTo(x + r * 0.16, y)
        .stroke(line)
    } else {
      const big = eyes === 'wide'
      front.circle(x, y, r * (big ? 0.27 : 0.22)).fill(0xffffff)
      front.circle(x - r * 0.07, y, r * (big ? 0.08 : 0.11)).fill(INK)
    }
  }

  function mouthAt(x: number, y: number, r: number, kind: BarMouth) {
    if (kind === 'grin') {
      front.poly([x - r * 0.28, y - r * 0.04, x + r * 0.28, y - r * 0.04, x, y + r * 0.3]).fill(INK)
    } else if (kind === 'oops') front.ellipse(x, y + r * 0.08, r * 0.14, r * 0.18).fill(INK)
    else
      front
        .moveTo(x - r * 0.28, y)
        .quadraticCurveTo(x, y + r * 0.3, x + r * 0.28, y)
        .stroke({ width: Math.max(2, r * 0.1), color: INK, cap: 'round' })
  }

  function drawBartender(now: number, look: BartenderLook) {
    const rh = rowH()
    const r = rh * 0.26
    const base = counterY(bartenderRow)
    const x = size.w * 0.92 + look.dx * r
    const y = base - r * 1.6 + look.dy * r
    // torso (behind the counter's front edge) with apron
    front.roundRect(x - r * 0.85, y + r * 0.7, r * 1.7, base - (y + r * 0.7), r * 0.3).fill(BARTENDER_DARK)
    front.roundRect(x - r * 0.5, y + r * 1.05, r * 1, base - (y + r * 1.05), r * 0.2).fill(APRON)
    front.roundRect(x - r * 0.3, y + r * 1.45, r * 0.6, r * 0.38, r * 0.1).stroke({ width: 1.5, color: 0xd5dbe1 })
    // arms from the shoulders: the hand goes up with the lift
    const hand = (side: -1 | 1, lift: number) => {
      const sx = x + side * r * 0.82
      const sy = y + r * 1.0
      const hx = sx + side * r * (0.35 - lift * 0.15)
      const hy = sy + r * (0.55 - lift * 1.9)
      front
        .moveTo(sx, sy)
        .lineTo(hx, hy)
        .stroke({ width: r * 0.3, color: BARTENDER_DARK, cap: 'round' })
      front.circle(hx, hy, r * 0.2).fill(0xffe0c2)
      return { x: hx, y: hy }
    }
    const left = hand(-1, look.armL)
    const right = hand(1, look.armR)
    // head, hair tuft, cheeks
    front.circle(x, y, r).fill(BARTENDER)
    front.poly([x - r * 0.1, y - r * 0.95, x, y - r * 1.4, x + r * 0.2, y - r * 0.95]).fill(BARTENDER_DARK)
    front.circle(x - r * 0.62, y + r * 0.22, r * 0.13).fill({ color: 0xff8fb1, alpha: 0.7 })
    front.circle(x + r * 0.62, y + r * 0.22, r * 0.13).fill({ color: 0xff8fb1, alpha: 0.7 })
    eyeAt(x - r * 0.35, y - r * 0.15, r, look.eyes, -1)
    eyeAt(x + r * 0.35, y - r * 0.15, r, look.eyes, 1)
    // moustache and mouth
    front.ellipse(x - r * 0.22, y + r * 0.2, r * 0.26, r * 0.1).fill(0x5a2d82)
    front.ellipse(x + r * 0.22, y + r * 0.2, r * 0.26, r * 0.1).fill(0x5a2d82)
    mouthAt(x, y + r * 0.38, r, look.mouth)
    // bow tie
    front.poly([x - r * 0.38, y + r * 0.95, x, y + r * 1.1, x - r * 0.38, y + r * 1.25]).fill(0xff4b4b)
    front.poly([x + r * 0.38, y + r * 0.95, x, y + r * 1.1, x + r * 0.38, y + r * 1.25]).fill(0xff4b4b)
    front.circle(x, y + r * 1.1, r * 0.08).fill(0xc92f2f)
    // props: a tossed bottle, a slipping glass, three juggled bottles
    if (look.toss !== null) {
      const k = look.toss
      bottle(
        front,
        right.x - r * 0.1,
        right.y - r * (0.4 + Math.sin(k * Math.PI) * 1.9),
        r * 0.8,
        k * Math.PI * 4,
        BOTTLE,
      )
    } else if (look.juggling) {
      for (let i = 0; i < 3; i++) {
        const b = juggleBottle(i, now)
        bottle(
          front,
          x - r * 0.1 + b.x * r * 1.2,
          left.y - r * (0.5 + b.h * 1.7),
          r * 0.7,
          b.spin,
          [BOTTLE, 0xff9600, 0x1cb0f6][i],
        )
      }
    } else bottle(front, right.x + r * 0.05, right.y - r * 0.35, r * 0.8, 0.15, BOTTLE)
    if (look.slip !== null) {
      const k = look.slip
      const gy = right.y + r * (0.2 + k * 1.2)
      bottle(
        front,
        right.x + r * 0.2,
        Math.min(gy, base - r * 0.1),
        r * 0.5,
        k * 3,
        0xbfe9ff,
        1 - Math.max(0, k - 0.7) / 0.3,
      )
      if (k > 0.7)
        front
          .ellipse(right.x + r * 0.2, base - r * 0.05, r * 0.5 * (k - 0.7) * 3, r * 0.08)
          .fill({ color: 0xbfe9ff, alpha: 1 - k })
    }
    if (look.sweat > 0.01)
      front
        .poly([x + r * 0.95, y - r * 0.6, x + r * 0.85, y - r * 0.38, x + r * 1.05, y - r * 0.38])
        .fill({ color: 0x4fc3f7, alpha: look.sweat })
  }

  return {
    tick(dtMs, now) {
      layoutIfResized()
      const events = game.update(dtMs, now)
      if (events.some((e) => e.type === 'angry')) {
        shakeT = 0.35
        mood = nextMood(mood, 'angry', now)
        streak = 0
      }
      const press = game.lastPress
      if (press && press.at !== seenPress) {
        seenPress = press.at
        mood = nextMood(mood, press.kind === 'serve' ? 'serve' : 'wrong', now)
        streak = press.kind === 'serve' ? streak + 1 : 0
      }
      if (events.length) onEvents(events)
      shakeT = Math.max(0, shakeT - dtMs / 1000)

      const served = game.drinks[game.drinks.length - 1]
      if (served && served.counter !== lastServedRow) lastServedRow = served.counter
      if (lastServedRow !== null) bartenderRow += (lastServedRow - bartenderRow) * Math.min(1, dtMs / 90)

      world.clear()
      front.clear()
      const rh = rowH()
      for (const c of game.customers) drawCustomer(c, now)
      for (const d of game.drinks) {
        const x = xOf(d.x)
        const y = counterY(d.counter)
        const mw = rh * 0.16
        const mh = rh * 0.2
        world.roundRect(x - mw / 2, y - mh, mw, mh, 3).fill(0xffc800)
        world.roundRect(x - mw / 2 - 1, y - mh - mh * 0.25, mw + 2, mh * 0.3, 4).fill(0xffffff)
        world.roundRect(x + mw / 2, y - mh * 0.8, mw * 0.3, mh * 0.5, 3).stroke({ width: 2, color: 0xe0a800 })
      }
      // counters in front of the customers
      for (let row = 0; row < COUNTERS; row++) {
        const y = counterY(row)
        front.rect(left(), y, barPx() - left() + rh * 0.2, rh * 0.14).fill(WOOD)
      }
      drawBartender(now, bartenderLook(mood, streak, now, reducedMotion()))

      const alive = new Set(game.customers.map((c) => c.index))
      for (const [index, card] of cardOf) {
        if (alive.has(index)) continue
        card.box.destroy({ children: true })
        cardOf.delete(index)
      }
      for (const c of game.customers) drawCard(c)
    },
    destroy() {
      for (const card of cardOf.values()) card.box.destroy({ children: true })
      cardOf.clear()
    },
  }
}
