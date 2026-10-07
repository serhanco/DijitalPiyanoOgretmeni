import { type Application, Container, Graphics } from 'pixi.js'
import type { RefObject } from 'react'
import type { Clef } from '../../../music/notes'
import type { BeatTrack, TimingRecord } from '../../../rhythm/track'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { staffStep } from '../staffGeometry'
import { BEATS_AHEAD, DINO_X, dinoPose, obstacleX } from './engine'

const SKY = 0xe8f6ff
const SAND = 0xf3e2b3
const SAND_DARK = 0xd9c08a
const CACTUS = 0x58a700
const CACTUS_DARK = 0x3f7d00
const DINO = 0x7ed957
const DINO_DARK = 0x4fb32a
const BELLY = 0xd9f7c4
const HIT_TINT = 0xffc800
const MISS_TINT = 0xff4b4b
const LATE_TINT = 0xff9600

export interface DinoSceneOptions {
  clef: Clef
  /** Show each obstacle's note on a little staff sign. */
  pitched: boolean
  beatsPerBar: number
}

export function createDinoScene(
  app: Application,
  trackRef: RefObject<BeatTrack | null>,
  opts: DinoSceneOptions,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const signs = new Graphics()
  const dino = new Graphics()
  root.addChild(bg, world, signs, dino)
  let size = { w: 0, h: 0 }

  function background(w: number, h: number, groundY: number) {
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKY)
    bg.circle(w * 0.85, h * 0.18, h * 0.08).fill(0xfff1a8)
    bg.rect(0, groundY, w, h - groundY).fill(SAND)
    bg.moveTo(0, groundY).lineTo(w, groundY).stroke({ width: 3, color: SAND_DARK })
  }

  function cloud(x: number, y: number, r: number) {
    world.circle(x, y, r).fill({ color: 0xffffff, alpha: 0.9 })
    world.circle(x + r * 0.9, y + r * 0.2, r * 0.75).fill({ color: 0xffffff, alpha: 0.9 })
    world.circle(x - r * 0.9, y + r * 0.25, r * 0.65).fill({ color: 0xffffff, alpha: 0.9 })
  }

  function obstacle(r: TimingRecord, x: number, groundY: number, unit: number) {
    const tint =
      r.judgement === 'miss'
        ? MISS_TINT
        : r.judgement === 'early' || r.judgement === 'late'
          ? LATE_TINT
          : r.judgement
            ? HIT_TINT
            : CACTUS
    const alpha = r.judgement && r.judgement !== 'miss' ? 0.45 : 1
    if (r.rest) {
      // A flower: nothing to jump over, just enjoy the silence.
      world
        .moveTo(x, groundY)
        .lineTo(x, groundY - unit * 0.45)
        .stroke({ width: 3, color: CACTUS_DARK })
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        world
          .circle(x + Math.cos(a) * unit * 0.13, groundY - unit * 0.5 + Math.sin(a) * unit * 0.13, unit * 0.1)
          .fill(r.judgement === 'miss' ? MISS_TINT : 0xff86c8)
      }
      world.circle(x, groundY - unit * 0.5, unit * 0.08).fill(0xffc800)
      return
    }
    if (r.value === 'e') {
      world
        .ellipse(x, groundY - unit * 0.18, unit * 0.32, unit * 0.22)
        .fill({ color: tint === CACTUS ? 0x9aa5ad : tint, alpha })
      return
    }
    const cactus = (cx: number, hgt: number) => {
      const cw = unit * 0.3
      world.roundRect(cx - cw / 2, groundY - hgt, cw, hgt, cw / 2).fill({ color: tint, alpha })
      world
        .roundRect(cx - cw * 1.25, groundY - hgt * 0.7, cw * 0.55, hgt * 0.35, cw * 0.27)
        .fill({ color: tint, alpha })
      world.roundRect(cx + cw * 0.7, groundY - hgt * 0.85, cw * 0.55, hgt * 0.4, cw * 0.27).fill({ color: tint, alpha })
    }
    if (r.value === 'h') {
      cactus(x - unit * 0.25, unit * 0.95)
      cactus(x + unit * 0.35, unit * 0.75)
    } else {
      cactus(x, unit * 0.9)
    }
  }

  function sign(r: TimingRecord, x: number, groundY: number, unit: number) {
    const gap = unit * 0.2
    const step = staffStep(r.target, opts.clef)
    const lo = Math.min(step, 0) - 1.5
    const hi = Math.max(step, 8) + 1.5
    const height = ((hi - lo) * gap) / 2
    const width = gap * 4.5
    const bottom = groundY - unit * 1.3
    signs
      .moveTo(x, bottom)
      .lineTo(x, groundY - unit * 0.9)
      .stroke({ width: 3, color: 0x8b5a2b })
    signs
      .roundRect(x - width / 2, bottom - height, width, height, 6)
      .fill(0xffffff)
      .stroke({ width: 2, color: 0x8b5a2b })
    const layout = { gap, bottomY: bottom - (0 - lo) * (gap / 2) }
    drawStaffLines(signs, x - width / 2 + 3, x + width / 2 - 3, layout, 0x2b2f3a, 0.6)
    drawNote(signs, x, step, layout)
  }

  function drawDino(track: BeatTrack | null, now: number, x: number, groundY: number, unit: number) {
    const pose = track ? dinoPose(track, now) : { height: 0, stumbling: false }
    const running = track !== null && !track.done && now >= track.startAt - track.beatMs * opts.beatsPerBar
    // Steps land on the beat: a visible pulse.
    const step = running ? Math.floor(track!.beatAt(now) * 2) % 2 : 0
    const breathe = running ? 0 : Math.sin(now / 400) * unit * 0.02
    const body = pose.stumbling && Math.floor(now / 80) % 2 ? MISS_TINT : DINO
    const s = unit
    dino.clear()
    // tail
    dino.poly([-s * 0.35, -s * 0.45, -s * 0.85, -s * 0.3, -s * 0.35, -s * 0.25]).fill(DINO_DARK)
    // legs
    const legUp = (i: number) => (pose.height > 0.05 ? -s * 0.08 : i === step ? -s * 0.1 : 0)
    dino.roundRect(-s * 0.2, -s * 0.22 + legUp(0), s * 0.16, s * 0.24, s * 0.06).fill(DINO_DARK)
    dino.roundRect(s * 0.08, -s * 0.22 + legUp(1), s * 0.16, s * 0.24, s * 0.06).fill(DINO_DARK)
    // body and belly
    dino.ellipse(0, -s * 0.45 + breathe, s * 0.42, s * 0.32).fill(body)
    dino.ellipse(s * 0.08, -s * 0.38 + breathe, s * 0.24, s * 0.2).fill(BELLY)
    // head
    dino.circle(s * 0.32, -s * 0.85 + breathe, s * 0.3).fill(body)
    dino.circle(s * 0.4, -s * 0.92 + breathe, s * 0.12).fill(0xffffff)
    dino.circle(s * 0.44, -s * 0.92 + breathe, s * 0.06).fill(0x2b1a5c)
    dino.circle(s * 0.46, -s * 0.95 + breathe, s * 0.02).fill(0xffffff)
    dino.circle(s * 0.26, -s * 0.76 + breathe, s * 0.05).fill({ color: 0xff86c8, alpha: 0.7 })
    // smile or "oops"
    if (pose.stumbling) dino.circle(s * 0.52, -s * 0.74, s * 0.05).fill(0x2b1a5c)
    else
      dino
        .moveTo(s * 0.42, -s * 0.74)
        .quadraticCurveTo(s * 0.5, -s * 0.68, s * 0.58, -s * 0.76)
        .stroke({ width: 2, color: 0x2b1a5c })
    // arm
    dino.roundRect(s * 0.22, -s * 0.5 + breathe, s * 0.16, s * 0.07, s * 0.03).fill(DINO_DARK)
    // back spikes
    for (let i = 0; i < 3; i++)
      dino
        .poly([-s * (0.25 - i * 0.18), -s * 0.72, -s * (0.17 - i * 0.18), -s * 0.86, -s * (0.09 - i * 0.18), -s * 0.74])
        .fill(0xffc800)
    dino.position.set(x, groundY - pose.height * unit * 1.7)
    dino.rotation = pose.stumbling ? -0.25 : pose.height > 0 ? -0.1 : 0
  }

  return {
    tick(_dtMs, now) {
      const { width: w, height: h } = app.screen
      const groundY = h * 0.8
      const unit = Math.min(h * 0.17, w * 0.12)
      if (w !== size.w || h !== size.h) {
        size = { w, h }
        background(w, h, groundY)
      }
      const track = trackRef.current
      world.clear()
      signs.clear()

      const drift = (now / 60) % (w * 1.4)
      cloud(((w * 0.3 - drift + w * 1.4) % (w * 1.4)) - w * 0.2, h * 0.2, unit * 0.3)
      cloud(((w * 1.0 - drift + w * 1.4) % (w * 1.4)) - w * 0.2, h * 0.32, unit * 0.22)

      if (track) {
        // Beat marks on the ground; bar lines are taller.
        const first = Math.floor(track.beatAt(now)) - 2
        for (let b = first; b <= first + BEATS_AHEAD + 4; b++) {
          const x = obstacleX(track.startAt + b * track.beatMs, now, track.beatMs) * w
          const down = ((b % opts.beatsPerBar) + opts.beatsPerBar) % opts.beatsPerBar === 0
          world
            .moveTo(x, groundY + 4)
            .lineTo(x, groundY + (down ? 18 : 10))
            .stroke({ width: down ? 3 : 2, color: SAND_DARK })
        }
        for (const r of track.records) {
          const x = obstacleX(r.dueAt, now, track.beatMs) * w
          if (x < -unit * 2 || x > w + unit * 2) continue
          obstacle(r, x, groundY, unit)
          if (opts.pitched && !r.rest && r.judgement === null) sign(r, x, groundY, unit)
        }
      }
      drawDino(track, now, DINO_X * w, groundY, unit)
    },
  }
}
