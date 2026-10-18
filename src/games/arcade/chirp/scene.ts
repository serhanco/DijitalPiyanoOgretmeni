import { type Application, Container, Graphics, Text } from 'pixi.js'
import { solfegeName } from '../../../music/notes'
import type { Scene } from '../PixiStage'
import { ARRIVE_S, type ChirpBird, type ChirpEvent, type ChirpGame, LEAVE_S } from './engine'

const SKY_TOP = 0xcfeeff
const SKY_LOW = 0xfff4d6
const TRUNK = 0x8d5a34
const LEAF = 0x58cc02
const LEAF_DARK = 0x3f9b00
const NEST = 0xb7793f
const NEST_DARK = 0x8a5527
const INK = 0x2b1a5c
const FEATHERS = [0xffc93c, 0xff9fb2, 0x7cc8ff, 0x7bd389, 0xffa95e, 0xd6a2ff]
const NOTE = 0x7c4dff

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Floater {
  x: number
  y: number
  age: number
  kind: 'note' | 'heart'
}

/** A round chick facing left, centred on (x, y). */
function drawChick(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
  mood: 'sing' | 'happy' | 'sad' | 'calm',
) {
  g.ellipse(x + r * 0.95, y + r * 0.1, r * 0.35, r * 0.16).fill(color)
  g.circle(x, y, r).fill(color)
  g.ellipse(x + r * 0.15, y + r * 0.35, r * 0.55, r * 0.42).fill({ color: 0xffffff, alpha: 0.45 })
  g.ellipse(x + r * 0.35, y + r * 0.05, r * 0.42, r * 0.24).fill({ color: 0x000000, alpha: 0.08 })
  g.circle(x - r * 0.62, y + r * 0.25, r * 0.13).fill({ color: 0xff8fb1, alpha: 0.7 })
  // eye
  if (mood === 'happy') {
    g.moveTo(x - r * 0.5, y - r * 0.2)
      .quadraticCurveTo(x - r * 0.35, y - r * 0.42, x - r * 0.2, y - r * 0.2)
      .stroke({ width: r * 0.1, color: INK, cap: 'round' })
  } else {
    g.circle(x - r * 0.35, y - r * 0.22, r * 0.2).fill(0xffffff)
    g.circle(x - r * 0.4, y - r * 0.2, r * 0.11).fill(INK)
    if (mood === 'sad')
      g.moveTo(x - r * 0.58, y - r * 0.5)
        .lineTo(x - r * 0.18, y - r * 0.4)
        .stroke({ width: r * 0.07, color: INK, cap: 'round' })
  }
  // beak: open while singing
  if (mood === 'sing') {
    g.poly([x - r * 0.85, y - r * 0.02, x - r * 1.35, y - r * 0.12, x - r * 0.9, y + r * 0.08]).fill(0xff8a3d)
    g.poly([x - r * 0.88, y + r * 0.14, x - r * 1.25, y + r * 0.26, x - r * 0.86, y + r * 0.26]).fill(0xff8a3d)
  } else {
    g.poly([x - r * 0.88, y, x - r * 1.28, y + r * 0.1, x - r * 0.88, y + r * 0.22]).fill(0xff8a3d)
  }
  // tuft
  g.moveTo(x, y - r * 0.95)
    .quadraticCurveTo(x + r * 0.15, y - r * 1.45, x + r * 0.45, y - r * 1.25)
    .stroke({ width: r * 0.12, color, cap: 'round' })
}

export function createChirpScene(
  app: Application,
  game: ChirpGame,
  notes: number[],
  onEvents: (events: ChirpEvent[]) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const fx = new Graphics()
  const labels = new Container()
  root.addChild(bg, labels, world, fx)
  const reduced = reducedMotion()
  const sorted = [...new Set(notes)].sort((a, b) => a - b)
  let size = { w: 0, h: 0 }
  let floaters: Floater[] = []
  let singingFor = 0

  const nestX = (midi: number) => {
    const i = sorted.indexOf(midi)
    return size.w * (0.1 + (0.8 * (i + 0.5)) / sorted.length)
  }
  const nestY = () => size.h * 0.8
  const perch = () => ({ x: size.w * 0.62, y: size.h * 0.36 })

  function layoutIfResized() {
    const { width: w, height: h } = app.screen
    if (w === size.w && h === size.h) return
    size = { w, h }
    bg.clear()
    bg.rect(0, 0, w, h * 0.6).fill(SKY_TOP)
    bg.rect(0, h * 0.6, w, h * 0.4).fill(SKY_LOW)
    // a tree on the right with the perch branch
    bg.rect(w * 0.84, h * 0.25, w * 0.05, h * 0.75).fill(TRUNK)
    bg.circle(w * 0.86, h * 0.2, Math.min(w, h) * 0.2).fill(LEAF)
    bg.circle(w * 0.78, h * 0.26, Math.min(w, h) * 0.13).fill(LEAF_DARK)
    bg.roundRect(w * 0.5, h * 0.42, w * 0.36, h * 0.03, h * 0.015).fill(TRUNK)
    // the long low branch with the nests
    bg.roundRect(0, h * 0.84, w, h * 0.035, h * 0.015).fill(TRUNK)
    labels.removeChildren()
    const r = Math.min(w / (sorted.length * 2.6), h * 0.09)
    for (const m of sorted) {
      const x = nestX(m)
      const y = nestY()
      bg.ellipse(x, y + r * 0.35, r * 1.15, r * 0.55).fill(NEST_DARK)
      bg.ellipse(x, y + r * 0.2, r * 1.05, r * 0.42).fill(NEST)
      const t = new Text({
        text: solfegeName(m).replace(/\d+$/, ''),
        style: {
          fontFamily: 'Nunito Variable, Nunito, sans-serif',
          fontSize: Math.max(11, r * 0.6),
          fontWeight: '900',
          fill: INK,
        },
      })
      t.anchor.set(0.5, 0)
      t.position.set(x, y + r * 0.85)
      labels.addChild(t)
    }
  }

  function birdAt(b: ChirpBird): { x: number; y: number; mood: 'sing' | 'happy' | 'sad' | 'calm' } {
    const p = perch()
    if (b.state === 'arriving') {
      const t = Math.min(1, b.since / ARRIVE_S)
      const e = reduced ? 1 : 1 - (1 - t) ** 2
      return { x: size.w * 1.1 + (p.x - size.w * 1.1) * e, y: size.h * 0.08 + (p.y - size.h * 0.08) * e, mood: 'calm' }
    }
    if (b.state === 'waiting') return { ...p, mood: singingFor > 0 ? 'sing' : 'calm' }
    const t = Math.min(1, b.since / LEAVE_S)
    if (b.state === 'home') {
      const tx = nestX(b.record.target)
      const ty = nestY()
      // an arc down to the nest
      return { x: p.x + (tx - p.x) * t, y: p.y + (ty - p.y) * t - Math.sin(t * Math.PI) * size.h * 0.18, mood: 'happy' }
    }
    return { x: p.x - size.w * 0.9 * t, y: p.y - size.h * 0.5 * t, mood: 'sad' }
  }

  return {
    tick(dtMs, now) {
      layoutIfResized()
      const events = game.update(dtMs, now)
      if (events.length) onEvents(events)
      singingFor = Math.max(0, singingFor - dtMs)
      world.clear()
      const r = Math.min(size.w / (sorted.length * 2.6), size.h * 0.09)
      // birds already home sit in their nests
      for (const m of sorted) {
        const count = game.nests.get(m) ?? 0
        const homing = game.bird?.state === 'home' && game.bird.record.target === m && game.bird.since < LEAVE_S
        const shown = Math.min(3, count - (homing ? 1 : 0))
        for (let i = 0; i < shown; i++)
          drawChick(
            world,
            nestX(m) + (i - (shown - 1) / 2) * r * 0.9,
            nestY() - r * 0.15 - i * 2,
            r * 0.6,
            FEATHERS[(i + m) % FEATHERS.length],
            'calm',
          )
      }
      const b = game.bird
      if (b && !(b.state !== 'waiting' && b.state !== 'arriving' && b.since >= LEAVE_S)) {
        const pos = birdAt(b)
        const br = r * 1.25
        const hop = reduced || b.state !== 'waiting' ? 0 : Math.abs(Math.sin(now / 260)) * br * 0.08
        drawChick(world, pos.x, pos.y - br - hop, br, FEATHERS[b.look], pos.mood)
        if (b.state === 'waiting') {
          // patience bar above the bird
          const left = game.patienceLeft
          const bw = br * 2.4
          const by = pos.y - br * 2.6
          world.roundRect(pos.x - bw / 2, by, bw, br * 0.22, br * 0.11).fill({ color: 0x000000, alpha: 0.12 })
          world
            .roundRect(pos.x - bw / 2, by, bw * left, br * 0.22, br * 0.11)
            .fill(left > 0.5 ? 0x58cc02 : left > 0.25 ? 0xffc800 : 0xff4b4b)
        }
      }
      for (const e of events) {
        if (e.type === 'sing') singingFor = 700
        if ((e.type === 'sing' || e.type === 'home') && !reduced) {
          const p = perch()
          for (let i = 0; i < (e.type === 'home' ? 4 : 2); i++)
            floaters.push({
              x: p.x - r * (1.5 + i * 0.6),
              y: p.y - r * (2 + i * 0.4),
              age: -i * 120,
              kind: e.type === 'home' ? 'heart' : 'note',
            })
        }
      }
      fx.clear()
      floaters = floaters.filter((f) => (f.age += dtMs) < 1200)
      for (const f of floaters) {
        if (f.age < 0) continue
        const k = f.age / 1200
        const x = f.x - k * r
        const y = f.y - k * r * 2.5
        const a = 1 - k
        if (f.kind === 'note') {
          fx.ellipse(x, y, r * 0.22, r * 0.16).fill({ color: NOTE, alpha: a })
          fx.rect(x + r * 0.15, y - r * 0.6, r * 0.06, r * 0.6).fill({ color: NOTE, alpha: a })
        } else {
          const s = r * 0.18
          fx.circle(x - s * 0.5, y, s * 0.55).fill({ color: 0xff4b8b, alpha: a })
          fx.circle(x + s * 0.5, y, s * 0.55).fill({ color: 0xff4b8b, alpha: a })
          fx.poly([x - s, y + s * 0.15, x + s, y + s * 0.15, x, y + s * 1.2]).fill({ color: 0xff4b8b, alpha: a })
        }
      }
    },
  }
}
