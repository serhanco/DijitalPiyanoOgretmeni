import { type Application, CanvasTextMetrics, Container, Graphics, Text } from 'pixi.js'
import type { Clef } from '../../../music/notes'
import { kindOf } from '../bar/character'
import { drawCritter } from '../critter'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { staffStep } from '../staffGeometry'
import { type BalloonEvent, type BalloonGame, LANES } from './engine'
import { type Chute, danger, standX, startChute, stepChute, sway } from './rescue'

/** Sky by lesson progress: morning, noon, late afternoon, dusk. */
const SKIES = [0xe8f6ff, 0xdff4ff, 0xffe9d1, 0xd9d3ff]
/** SMuFL clef glyphs (Bravura) and the staff step their origin sits on. */
const CLEF_GLYPH: Record<Clef, { glyph: string; step: number }> = {
  treble: { glyph: '\uE050', step: 2 },
  bass: { glyph: '\uE062', step: 6 },
}
const GRASS = 0x7bd35a
const GRASS_DARK = 0x58b23c
const INK = 0x2b1a5c
const BASKET = 0xb9783a
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Dart {
  x0: number
  y0: number
  x1: number
  y1: number
  /** Seconds since it was shot. */
  age: number
  /** A wrong key: it flies past the balloon. */
  miss: boolean
}

const DART_S = 0.16

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
  const grass = new Graphics()
  const clefs = new Container()
  root.addChild(bg, world, clefs, grass)
  /** Per balloon: the clef drawn at the left of its staff, so it is clear which staff the note is on. */
  const clefOf = new Map<number, Text>()

  const steps = range.map((m) => staffStep(m, clef))
  const minStep = Math.min(...steps)
  const maxStep = Math.max(...steps)
  let size = { w: 0, h: 0 }
  let skyStage = -1
  const wobble = new Map<number, number>()
  // Reactions read from the game state: pops (a parachute), wrong keys (a missed dart).
  const popped = new Set<number>()
  const wrongSeen = new Map<number, number>()
  const shiver = new Map<number, number>()
  let chutes: Chute[] = []
  let darts: Dart[] = []
  const rescued: number[] = []

  function background(w: number, h: number, stage: number) {
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKIES[stage])
    if (stage === 3)
      for (const [sx, sy] of [
        [0.1, 0.08],
        [0.4, 0.2],
        [0.62, 0.06],
        [0.9, 0.28],
      ])
        bg.circle(sx * w, sy * h, 2).fill({ color: 0xffffff, alpha: 0.8 })
    // a sun that sinks as the lesson goes on
    bg.circle(w * 0.8, h * (0.14 + stage * 0.12), h * 0.07).fill(
      stage === 3 ? 0xfff8e0 : stage === 2 ? 0xffb347 : 0xfff1a8,
    )
  }

  function cloud(x: number, y: number, r: number) {
    world.circle(x, y, r).fill({ color: 0xffffff, alpha: 0.8 })
    world.circle(x + r, y + r * 0.2, r * 0.8).fill({ color: 0xffffff, alpha: 0.8 })
    world.circle(x - r * 0.9, y + r * 0.25, r * 0.65).fill({ color: 0xffffff, alpha: 0.8 })
  }

  function parachute(c: Chute, w: number, h: number, rx: number) {
    const x = c.x * w + (c.landed ? 0 : sway(c.age) * rx * 0.3)
    const y = c.y * h
    const pr = rx * 0.34
    if (!c.landed) {
      // canopy, lines and a happy passenger
      const cy = y - pr * 2.6
      world.moveTo(x - pr * 1.5, cy)
      world
        .arc(x, cy, pr * 1.5, Math.PI, 0)
        .closePath()
        .fill(c.color)
      world.moveTo(x - pr * 1.5, cy)
      world.arc(x, cy, pr * 1.5, Math.PI, 0).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 })
      for (const d of [-1, 0, 1])
        world
          .moveTo(x + d * pr * 1.5, cy)
          .lineTo(x, y - pr * 0.9)
          .stroke({ width: 1, color: 0x8a94a6 })
      drawCritter(world, kindOf(c.kind), x, y, pr, 'happy')
    }
  }

  return {
    tick(dtMs, now) {
      const { width: w, height: h } = app.screen
      const reduced = reducedMotion()
      const stage = reduced ? 0 : Math.min(3, Math.floor(game.progress * 4))
      if (w !== size.w || h !== size.h || stage !== skyStage) {
        size = { w, h }
        skyStage = stage
        background(w, h, stage)
      }

      const events = game.update(dtMs, now)
      if (events.length) onEvents(events)

      const laneW = w / LANES
      // Narrow enough that the outer lanes' balloons (and their wobble) stay on screen.
      const rx = Math.min(laneW * 0.38, h * 0.15)
      const ry = rx * 1.2
      const grassTop = h * 0.93
      const dt = dtMs / 1000
      world.clear()
      grass.clear()

      // slow clouds
      const drift = reduced ? 0 : (now / 90) % (w * 1.4)
      for (const [cx, cy, r] of [
        [0.15, 0.2, 0.06],
        [0.7, 0.12, 0.05],
        [0.85, 0.55, 0.07],
        [0.3, 0.7, 0.05],
      ])
        cloud(((cx * w - drift + w * 1.4) % (w * 1.4)) - w * 0.2, cy * h, r * w)

      const posOf = (b: (typeof game.balloons)[number]) => {
        let phase = wobble.get(b.index)
        if (phase === undefined) {
          phase = Math.random() * Math.PI * 2
          wobble.set(b.index, phase)
        }
        const sh = !reduced && (shiver.get(b.index) ?? 0) > now ? Math.sin(now / 24) * rx * 0.1 : 0
        return {
          x: (b.lane + 0.5) * laneW + (reduced ? 0 : Math.sin(now / 600 + phase) * rx * 0.1) + sh,
          y: b.y * h,
        }
      }

      for (const b of game.balloons) {
        const { x, y } = posOf(b)
        // A new pop: the dart that burst it, then the passenger's parachute.
        if (b.state === 'popped' && !popped.has(b.index)) {
          popped.add(b.index)
          darts.push({ x0: w / 2, y0: h, x1: x, y1: y, age: 0, miss: false })
          chutes.push(startChute(b.index, x / w, y / h, b.color))
        }
        // A new wrong key: a dart that misses and a shiver.
        const wrongs = b.record.wrongPresses.length
        if ((wrongSeen.get(b.index) ?? 0) < wrongs) {
          wrongSeen.set(b.index, wrongs)
          if (b.state === 'flying') {
            const side = x < w / 2 ? 1 : -1
            darts.push({ x0: w / 2, y0: h, x1: x + side * rx * 1.6, y1: y - ry * 0.6, age: 0, miss: true })
            shiver.set(b.index, now + 450)
          }
        }
      }

      for (const b of game.balloons) {
        const { x, y } = posOf(b)

        if (b.state === 'popped') {
          const t = b.poppedFor / 0.4
          world.circle(x, y, rx * (1 + t)).stroke({ width: 4, color: b.color, alpha: 1 - t })
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2
            const d = rx * (0.6 + t * 1.1)
            const px = x + Math.cos(a) * d
            const py = y + Math.sin(a) * d
            const c = i % 2 ? b.color : 0xffc800
            if (i % 3 === 0)
              world
                .poly([px, py - rx * 0.1, px + rx * 0.1, py, px, py + rx * 0.1, px - rx * 0.1, py])
                .fill({ color: c, alpha: 1 - t })
            else world.circle(px, py, rx * 0.08).fill({ color: c, alpha: 1 - t })
          }
          continue
        }

        // string and basket with the passenger (worried near the top)
        const dg = danger(b.y)
        const bx = x + (reduced ? 0 : Math.sin(now / 420 + b.index) * rx * 0.06)
        const by = y + ry * 1.95
        world
          .moveTo(x, y + ry)
          .bezierCurveTo(x - rx * 0.2, y + ry * 1.3, bx + rx * 0.2, y + ry * 1.6, bx, by - rx * 0.28)
        world.stroke({ width: 2, color: 0x8a94a6 })
        const pr = rx * 0.26
        drawCritter(world, kindOf(b.index), bx, by - rx * 0.12, pr, dg > 0 ? 'worried' : 'calm')
        if (dg > 0 && !reduced) {
          // a waving arm and a drop of sweat: "help!"
          const wave = Math.sin(now / 90) * 0.5
          world
            .moveTo(bx + pr * 0.9, by - pr * 0.2)
            .lineTo(bx + pr * 1.7, by - pr * (1.0 + wave))
            .stroke({ width: pr * 0.3, color: 0xffe0c2, cap: 'round' })
          world
            .poly([bx - pr * 1.0, by - pr * 1.3, bx - pr * 1.25, by - pr * 0.9, bx - pr * 0.75, by - pr * 0.9])
            .fill({ color: 0x4fc3f7, alpha: 0.4 + dg * 0.6 })
        }
        world.roundRect(bx - rx * 0.3, by - rx * 0.02, rx * 0.6, rx * 0.34, rx * 0.08).fill(BASKET)
        world
          .roundRect(bx - rx * 0.3, by - rx * 0.02, rx * 0.6, rx * 0.07, rx * 0.04)
          .fill({ color: 0xffffff, alpha: 0.25 })

        // knot, balloon, shine
        world.poly([x - rx * 0.12, y + ry * 1.05, x + rx * 0.12, y + ry * 1.05, x, y + ry * 0.92]).fill(b.color)
        world.ellipse(x, y, rx, ry).fill(b.color)
        world.ellipse(x - rx * 0.45, y - ry * 0.45, rx * 0.16, ry * 0.24).fill({ color: 0xffffff, alpha: 0.5 })

        // a small staff card with the note, high on the balloon so its colour shows around it
        const cardW = rx * 1.5
        const cardH = rx * 1.3
        const cy = y - ry * 0.08
        world.roundRect(x - cardW / 2, cy - cardH / 2, cardW, cardH, rx * 0.18).fill({ color: 0xffffff, alpha: 0.95 })
        const span = Math.max(maxStep, 8) - Math.min(minStep, 0) + 2
        const gap = (cardH / span) * 2 * 0.95
        const layout = { gap, bottomY: cy + cardH / 2 - (0 - (Math.min(minStep, 0) - 1)) * (gap / 2) }
        drawStaffLines(world, x - cardW * 0.42, x + cardW * 0.42, layout, 0x2b2f3a, 0.7)
        drawNote(world, x + cardW * 0.14, staffStep(b.record.target, clef), layout)
        let glyph = clefOf.get(b.index)
        if (!glyph) {
          glyph = new Text({
            text: CLEF_GLYPH[clef].glyph,
            // Bravura glyphs reach far outside the measured line box: pad the texture so they are not cut.
            style: { fontFamily: 'Bravura', fontSize: 10, fill: 0x2b2f3a, padding: 10 },
          })
          clefs.addChild(glyph)
          clefOf.set(b.index, glyph)
        }
        if (glyph.style.fontSize !== gap * 4) {
          glyph.style.fontSize = gap * 4
          glyph.style.padding = gap * 4
        }
        // The glyph's baseline sits on its reference line (G or F); Text is placed by its top.
        const ascent = CanvasTextMetrics.measureText(glyph.text, glyph.style).fontProperties.ascent
        glyph.position.set(x - cardW * 0.43, layout.bottomY - CLEF_GLYPH[clef].step * (gap / 2) - ascent + gap)
      }
      const flying = new Set(game.balloons.filter((b) => b.state !== 'popped').map((b) => b.index))
      for (const [index, glyph] of clefOf) {
        if (flying.has(index)) continue
        glyph.destroy()
        clefOf.delete(index)
      }

      // parachutes
      chutes = chutes.map((c) => {
        const next = stepChute(c, dt, grassTop / h - 0.03)
        if (!c.landed && next.landed) rescued.push(next.kind)
        return next
      })
      for (const c of chutes) parachute(c, w, h, rx)
      chutes = chutes.filter((c) => !c.landed)

      // darts: a quick streak from the bottom to the balloon (or past it)
      darts = darts.map((d) => ({ ...d, age: d.age + dt })).filter((d) => d.age < DART_S + 0.12)
      for (const d of darts) {
        const k = Math.min(1, d.age / DART_S)
        const x = d.x0 + (d.x1 - d.x0) * k
        const y = d.y0 + (d.y1 - d.y0) * k
        const tail = Math.max(0, k - 0.35)
        world
          .moveTo(d.x0 + (d.x1 - d.x0) * tail, d.y0 + (d.y1 - d.y0) * tail)
          .lineTo(x, y)
          .stroke({
            width: 3,
            color: d.miss ? 0x8a94a6 : INK,
            alpha: 1 - Math.max(0, d.age - DART_S) / 0.12,
            cap: 'round',
          })
        world.circle(x, y, 3.5).fill(d.miss ? 0x8a94a6 : 0xffc800)
      }

      // grass strip with the rescued passengers (balloons rise from behind it)
      grass.rect(0, grassTop, w, h - grassTop).fill(GRASS)
      grass.rect(0, grassTop, w, 3).fill(GRASS_DARK)
      for (let i = 0; i < 14; i++)
        grass
          .moveTo((i + 0.5) * (w / 14), grassTop + 3)
          .lineTo((i + 0.5) * (w / 14) + 4, grassTop - 5)
          .stroke({ width: 2, color: GRASS_DARK })
      const pr = Math.min(rx * 0.26, (h - grassTop) * 0.9)
      rescued.forEach((kind, n) => {
        const hop = reduced ? 0 : Math.max(0, Math.sin(now / 260 + n * 1.3)) * pr * 0.25
        drawCritter(grass, kindOf(kind), standX(n, rescued.length) * w, grassTop + pr * 0.7 - hop, pr, 'happy')
      })
    },
    destroy() {
      for (const glyph of clefOf.values()) glyph.destroy()
      clefOf.clear()
    },
  }
}
