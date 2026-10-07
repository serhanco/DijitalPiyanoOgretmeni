// "Arpej Sörfü": the wave is the arpeggio. Each note is a crest on the wave,
// higher notes higher up; the surfer rides at the playhead and stays on the
// wave while the notes come on the beat. Timing is judged by BeatTrack;
// this file only draws from its state.

import { type Application, Container, Graphics, Text } from 'pixi.js'
import type { RefObject } from 'react'
import type { BeatTrack, TimingRecord } from '../../../rhythm/track'
import type { LadderMeta } from '../../scales/steps'
import type { Scene } from '../PixiStage'

const SKY = 0xbfe9ff
const SEA = 0x1cb0f6
const SEA_DARK = 0x1386c4
const FOAM = 0xffffff
const GOLD = 0xffc800
const LATE = 0xff9600
const MISS = 0xff4b4b
const RIGHT = 0x1cb0f6
const LEFT = 0xff4b8b
const CROSS = 0xff9600
const INK = 0x2b2f3a
const BOARD = 0xff9600
const BODY = 0x8e6cf0
const BODY_DARK = 0x6a4bd1

export interface SurfSceneOptions {
  meta: LadderMeta[]
  titles: string[]
  /** Drawn before the start, when there is no track yet. */
  preview: BeatTrack
}

const label = (value: string, size: number, fill: number) =>
  new Text({
    text: value,
    style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontSize: size, fontWeight: '900', fill },
  })

const colorOf = (r: TimingRecord) =>
  r.judgement === null
    ? FOAM
    : r.judgement === 'miss'
      ? MISS
      : r.judgement === 'perfect' || r.judgement === 'good'
        ? r.wrongPresses.length
          ? LATE
          : GOLD
        : LATE

export function createSurfScene(
  app: Application,
  trackRef: RefObject<BeatTrack | null>,
  { meta, titles, preview }: SurfSceneOptions,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const sea = new Graphics()
  const marks = new Graphics()
  const texts = new Container()
  const surfer = new Graphics()
  const title = label('', 14, INK)
  root.addChild(bg, sea, marks, texts, surfer, title)
  let size = { w: 0, h: 0 }

  // The wave follows the right hand (or the only hand); the left hand's notes ride along on it.
  const lead = meta
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.clef === 'treble' || !meta.some((x) => x.clef === 'treble'))
  const pitches = preview.records.map((r) => r.target)
  const leadPitches = lead.map(({ i }) => pitches[i])
  const lo = Math.min(...leadPitches)
  const hi = Math.max(...leadPitches)
  const names = meta.map((m) => {
    const name = label(m.name, 12, INK)
    name.anchor.set(0.5, 1)
    const finger = label(String(m.finger), 11, 0xffffff)
    finger.anchor.set(0.5, 0.5)
    const badge = new Graphics()
    texts.addChild(name, badge, finger)
    return { name, finger, badge }
  })

  function background(w: number, h: number) {
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKY)
    bg.circle(w * 0.85, h * 0.14, h * 0.07).fill(0xfff1a8)
    for (const [cx, cy, r] of [
      [0.2, 0.12, 0.05],
      [0.55, 0.08, 0.04],
    ]) {
      bg.circle(cx * w, cy * h, r * w).fill({ color: 0xffffff, alpha: 0.85 })
      bg.circle((cx + r) * w, cy * h + r * w * 0.2, r * w * 0.8).fill({ color: 0xffffff, alpha: 0.85 })
    }
  }

  return {
    tick(_dtMs, now) {
      const { width: w, height: h } = app.screen
      if (w !== size.w || h !== size.h) {
        size = { w, h }
        background(w, h)
      }
      const track = trackRef.current ?? preview
      const live = trackRef.current !== null
      const beat = live ? track.beatAt(now) : -1
      const playX = w * 0.28
      const pxPerBeat = Math.max(46, w / 7)
      const top = h * 0.24
      const bottom = h * 0.66
      const yOfPitch = (midi: number) =>
        hi === lo ? (top + bottom) / 2 : bottom - ((midi - lo) / (hi - lo)) * (bottom - top)
      const xOfBeat = (b: number) => playX + (b - beat) * pxPerBeat

      // The wave: a smooth line through the lead hand's notes, held notes flat.
      const points: { x: number; y: number }[] = []
      lead.forEach(({ i }) => {
        const r = track.records[i]
        points.push({ x: xOfBeat(r.beat), y: yOfPitch(r.target) })
      })
      const first = points[0]
      const last = points[points.length - 1]
      const path = [{ x: Math.min(0, first.x) - 40, y: first.y }, ...points, { x: Math.max(w, last.x) + 40, y: last.y }]
      // The surface height under any x, for the surfer.
      const surfaceAt = (x: number) => {
        for (let k = 1; k < path.length; k++)
          if (x <= path[k].x) {
            const a = path[k - 1]
            const b = path[k]
            const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x)
            // ease between two notes, so the wave rolls rather than zigzags
            const s = (1 - Math.cos(Math.PI * t)) / 2
            return a.y + (b.y - a.y) * s
          }
        return last.y
      }
      sea.clear()
      sea.moveTo(0, h)
      for (let x = 0; x <= w; x += 6) sea.lineTo(x, surfaceAt(x) + Math.sin(x / 30 + now / 300) * 3)
      sea.lineTo(w, h).closePath().fill(SEA)
      sea.rect(0, h * 0.82, w, h * 0.18).fill({ color: SEA_DARK, alpha: 0.5 })
      for (let x = 0; x <= w; x += 6) {
        const y = surfaceAt(x) + Math.sin(x / 30 + now / 300) * 3
        if (x === 0) sea.moveTo(x, y)
        else sea.lineTo(x, y)
      }
      sea.stroke({ width: 4, color: FOAM, alpha: 0.9 })

      // The notes: a buoy on the wave per note, with its name and finger.
      marks.clear()
      const next = track.records.findIndex((r) => !r.rest && r.judgement === null)
      const part = meta[next === -1 ? meta.length - 1 : next].part
      track.records.forEach((r, i) => {
        const m = meta[i]
        const x = xOfBeat(r.beat)
        const isLead = lead.some((l) => l.i === i)
        const y = isLead ? yOfPitch(r.target) : surfaceAt(x) + 26
        const visible = x > -30 && x < w + 30
        const t = names[i]
        t.name.visible = t.finger.visible = t.badge.visible = visible
        if (!visible) return
        const radius = Math.max(7, pxPerBeat * 0.13)
        marks.circle(x, y, radius).fill(colorOf(r))
        marks.circle(x, y, radius).stroke({ width: 2, color: m.clef === 'treble' ? RIGHT : LEFT })
        if (i === next)
          marks
            .circle(x, y, radius + 4 + 3 * Math.abs(Math.sin(now / 200)))
            .stroke({ width: 2, color: INK, alpha: 0.5 })
        t.name.position.set(x, isLead ? y - radius - 2 : y + radius + 14)
        const todo = r.judgement === null
        t.badge.visible = t.finger.visible = todo
        const by = isLead ? y - radius - 26 : y + radius + 26
        t.badge
          .clear()
          .circle(0, 0, 8)
          .fill(m.clef === 'treble' ? RIGHT : LEFT)
        if (m.cross) t.badge.circle(0, 0, 8).stroke({ width: 3, color: CROSS })
        t.badge.position.set(x + (isLead ? 0 : 0), by)
        t.finger.position.set(x, by)
      })

      // The surfer at the playhead, wiping out just after a missed note.
      const missed = track.records.some(
        (r) => r.judgement === 'miss' && r.settledAt !== null && now - r.settledAt < 500,
      )
      const sy = surfaceAt(playX) + Math.sin(now / 300) * 3
      const slope = (surfaceAt(playX + 8) - surfaceAt(playX - 8)) / 16
      const u = Math.min(h * 0.09, 34)
      surfer.clear()
      surfer.ellipse(0, 0, u * 1.1, u * 0.18).fill(BOARD)
      surfer.ellipse(0, -u * 0.62, u * 0.42, u * 0.38).fill(missed && Math.floor(now / 80) % 2 ? MISS : BODY)
      surfer
        .moveTo(u * 0.34, -u * 0.7)
        .lineTo(u * 0.34, -u * 1.3)
        .stroke({ width: u * 0.09, color: BODY_DARK, cap: 'round' })
      surfer
        .moveTo(u * 0.34, -u * 1.3)
        .quadraticCurveTo(u * 0.7, -u * 1.1, u * 0.56, -u * 0.86)
        .stroke({ width: u * 0.09, color: BODY_DARK, cap: 'round' })
      surfer.circle(-u * 0.13, -u * 0.68, u * 0.1).fill(0xffffff)
      surfer.circle(u * 0.11, -u * 0.68, u * 0.1).fill(0xffffff)
      surfer.circle(-u * 0.1, -u * 0.67, u * 0.05).fill(INK)
      surfer.circle(u * 0.14, -u * 0.67, u * 0.05).fill(INK)
      if (missed) surfer.circle(0, -u * 0.48, u * 0.06).fill(INK)
      else
        surfer
          .moveTo(-u * 0.1, -u * 0.5)
          .quadraticCurveTo(0, -u * 0.42, u * 0.1, -u * 0.5)
          .stroke({ width: 2, color: INK })
      if (missed)
        for (let k = 0; k < 6; k++)
          surfer.circle(-u + k * u * 0.4, u * 0.1 - Math.abs(Math.sin(now / 90 + k)) * u * 0.4, u * 0.1).fill(FOAM)
      surfer.position.set(playX, sy - 2)
      surfer.rotation = missed ? -0.5 : Math.atan(slope) * 0.8

      title.text = titles[part] ?? ''
      title.position.set(10, 8)
    },
    destroy() {
      texts.removeChildren().forEach((c) => c.destroy())
    },
  }
}
