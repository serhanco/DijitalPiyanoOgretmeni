import { type Application, Container, Graphics, Text } from 'pixi.js'
import { chordSymbol } from '../../../music/chords'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { fitStaff, staffStep } from '../staffGeometry'
import { BASE_Y, type Invader, LINGER_S, SPACE_LANES, type SpaceEvent, type SpaceGame, START_Y } from './engine'

const SKY_TOP = 0x1b1446
const SKY_BOTTOM = 0x3b2a7a
const GROUND = 0x58cc02
const GROUND_DARK = 0x3c9a00
const CANNON = 0xff9600
const LASER = 0x7df9ff
const SAUCERS = [0xce82ff, 0x1cb0f6, 0xff86c8, 0xffc800]
const INK = 0x2b2f3a
/** Share of the height an invader falls while it fades in. */
const FADE_IN_Y = 0.05

export interface SpaceSceneOptions {
  /** Write the chord's name under the invader (first lessons). */
  showName: boolean
  /** Keys of the chord being played, to light the cannon. */
  playing: (now: number) => number[]
}

const label = (text: string, size: number) =>
  new Text({
    text,
    style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontSize: size, fontWeight: '900', fill: 0xffffff },
  })

/** Stars at fixed spots: the same sky every frame. */
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: (Math.sin(i * 12.9898) * 43758.5453) % 1,
  y: (Math.sin(i * 78.233) * 12345.678) % 1,
  r: 0.6 + (i % 3) * 0.5,
}))

export function createSpaceScene(
  app: Application,
  game: SpaceGame,
  { showName, playing }: SpaceSceneOptions,
  onEvents: (events: SpaceEvent[]) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const names = new Container()
  root.addChild(bg, world, names)
  let size = { w: 0, h: 0 }
  const nameOf = new Map<number, Text>()
  /** One drawing layer per invader, so each can fade in on its own. */
  const layers = new Map<number, Graphics>()
  let cannonX = -1

  function background(w: number, h: number) {
    bg.clear()
    const bands = 12
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1)
      const mix = (a: number, b: number, s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
      const color =
        (mix(SKY_TOP, SKY_BOTTOM, 16) << 16) | (mix(SKY_TOP, SKY_BOTTOM, 8) << 8) | mix(SKY_TOP, SKY_BOTTOM, 0)
      bg.rect(0, (h * i) / bands, w, h / bands + 1).fill(color)
    }
    for (const s of STARS)
      bg.circle(Math.abs(s.x) * w, Math.abs(s.y) * h * BASE_Y, s.r).fill({ color: 0xffffff, alpha: 0.8 })
    bg.circle(w * 0.85, h * 0.12, Math.min(w, h) * 0.06).fill({ color: 0xffe9a8, alpha: 0.9 })
    // the planet surface with the base
    const groundY = h * (BASE_Y + 0.06)
    bg.ellipse(w / 2, groundY + h * 0.4, w * 0.9, h * 0.42).fill(GROUND)
    bg.ellipse(w / 2, groundY + h * 0.4, w * 0.9, h * 0.42).stroke({ width: 3, color: GROUND_DARK })
  }

  function drawInvader(world: Graphics, inv: Invader, x: number, y: number, unit: number, now: number) {
    const color = SAUCERS[inv.index % SAUCERS.length]
    if (inv.state === 'hit') {
      const t = Math.min(1, inv.since / LINGER_S)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        world
          .circle(
            x + Math.cos(a) * unit * (0.3 + t * 1.2),
            y + Math.sin(a) * unit * (0.3 + t * 1.2),
            unit * 0.12 * (1 - t),
          )
          .fill({ color: i % 2 ? 0xffc800 : color, alpha: 1 - t })
      }
      world.circle(x, y, unit * (0.4 + t)).stroke({ width: 3, color: 0xffffff, alpha: 1 - t })
      return
    }
    const landed = inv.state === 'landed'
    const bob = landed ? 0 : Math.sin(now / 400 + inv.index) * unit * 0.05
    const cy = y + bob
    // the card with the chord, held under the saucer
    const cardW = unit * 1.9
    const cardH = unit * 1.55
    const cardY = cy + unit * 0.28
    world
      .roundRect(x - cardW / 2, cardY, cardW, cardH, unit * 0.16)
      .fill({ color: 0xffffff, alpha: landed ? 0.5 : 0.97 })
    world.roundRect(x - cardW / 2, cardY, cardW, cardH, unit * 0.16).stroke({ width: 2, color })
    const notes = inv.record.chord.notes
    const steps = notes.map((n) => staffStep(n.midi, n.clef))
    const fit = fitStaff(cardH, Math.min(...steps), Math.max(...steps), 1, cardW * 0.16)
    const layout = { gap: fit.gap, bottomY: cardY + fit.bottomY }
    drawStaffLines(world, x - cardW * 0.42, x + cardW * 0.42, layout, INK, 0.7)
    for (const s of steps) drawNote(world, x + cardW * 0.08, s, layout)
    // the saucer: a glass dome with a little alien, a disc with lights
    world.ellipse(x, cy - unit * 0.12, unit * 0.42, unit * 0.36).fill({ color: 0xbff4ff, alpha: 0.85 })
    world.circle(x, cy - unit * 0.12, unit * 0.2).fill(0x8ee000)
    world.circle(x - unit * 0.07, cy - unit * 0.16, unit * 0.05).fill(INK)
    world.circle(x + unit * 0.07, cy - unit * 0.16, unit * 0.05).fill(INK)
    world.ellipse(x, cy + unit * 0.1, unit * 0.95, unit * 0.24).fill(color)
    for (let i = -2; i <= 2; i++)
      world
        .circle(x + i * unit * 0.32, cy + unit * 0.12, unit * 0.06)
        .fill(Math.floor(now / 250 + i) % 2 ? 0xffffff : 0xffc800)
  }

  return {
    tick(dtMs, now) {
      const { width: w, height: h } = app.screen
      if (w !== size.w || h !== size.h) {
        size = { w, h }
        background(w, h)
      }
      const events = game.update(dtMs, now)
      if (events.length) onEvents(events)

      const laneW = w / SPACE_LANES
      const unit = Math.min(laneW * 0.42, h * 0.14)
      const xOf = (lane: number) => (lane + 0.5) * laneW
      world.clear()

      // the cannon follows the most urgent invader
      const urgent = game.urgent
      const aim = game.lastShot && game.lastShot.invader.since < 0.25 ? game.lastShot.lane : (urgent?.lane ?? 1)
      cannonX = cannonX < 0 ? xOf(aim) : cannonX + (xOf(aim) - cannonX) * Math.min(1, dtMs / 120)
      const baseY = h * (BASE_Y + 0.08)
      const charged = playing(now).length

      const shot = game.lastShot
      if (shot && shot.invader.state === 'hit' && shot.invader.since < 0.22) {
        const top = shot.invader.y * h
        world
          .moveTo(cannonX, baseY - unit * 0.5)
          .lineTo(xOf(shot.lane), top)
          .stroke({ width: unit * 0.18, color: LASER, alpha: 1 - shot.invader.since / 0.22 })
      }

      for (const inv of game.invaders) {
        const x = xOf(inv.lane)
        const y = inv.y * h
        let layer = layers.get(inv.index)
        if (!layer) {
          layer = new Graphics()
          root.addChild(layer)
          layers.set(inv.index, layer)
        }
        layer.clear()
        // A new invader fades in over the first stretch of its fall.
        layer.alpha = Math.min(1, Math.max(0, (inv.y - START_Y) / FADE_IN_Y))
        drawInvader(layer, inv, x, y, unit, now)
        let text = nameOf.get(inv.index)
        if (showName && inv.state === 'flying') {
          if (!text) {
            text = label(chordSymbol(inv.record.chord.root, inv.record.chord.quality), Math.max(11, unit * 0.32))
            text.anchor.set(0.5, 1)
            names.addChild(text)
            nameOf.set(inv.index, text)
          }
          text.position.set(x, y - unit * 0.52)
          text.alpha = layer.alpha
        } else if (text) {
          text.destroy()
          nameOf.delete(inv.index)
        }
      }

      for (const [index, layer] of layers)
        if (!game.invaders.some((i) => i.index === index)) {
          layer.destroy()
          layers.delete(index)
        }

      // the cannon: glows brighter with every note of the chord held
      world.roundRect(cannonX - unit * 0.12, baseY - unit * 0.55, unit * 0.24, unit * 0.45, unit * 0.08).fill(INK)
      world.ellipse(cannonX, baseY, unit * 0.5, unit * 0.28).fill(CANNON)
      world.circle(cannonX, baseY - unit * 0.05, unit * 0.14).fill(charged ? LASER : 0xffffff)
      for (let i = 0; i < charged; i++)
        world.circle(cannonX - unit * 0.3 + i * unit * 0.2, baseY + unit * 0.12, unit * 0.06).fill(LASER)
    },
    destroy() {
      names.removeChildren().forEach((c) => c.destroy())
      layers.forEach((l) => l.destroy())
      layers.clear()
    },
  }
}
