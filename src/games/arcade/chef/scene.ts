import { type Application, Container, Graphics, Text } from 'pixi.js'
import { chordTitle, upperNotes } from '../../../music/chords'
import { pitchClass } from '../../../music/notes'
import { spelledName } from '../../../music/scales'
import type { ChordRecord } from '../../chords/session'
import type { Scene } from '../PixiStage'
import { type ChefEvent, type ChefGame } from './engine'

const WALL = 0xfff3dc
const TILE = 0xffe2b0
const COUNTER = 0xa0622d
const COUNTER_TOP = 0xc98a4b
const POT = 0x5b6b8c
const POT_DARK = 0x3f4c66
const PAPER = 0xffffff
const INK = 0x2b2f3a
const FLAME = 0xff9600
const LATE = 0xff4b4b
/** One colour per pitch class: the same note is always the same vegetable. */
const PITCH_COLORS = [
  0xff4b4b, 0xff7a45, 0xff9600, 0xffc800, 0xc8d400, 0x58cc02, 0x2bc4a8, 0x1cb0f6, 0x4b7bff, 0x8e6cf0, 0xce82ff,
  0xff86c8,
]

export interface ChefSceneOptions {
  /** List the notes on the recipe (first lessons). */
  showNotes: boolean
  /** The recipe names the inversion (voicing lessons). */
  withInversion: boolean
}

const text = (value: string, size: number, fill = INK, weight: '700' | '900' = '900') =>
  new Text({
    text: value,
    style: {
      fontFamily: 'Nunito Variable, Nunito, sans-serif',
      fontSize: size,
      fontWeight: weight,
      fill,
      align: 'center',
    },
  })

export function createChefScene(
  app: Application,
  game: ChefGame,
  { showNotes, withInversion }: ChefSceneOptions,
  onEvents: (events: ChefEvent[]) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const labels = new Container()
  root.addChild(bg, world, labels)
  const title = text('', 16)
  const ingredients = text('', 13, INK, '700')
  const upcoming = [text('', 11, INK, '700'), text('', 11, INK, '700')]
  title.anchor.set(0.5, 0)
  ingredients.anchor.set(0.5, 0)
  for (const u of upcoming) u.anchor.set(0.5, 0.5)
  labels.addChild(title, ingredients, ...upcoming)
  /** Note names floating in the pot, by key. */
  const potNames = new Map<number, Text>()
  let size = { w: 0, h: 0 }
  let shownOrder = -1

  const recipeName = (r: ChordRecord) => chordTitle(r.chord, withInversion)

  function background(w: number, h: number) {
    bg.clear()
    bg.rect(0, 0, w, h).fill(WALL)
    const tile = Math.max(24, w / 12)
    for (let y = 0; y < h * 0.72; y += tile)
      for (let x = (y / tile) % 2 ? tile / 2 : 0; x < w; x += tile)
        bg.roundRect(x + 2, y + 2, tile * 0.5, tile * 0.5, 4).fill({ color: TILE, alpha: 0.6 })
    bg.rect(0, h * 0.72, w, h * 0.28).fill(COUNTER)
    bg.rect(0, h * 0.72, w, h * 0.04).fill(COUNTER_TOP)
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
      world.clear()

      const order = game.order
      const unit = Math.min(w, h) / 6

      // The recipe card on the wall, with the patience bar.
      const cardW = Math.min(w * 0.62, unit * 4.2)
      const cardH = unit * (showNotes ? 1.35 : 1.0)
      const cardX = w * 0.4 - cardW / 2
      const cardY = h * 0.05
      if (order) {
        if (shownOrder !== order.index) {
          shownOrder = order.index
          title.text = `🧾 ${recipeName(order.record)}`
          const notes = upperNotes(order.record.chord)
          const bass =
            order.record.chord.hands === 'both' ? `${spelledName(order.record.chord.notes[0], false)} (sol el) + ` : ''
          ingredients.text = showNotes ? bass + notes.map((n) => spelledName(n, false)).join(' + ') : ''
        }
        const tilt = order.state === 'cooking' ? Math.sin(now / 900) * 0.01 : 0
        world.roundRect(cardX, cardY, cardW, cardH, 10).fill(PAPER)
        world.roundRect(cardX, cardY, cardW, cardH, 10).stroke({ width: 2, color: 0xe5d3b3 })
        world.circle(cardX + cardW / 2, cardY + 4, 5).fill(LATE)
        title.style.fontSize = Math.max(13, Math.min(20, cardW / 13))
        title.position.set(cardX + cardW / 2, cardY + cardH * 0.12)
        title.rotation = tilt
        ingredients.position.set(cardX + cardW / 2, cardY + cardH * 0.45)
        title.alpha = ingredients.alpha = order.state === 'cooking' ? 1 : 0.5
        if (order.state === 'cooking') {
          const left = 1 - order.waitedS / order.patienceS
          const barY = cardY + cardH - 14
          world.roundRect(cardX + 12, barY, cardW - 24, 8, 4).fill(0xeeeeee)
          world.roundRect(cardX + 12, barY, (cardW - 24) * left, 8, 4).fill(left > 0.3 ? FLAME : LATE)
        }
      }

      // The next orders, small tickets on the right.
      game.upcoming.forEach((r, i) => {
        const tx = w * 0.86
        const ty = cardY + unit * 0.35 + i * unit * 0.75
        world
          .roundRect(tx - unit * 0.6, ty - unit * 0.28, unit * 1.2, unit * 0.56, 6)
          .fill({ color: PAPER, alpha: 0.85 })
        upcoming[i].text = recipeName(r).replace(' · ', '\n')
        upcoming[i].style.fontSize = Math.max(9, unit * 0.16)
        upcoming[i].position.set(tx, ty)
        upcoming[i].visible = true
      })
      for (let i = game.upcoming.length; i < upcoming.length; i++) upcoming[i].visible = false

      // The pot on the stove: ingredients float in it while the keys are down.
      const potX = w * 0.42
      const potY = h * 0.6
      const potR = unit * 1.15
      const cooking = order?.state === 'cooking'
      const flameH = unit * (0.25 + 0.06 * Math.sin(now / 90))
      for (let i = -2; i <= 2; i++)
        world
          .moveTo(potX + i * potR * 0.3 - unit * 0.1, h * 0.72)
          .lineTo(potX + i * potR * 0.3, h * 0.72 - flameH * (cooking ? 1 : 0.4))
          .lineTo(potX + i * potR * 0.3 + unit * 0.1, h * 0.72)
          .fill(FLAME)
      world.roundRect(potX - potR, potY - potR * 0.55, potR * 2, potR * 1.05, potR * 0.25).fill(POT)
      world.rect(potX - potR * 1.1, potY - potR * 0.6, potR * 2.2, potR * 0.16).fill(POT_DARK)
      // the pot's face: happy when served, worried while the time runs out, sooty when burnt
      const worried = order?.state === 'cooking' && order.waitedS / order.patienceS > 0.7
      const burnt = order?.state === 'burnt'
      world.circle(potX - potR * 0.3, potY - potR * 0.1, potR * 0.08).fill(0xffffff)
      world.circle(potX + potR * 0.3, potY - potR * 0.1, potR * 0.08).fill(0xffffff)
      world.circle(potX - potR * 0.3, potY - potR * 0.08, potR * 0.04).fill(INK)
      world.circle(potX + potR * 0.3, potY - potR * 0.08, potR * 0.04).fill(INK)
      if (worried || burnt) world.circle(potX, potY + potR * 0.15, potR * 0.07).fill(INK)
      else
        world
          .moveTo(potX - potR * 0.15, potY + potR * 0.1)
          .quadraticCurveTo(potX, potY + potR * 0.25, potX + potR * 0.15, potY + potR * 0.1)
          .stroke({ width: 3, color: INK })

      const inPot = game.playing(now)
      for (const [midi, t] of potNames)
        if (!inPot.includes(midi)) {
          t.destroy()
          potNames.delete(midi)
        }
      const spelled = new Map(order?.record.chord.notes.map((n) => [n.midi, spelledName(n, false)]) ?? [])
      inPot.forEach((midi, i) => {
        const ix = potX + (i - (inPot.length - 1) / 2) * potR * 0.5
        const iy = potY - potR * 0.75 + Math.sin(now / 200 + i) * 4
        world.circle(ix, iy, potR * 0.22).fill(PITCH_COLORS[pitchClass(midi)])
        world.circle(ix - potR * 0.07, iy - potR * 0.07, potR * 0.06).fill({ color: 0xffffff, alpha: 0.6 })
        let t = potNames.get(midi)
        if (!t) {
          t = text(spelled.get(midi) ?? '', Math.max(10, potR * 0.18), 0xffffff)
          t.anchor.set(0.5, 0.5)
          labels.addChild(t)
          potNames.set(midi, t)
        }
        t.position.set(ix, iy)
      })

      // A served dish slides out on a plate; a burnt one smokes.
      if (order && order.state !== 'cooking') {
        const t = Math.min(1, order.since / 0.8)
        if (order.state === 'served') {
          const px = potX + t * w * 0.35
          const py = h * 0.78
          world.ellipse(px, py, unit * 0.8, unit * 0.22).fill(0xffffff)
          world.ellipse(px, py - unit * 0.12, unit * 0.5, unit * 0.22).fill(0xffc800)
          for (let i = 0; i < 5; i++)
            world.star(px - unit * 0.6 + i * unit * 0.3, py - unit * (0.5 + 0.3 * t), 5, unit * 0.08).fill({
              color: 0xffc800,
              alpha: 1 - t,
            })
        } else {
          for (let i = 0; i < 4; i++)
            world
              .circle(potX + (i - 1.5) * potR * 0.4, potY - potR * (0.9 + t * 0.8 + i * 0.1), potR * (0.2 + t * 0.2))
              .fill({
                color: 0x555555,
                alpha: 0.6 * (1 - t),
              })
        }
      }
    },
    destroy() {
      labels.removeChildren().forEach((c) => c.destroy())
    },
  }
}
