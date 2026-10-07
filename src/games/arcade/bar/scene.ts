import { type Application, CanvasTextMetrics, Container, Graphics, Text } from 'pixi.js'
import { type Clef, naturalClef } from '../../../music/notes'
import { drawNote, drawStaffLines, INK } from '../draw'
import type { Scene } from '../PixiStage'
import { staffStep } from '../staffGeometry'
import { BAR_X, type BarEvent, type BarGame, clefOfCounter, COUNTERS, type Customer } from './engine'

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

function clefText(clef: Clef, size: number): Text {
  return new Text({
    text: CLEF_GLYPH[clef].glyph,
    style: { fontFamily: 'Bravura', fontSize: size, fill: INK },
  })
}

/**
 * Draw the bar: four counters (two treble, two bass), customers holding a
 * card with their note, sliding drinks and the bartender on the right.
 * The lesson's notes (`range`, `bothStaves`) size each staff's note cards.
 */
export function createBarScene(
  app: Application,
  game: BarGame,
  range: number[],
  bothStaves: number[],
  onEvents: (events: BarEvent[]) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const cards = new Container()
  const front = new Graphics()
  root.addChild(bg, world, cards, front)
  const signs = new Container()
  root.addChild(signs)

  // Steps each staff's notes need, for the card layout.
  const stepSpan = (clef: Clef) => {
    const own = range.filter((m) => naturalClef(m) === clef || bothStaves.includes(m))
    const steps = [...own.map((m) => staffStep(m, clef)), 0, 8]
    return { lo: Math.min(...steps) - 1, hi: Math.max(...steps) + 1 }
  }
  const spans = { treble: stepSpan('treble'), bass: stepSpan('bass') }

  /** Per customer: its card container (white card, staff, note, clef). */
  const cardOf = new Map<number, { box: Container; g: Graphics; clef: Text }>()
  let size = { w: 0, h: 0 }
  let bartenderRow = 1.5
  let shakeT = 0
  let lastServedRow: number | null = null

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
    bg.rect(0, rh * 2 - 2, w, 4).fill({ color: INK, alpha: 0.35 })
    // counters and taps
    for (let row = 0; row < COUNTERS; row++) {
      const y = counterY(row)
      bg.rect(left(), y, barPx() - left() + rh * 0.2, rh * 0.14).fill(WOOD)
      bg.rect(left(), y - rh * 0.03, barPx() - left() + rh * 0.2, rh * 0.05).fill(WOOD_TOP)
      bg.roundRect(barPx() + rh * 0.12, y - rh * 0.3, rh * 0.1, rh * 0.3, 3).fill(0x8a94a6)
    }
  }

  function drawCustomer(c: Customer, now: number) {
    const rh = rowH()
    const r = rh * 0.17
    const x = xOf(c.x) + (c.state === 'served' ? -c.leftFor * rh * 1.4 : 0)
    const bob = c.state === 'waiting' ? Math.abs(Math.sin(now / 160 + c.index)) * r * 0.25 : 0
    const y = counterY(c.counter) - r * 0.55 - bob
    const alpha = c.state === 'waiting' ? 1 : Math.max(0, 1 - c.leftFor / 0.8)
    const shake = c.state === 'angry' ? Math.sin(now / 25) * r * 0.25 : 0
    const color = c.state === 'angry' ? 0xff4b4b : SKIN[c.look % SKIN.length]
    world.circle(x + shake, y, r).fill({ color, alpha })
    // eyes look towards the bartender; happy customers squint
    for (const dx of [-0.32, 0.32]) {
      if (c.state === 'served') {
        world
          .moveTo(x + (dx + 0.12) * r - r * 0.14, y - r * 0.15)
          .lineTo(x + (dx + 0.12) * r, y - r * 0.28)
          .lineTo(x + (dx + 0.12) * r + r * 0.14, y - r * 0.15)
          .stroke({ width: Math.max(1.5, r * 0.12), color: INK, alpha })
      } else {
        world.circle(x + shake + (dx + 0.12) * r, y - r * 0.2, r * 0.2).fill({ color: 0xffffff, alpha })
        world.circle(x + shake + (dx + 0.2) * r, y - r * 0.2, r * 0.1).fill({ color: INK, alpha })
      }
    }
  }

  function drawCard(c: Customer) {
    const rh = rowH()
    const clef = c.record.clef ?? 'treble'
    let card = cardOf.get(c.index)
    if (!card) {
      const box = new Container()
      const g = new Graphics()
      const glyph = clefText(clef, 10)
      box.addChild(g, glyph)
      cards.addChild(box)
      card = { box, g, clef: glyph }
      cardOf.set(c.index, card)
    }
    const cardH = rh * 0.62
    const cardW = cardH * 1.3
    const { lo, hi } = spans[clef]
    const gap = (cardH / (hi - lo)) * 2
    const layout = { gap, bottomY: cardH - (0 - lo) * (gap / 2) }
    const g = card.g
    g.clear()
    const border = c.state === 'angry' ? 0xff4b4b : c.state === 'served' ? 0x22a559 : 0xd5dbe1
    g.roundRect(0, 0, cardW, cardH, cardH * 0.12)
      .fill(0xffffff)
      .stroke({ width: 2, color: border })
    drawStaffLines(g, cardW * 0.06, cardW * 0.94, layout, INK, 0.7)
    drawNote(g, cardW * 0.66, staffStep(c.record.target, clef), layout, c.state === 'served' ? 0x22a559 : INK)
    if (card.clef.style.fontSize !== gap * 4) card.clef.style.fontSize = gap * 4
    // The glyph's baseline sits on its reference line (G or F); Text is placed by its top.
    const ascent = CanvasTextMetrics.measureText(card.clef.text, card.clef.style).fontProperties.ascent
    card.clef.position.set(cardW * 0.08, layout.bottomY - CLEF_GLYPH[clef].step * (gap / 2) - ascent)
    const x = xOf(c.x) + (c.state === 'served' ? -c.leftFor * rh * 1.4 : 0)
    card.box.position.set(x - cardW / 2, c.counter * rh + rh * 0.02)
    card.box.alpha = c.state === 'waiting' ? 1 : Math.max(0, 1 - c.leftFor / 0.8)
  }

  function drawBartender(now: number) {
    const rh = rowH()
    const r = rh * 0.3
    const x = size.w * 0.93
    const y = counterY(bartenderRow) - r * 0.7
    const wiggle = shakeT > 0 ? Math.sin(now / 20) * r * 0.15 : 0
    front.circle(x + wiggle, y, r).fill(BARTENDER)
    front.circle(x - r * 0.35, y - r * 0.2, r * 0.22).fill(0xffffff)
    front.circle(x - r * 0.42, y - r * 0.2, r * 0.11).fill(INK)
    front.circle(x + r * 0.2, y - r * 0.2, r * 0.22).fill(0xffffff)
    front.circle(x + r * 0.13, y - r * 0.2, r * 0.11).fill(INK)
    front
      .moveTo(x - r * 0.38, y + r * 0.2)
      .quadraticCurveTo(x - r * 0.08, y + r * 0.55, x + r * 0.22, y + r * 0.2)
      .stroke({ width: Math.max(2, r * 0.1), color: INK })
    // bow tie
    front.poly([x - r * 0.35, y + r * 0.62, x, y + r * 0.78, x - r * 0.35, y + r * 0.95]).fill(0xff4b4b)
    front.poly([x + r * 0.35, y + r * 0.62, x, y + r * 0.78, x + r * 0.35, y + r * 0.95]).fill(0xff4b4b)
  }

  return {
    tick(dtMs, now) {
      layoutIfResized()
      const events = game.update(dtMs, now)
      if (events.some((e) => e.type === 'angry')) shakeT = 0.35
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
      drawBartender(now)

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
