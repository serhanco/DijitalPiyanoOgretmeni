import { type Application, Container, Graphics } from 'pixi.js'
import type { RefObject } from 'react'
import type { Clef } from '../../../music/notes'
import type { BeatTrack, TimingRecord } from '../../../rhythm/track'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { staffStep } from '../staffGeometry'
import {
  type CactusFace,
  cactusFace,
  type DinoEyes,
  type DinoLook,
  type DinoMouth,
  dinoFeeling,
  dinoLook,
  dustAge,
  outfitLevel,
} from './character'
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
const INK = 0x2b1a5c
const CHEEK = 0xff8fb1
const GOLD = 0xffc800

/** Sky by lesson progress: morning, noon, late afternoon, dusk. */
const SKIES = [0xe8f6ff, 0xdff4ff, 0xffe9d1, 0xd9d3ff]
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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
  const rig = new Container()
  rig.addChild(dino)
  root.addChild(bg, world, signs, rig)
  let size = { w: 0, h: 0 }
  let skyStage = 0

  function background(w: number, h: number, groundY: number, stage: number) {
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKIES[stage] ?? SKY)
    if (stage === 3) {
      for (const [sx, sy] of [
        [0.1, 0.12],
        [0.3, 0.25],
        [0.55, 0.1],
        [0.72, 0.3],
      ])
        bg.circle(sx * w, sy * h, 2).fill({ color: 0xffffff, alpha: 0.8 })
    }
    bg.circle(w * 0.85, h * (0.18 + stage * 0.1), h * 0.08).fill(
      stage === 3 ? 0xfff8e0 : stage === 2 ? 0xffb347 : 0xfff1a8,
    )
    bg.rect(0, groundY, w, h - groundY).fill(SAND)
    bg.moveTo(0, groundY).lineTo(w, groundY).stroke({ width: 3, color: SAND_DARK })
  }

  function cloud(x: number, y: number, r: number) {
    world.circle(x, y, r).fill({ color: 0xffffff, alpha: 0.9 })
    world.circle(x + r * 0.9, y + r * 0.2, r * 0.75).fill({ color: 0xffffff, alpha: 0.9 })
    world.circle(x - r * 0.9, y + r * 0.25, r * 0.65).fill({ color: 0xffffff, alpha: 0.9 })
  }

  /** Slow hills behind everything (parallax) with a sleepy volcano. */
  function hills(w: number, groundY: number, unit: number, now: number) {
    const span = w * 1.6
    const off = (now / 140) % span
    for (let i = 0; i < 3; i++) {
      const x = (((i * span) / 2.2 - off + span * 2) % span) - unit
      world.poly([x - unit * 2, groundY, x, groundY - unit * (1.1 + (i % 2) * 0.35), x + unit * 2, groundY]).fill({
        color: 0xbfe3b4,
        alpha: 0.55,
      })
    }
    const vx = ((((w * 0.55 - now / 90) % span) + span) % span) - unit
    world
      .poly([
        vx - unit * 1.6,
        groundY,
        vx - unit * 0.35,
        groundY - unit * 1.5,
        vx + unit * 0.35,
        groundY - unit * 1.5,
        vx + unit * 1.6,
        groundY,
      ])
      .fill({ color: 0xc9a98a, alpha: 0.6 })
    const puff = (now / 900) % 1
    world
      .circle(vx + puff * unit * 0.3, groundY - unit * (1.65 + puff * 0.5), unit * (0.12 + puff * 0.1))
      .fill({ color: 0xffffff, alpha: 0.6 * (1 - puff) })
  }

  function cactusEyes(x: number, y: number, size: number, face: CactusFace, alpha: number) {
    const line = { width: Math.max(1.5, size * 0.1), color: INK, alpha, cap: 'round' as const }
    for (const dx of [-0.2, 0.2]) {
      const ex = x + dx * size
      if (face === 'happy') {
        world
          .moveTo(ex - size * 0.09, y + size * 0.03)
          .quadraticCurveTo(ex, y - size * 0.12, ex + size * 0.09, y + size * 0.03)
          .stroke(line)
      } else if (face === 'ouch') {
        world
          .moveTo(ex - size * 0.08, y - size * 0.07)
          .lineTo(ex + size * 0.08, y + size * 0.05)
          .stroke(line)
        world
          .moveTo(ex - size * 0.08, y + size * 0.05)
          .lineTo(ex + size * 0.08, y - size * 0.07)
          .stroke(line)
      } else {
        const sq = face === 'squint' ? 0.55 : 1
        world.ellipse(ex, y, size * 0.1, size * 0.1 * sq).fill({ color: 0xffffff, alpha })
        world.circle(ex + size * 0.03, y, size * 0.05).fill({ color: INK, alpha })
      }
    }
    if (face === 'ouch') world.ellipse(x, y + size * 0.2, size * 0.07, size * 0.09).fill({ color: INK, alpha })
    else if (face === 'happy') {
      world
        .moveTo(x - size * 0.1, y + size * 0.16)
        .quadraticCurveTo(x, y + size * 0.27, x + size * 0.1, y + size * 0.16)
        .stroke(line)
    } else
      world
        .moveTo(x - size * 0.07, y + size * 0.2)
        .lineTo(x + size * 0.07, y + size * 0.2)
        .stroke(line)
  }

  function obstacle(r: TimingRecord, x: number, groundY: number, unit: number, ahead: number) {
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
    const face = cactusFace(r.judgement, ahead)
    if (r.value === 'e') {
      // a little turtle: shell, head and feet that step with the beat
      const shell = tint === CACTUS ? 0x9a6b3f : tint
      const step = Math.sin((x / unit) * 6) * unit * 0.02
      world.ellipse(x - unit * 0.02, groundY - unit * 0.2, unit * 0.3, unit * 0.2).fill({ color: shell, alpha })
      world
        .ellipse(x - unit * 0.07, groundY - unit * 0.27, unit * 0.12, unit * 0.06)
        .fill({ color: 0xffffff, alpha: 0.22 * alpha })
      world.circle(x - unit * 0.34, groundY - unit * 0.2, unit * 0.11).fill({ color: 0x8bcf6a, alpha })
      world
        .roundRect(x - unit * 0.2, groundY - unit * 0.07 + step, unit * 0.1, unit * 0.09, 3)
        .fill({ color: 0x8bcf6a, alpha })
      world
        .roundRect(x + unit * 0.08, groundY - unit * 0.07 - step, unit * 0.1, unit * 0.09, 3)
        .fill({ color: 0x8bcf6a, alpha })
      world.circle(x - unit * 0.37, groundY - unit * 0.22, unit * 0.03).fill({ color: INK, alpha })
      return
    }
    const cactus = (cx: number, hgt: number, faced: boolean) => {
      const cw = unit * 0.3
      world.roundRect(cx - cw / 2, groundY - hgt, cw, hgt, cw / 2).fill({ color: tint, alpha })
      if (faced) cactusEyes(cx, groundY - hgt * 0.72, cw * 1.3, face, alpha)
      world
        .roundRect(cx - cw * 1.25, groundY - hgt * 0.7, cw * 0.55, hgt * 0.35, cw * 0.27)
        .fill({ color: tint, alpha })
      world.roundRect(cx + cw * 0.7, groundY - hgt * 0.85, cw * 0.55, hgt * 0.4, cw * 0.27).fill({ color: tint, alpha })
    }
    if (r.value === 'h' || r.value === 'hd') {
      cactus(x - unit * 0.25, unit * 0.95, true)
      cactus(x + unit * 0.35, unit * 0.75, false)
    } else {
      cactus(x, unit * 0.9, true)
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

  function eye(x: number, y: number, r: number, eyes: DinoEyes, clock: number) {
    const line = { width: r * 0.28, color: INK, cap: 'round' as const }
    switch (eyes) {
      case 'happy':
        dino
          .moveTo(x - r * 0.6, y + r * 0.15)
          .quadraticCurveTo(x, y - r * 0.7, x + r * 0.6, y + r * 0.15)
          .stroke(line)
        return
      case 'blink':
        dino
          .moveTo(x - r * 0.6, y)
          .quadraticCurveTo(x, y + r * 0.35, x + r * 0.6, y)
          .stroke(line)
        return
      case 'dizzy': {
        dino.circle(x, y, r).fill(0xffffff)
        const a = clock / 120
        // moveTo first: an arc is joined by a line to wherever the path was left
        dino.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62)
        dino.arc(x, y, r * 0.62, a, a + Math.PI * 1.5).stroke({ ...line, width: r * 0.2 })
        dino.moveTo(x + Math.cos(a + Math.PI) * r * 0.25, y + Math.sin(a + Math.PI) * r * 0.25)
        dino.arc(x, y, r * 0.25, a + Math.PI, a + Math.PI * 2.3).stroke({ ...line, width: r * 0.2 })
        return
      }
      default: {
        const wide = eyes === 'wide'
        dino.circle(x, y, r * (wide ? 1.12 : 1)).fill(0xffffff)
        dino.circle(x + r * (eyes === 'focus' ? 0.35 : 0.2), y + r * 0.03, r * (wide ? 0.34 : 0.55)).fill(INK)
        dino.circle(x + r * 0.38, y - r * 0.2, r * 0.2).fill(0xffffff)
      }
    }
  }

  function mouth(x: number, y: number, s: number, kind: DinoMouth) {
    const line = { width: 2.2, color: INK, cap: 'round' as const }
    if (kind === 'grin') {
      dino.poly([x - s * 0.1, y - s * 0.02, x + s * 0.16, y - s * 0.04, x + s * 0.08, y + s * 0.1]).fill(INK)
      dino.ellipse(x + s * 0.05, y + s * 0.06, s * 0.05, s * 0.03).fill(0xff6b81)
    } else if (kind === 'oops') dino.ellipse(x + s * 0.06, y + s * 0.02, s * 0.05, s * 0.06).fill(INK)
    else if (kind === 'flat')
      dino
        .moveTo(x - s * 0.04, y + s * 0.02)
        .lineTo(x + s * 0.16, y + s * 0.02)
        .stroke(line)
    else
      dino
        .moveTo(x - s * 0.04, y)
        .quadraticCurveTo(x + s * 0.06, y + s * 0.1, x + s * 0.18, y)
        .stroke(line)
  }

  function sparkle(g: Graphics, x: number, y: number, r: number, color: number, alpha: number) {
    g.poly([
      x,
      y - r,
      x + r * 0.28,
      y - r * 0.28,
      x + r,
      y,
      x + r * 0.28,
      y + r * 0.28,
      x,
      y + r,
      x - r * 0.28,
      y + r * 0.28,
      x - r,
      y,
      x - r * 0.28,
      y - r * 0.28,
    ]).fill({ color, alpha })
  }

  /** The dino faces right and stands on (x, groundY); the body turns about its middle. */
  function drawDino(track: BeatTrack | null, now: number, x: number, groundY: number, unit: number) {
    const reduced = reducedMotion()
    const pose = track ? dinoPose(track, now) : { height: 0, stumbling: false }
    const feeling = track ? dinoFeeling(track, now) : { reaction: 'run' as const, t: 0 }
    const look: DinoLook = dinoLook(feeling, now, reduced)
    const outfit = track ? outfitLevel(track.combo) : 0
    const running = track !== null && !track.done && now >= track.startAt - track.beatMs * opts.beatsPerBar
    const airborne = pose.height > 0.05
    // Steps land on the beat: a visible pulse.
    const step = running ? Math.floor(track!.beatAt(now) * 2) % 2 : 0
    const breathe = running || reduced ? 0 : Math.sin(now / 400) * unit * 0.02
    const body = pose.stumbling && Math.floor(now / 80) % 2 ? MISS_TINT : DINO
    const s = unit
    const dip = look.headDip * s * 0.28
    dino.clear()
    // tail with an eighth note at its tip, wagging on the run
    const wag = running && !reduced ? Math.sin(now / 90) * s * 0.07 : 0
    dino.poly([-s * 0.35, -s * 0.45, -s * 0.85, -s * 0.3 + wag, -s * 0.35, -s * 0.25]).fill(DINO_DARK)
    const nx = -s * 0.88
    const ny = -s * 0.4 + wag
    dino.ellipse(nx, ny, s * 0.07, s * 0.05).fill(GOLD)
    dino
      .moveTo(nx + s * 0.06, ny)
      .lineTo(nx + s * 0.06, ny - s * 0.2)
      .stroke({ width: 2.5, color: GOLD })
    dino
      .moveTo(nx + s * 0.06, ny - s * 0.2)
      .quadraticCurveTo(nx + s * 0.16, ny - s * 0.15, nx + s * 0.14, ny - s * 0.06)
      .stroke({ width: 2.5, color: GOLD })
    // legs
    const legUp = (i: number) => (airborne ? -s * 0.08 : i === step ? -s * 0.1 : 0)
    dino.roundRect(-s * 0.2, -s * 0.22 + legUp(0), s * 0.16, s * 0.24, s * 0.06).fill(DINO_DARK)
    dino.roundRect(s * 0.08, -s * 0.22 + legUp(1), s * 0.16, s * 0.24, s * 0.06).fill(DINO_DARK)
    // body and belly
    dino.ellipse(0, -s * 0.45 + breathe, s * 0.42, s * 0.32).fill(body)
    dino.ellipse(s * 0.08, -s * 0.38 + breathe, s * 0.24, s * 0.2).fill(BELLY)
    // back spikes
    for (let i = 0; i < 3; i++)
      dino
        .poly([-s * (0.25 - i * 0.18), -s * 0.72, -s * (0.17 - i * 0.18), -s * 0.86, -s * (0.09 - i * 0.18), -s * 0.74])
        .fill(GOLD)
    // scarf (combo 5)
    if (outfit >= 1) {
      dino.roundRect(s * 0.1, -s * 0.66 + breathe, s * 0.3, s * 0.1, s * 0.05).fill(MISS_TINT)
      dino.roundRect(s * 0.06, -s * 0.62 + breathe, s * 0.1, s * 0.22, s * 0.04).fill(MISS_TINT)
    }
    // big head (Notiş's proportions): eyes wide apart, pink cheeks
    const hx = s * 0.34
    const hy = -s * 0.88 + breathe + dip
    dino.circle(hx, hy, s * 0.34).fill(body)
    dino.circle(hx + s * 0.24, hy + s * 0.1, s * 0.15).fill(body)
    dino.circle(hx - s * 0.06, hy + s * 0.1, s * 0.07).fill({ color: CHEEK, alpha: 0.75 })
    dino.circle(hx + s * 0.3, hy + s * 0.14, s * 0.05).fill({ color: CHEEK, alpha: 0.75 })
    const er = s * 0.115
    eye(hx + s * 0.12, hy - s * 0.1, er, look.eyes, now)
    eye(hx + s * 0.34, hy - s * 0.07, er * 0.85, look.eyes, now)
    mouth(hx + s * 0.2, hy + s * 0.2, s, look.mouth)
    // sunglasses (combo 10)
    if (outfit >= 2 && look.eyes !== 'dizzy') {
      dino.roundRect(hx, hy - s * 0.2, s * 0.24, s * 0.2, s * 0.06).fill({ color: INK, alpha: 0.92 })
      dino.roundRect(hx + s * 0.25, hy - s * 0.17, s * 0.2, s * 0.17, s * 0.06).fill({ color: INK, alpha: 0.92 })
      dino
        .moveTo(hx + s * 0.22, hy - s * 0.12)
        .lineTo(hx + s * 0.26, hy - s * 0.1)
        .stroke({ width: 2.5, color: INK })
      dino.ellipse(hx + s * 0.07, hy - s * 0.15, s * 0.04, s * 0.02).fill({ color: 0xffffff, alpha: 0.5 })
    }
    // crown (combo 20)
    if (outfit >= 3) {
      const cx = hx + s * 0.06
      const cy = hy - s * 0.3
      dino
        .poly([
          cx - s * 0.16,
          cy + s * 0.02,
          cx - s * 0.18,
          cy - s * 0.16,
          cx - s * 0.08,
          cy - s * 0.06,
          cx,
          cy - s * 0.2,
          cx + s * 0.08,
          cy - s * 0.06,
          cx + s * 0.18,
          cy - s * 0.16,
          cx + s * 0.16,
          cy + s * 0.02,
        ])
        .fill(GOLD)
      dino.circle(cx, cy - s * 0.06, s * 0.025).fill(MISS_TINT)
    }
    // arm: swings with the feeling (up on a perfect, flailing when off, drooping on a stumble)
    const lift = look.arms
    const ay = -s * 0.46 + breathe
    dino
      .poly([
        s * 0.22,
        ay,
        s * 0.4,
        ay - lift * s * 0.2 - s * 0.02,
        s * 0.4,
        ay - lift * s * 0.2 + s * 0.06,
        s * 0.22,
        ay + s * 0.07,
      ])
      .fill(DINO_DARK)
    dino.circle(s * 0.4, ay - lift * s * 0.2 + s * 0.02, s * 0.045).fill(DINO_DARK)
    // trouble signs
    if (look.sweat > 0.01)
      dino
        .poly([hx - s * 0.2, hy - s * 0.3, hx - s * 0.26, hy - s * 0.18, hx - s * 0.14, hy - s * 0.18])
        .fill({ color: 0x4fc3f7, alpha: look.sweat })
    if (look.stars > 0.01)
      for (let i = 0; i < 3; i++) {
        const a = now / 200 + (i * Math.PI * 2) / 3
        sparkle(dino, hx + Math.cos(a) * s * 0.34, hy - s * 0.46 + Math.sin(a) * s * 0.07, s * 0.07, GOLD, look.stars)
      }
    if (look.sparkles > 0.01)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.5
        const d = s * (0.55 + (1 - look.sparkles) * 0.35)
        sparkle(dino, Math.cos(a) * d, -s * 0.6 + Math.sin(a) * d, s * 0.07, 0xfff3a0, look.sparkles)
      }
    if (look.shh > 0.01) {
      dino
        .roundRect(hx + s * 0.35, hy - s * 0.52, s * 0.34, s * 0.2, s * 0.08)
        .fill({ color: 0xffffff, alpha: look.shh })
      dino
        .moveTo(hx + s * 0.4, hy - s * 0.38)
        .lineTo(hx + s * 0.38, hy - s * 0.3)
        .lineTo(hx + s * 0.46, hy - s * 0.34)
        .fill({ color: 0xffffff, alpha: look.shh })
      for (let i = 0; i < 3; i++)
        dino.circle(hx + s * (0.43 + i * 0.09), hy - s * 0.42, s * 0.02).fill({ color: INK, alpha: look.shh })
    }
    // Position: feet on the ground, squash about the feet, spin about the middle.
    const squash = look
    rig.position.set(x, groundY - pose.height * unit * 1.7)
    rig.scale.set(squash.scaleX, squash.scaleY)
    dino.pivot.set(0, -s * 0.5)
    dino.position.set(0, -s * 0.5)
    dino.rotation = (pose.stumbling ? -0.25 : airborne ? -0.1 : 0) + look.spin
  }

  /** Dust puffs kicked up behind each footstep. */
  function dust(track: BeatTrack, now: number, x: number, groundY: number, unit: number) {
    const running = !track.done && now >= track.startAt
    if (!running || reducedMotion() || dinoPose(track, now).height > 0.05) return
    const k = dustAge(track.beatAt(now))
    world
      .circle(x - unit * (0.28 + k * 0.45), groundY - unit * (0.04 + k * 0.1), unit * (0.05 + k * 0.07))
      .fill({ color: SAND_DARK, alpha: 0.55 * (1 - k) })
  }

  return {
    tick(_dtMs, now) {
      const { width: w, height: h } = app.screen
      const groundY = h * 0.8
      const unit = Math.min(h * 0.17, w * 0.12)
      const track = trackRef.current
      const stage = track && !reducedMotion() ? Math.min(3, Math.floor(track.progress * 4)) : 0
      if (w !== size.w || h !== size.h || stage !== skyStage) {
        size = { w, h }
        skyStage = stage
        background(w, h, groundY, stage)
      }
      world.clear()
      signs.clear()

      const drift = (now / 60) % (w * 1.4)
      hills(w, groundY, unit, reducedMotion() ? 0 : now)
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
          obstacle(r, x, groundY, unit, (r.dueAt - now) / track.beatMs)
          if (opts.pitched && !r.rest && r.judgement === null) sign(r, x, groundY, unit)
        }
      }
      if (track) dust(track, now, DINO_X * w, groundY, unit)
      drawDino(track, now, DINO_X * w, groundY, unit)
    },
  }
}
