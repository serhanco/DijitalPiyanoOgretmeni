import { type Application, Container, Graphics } from 'pixi.js'
import type { Clef } from '../../../music/notes'
import { drawNote, drawStaffLines } from '../draw'
import type { Scene } from '../PixiStage'
import { fitStaff, type StaffLayout, staffStep, stepY } from '../staffGeometry'
import {
  type BirdPose,
  birdPose,
  burst,
  nextReaction,
  type Particle,
  type ReactionState,
  stepParticles,
} from './character'
import { BIRD_X, type BirdEvent, type BirdGame } from './engine'

const SKY_TOP = 0xdff4ff
const PIPE = 0x58cc02
const PIPE_DARK = 0x46a302
// The bird shares Notiş's style: flat round shapes, big shiny eyes, pink cheeks.
const BODY = 0xffc93c
const BODY_DARK = 0xf59f0b
const BELLY = 0xfff3c4
const BEAK = 0xff8a3d
const INK = 0x2b1a5c
const CHEEK = 0xff8fb1

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A five-pointed star centred on (x, y). */
function star(g: Graphics, x: number, y: number, outer: number, rot = 0) {
  const pts: number[] = []
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5
    const d = i % 2 ? outer * 0.45 : outer
    pts.push(x + Math.cos(a) * d, y + Math.sin(a) * d)
  }
  return g.poly(pts)
}

/** An ellipse turned by `rot`, as a polygon (Graphics.ellipse cannot rotate). */
function tiltedEllipse(g: Graphics, x: number, y: number, rx: number, ry: number, rot: number) {
  const pts: number[] = []
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2
    const ex = Math.cos(t) * rx
    const ey = Math.sin(t) * ry
    pts.push(x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot))
  }
  return g.poly(pts)
}

function drawEye(g: Graphics, x: number, y: number, r: number, pose: BirdPose, clock: number) {
  const line = { width: r * 0.1, color: INK, cap: 'round' as const }
  switch (pose.eyes) {
    case 'happy':
      g.moveTo(x - r * 0.2, y + r * 0.05)
        .quadraticCurveTo(x, y - r * 0.22, x + r * 0.2, y + r * 0.05)
        .stroke(line)
      return
    case 'blink':
      g.moveTo(x - r * 0.2, y)
        .quadraticCurveTo(x, y + r * 0.12, x + r * 0.2, y)
        .stroke(line)
      return
    case 'dizzy': {
      g.circle(x, y, r * 0.27).fill(0xffffff)
      const a = clock / 120
      g.arc(x, y, r * 0.17, a, a + Math.PI * 1.5).stroke({ ...line, width: r * 0.07 })
      g.arc(x, y, r * 0.07, a + Math.PI, a + Math.PI * 2.3).stroke({ ...line, width: r * 0.07 })
      return
    }
    default: {
      const wide = pose.eyes === 'wide'
      g.circle(x, y, r * (wide ? 0.31 : 0.27)).fill(0xffffff)
      g.circle(x + r * 0.07, y + r * 0.01, r * (wide ? 0.1 : 0.15)).fill(INK)
      g.circle(x + r * 0.12, y - r * 0.05, r * 0.055).fill(0xffffff)
    }
  }
}

/** Draws the bird around (0, 0) facing right; the wing is its own Graphics so it can rotate. */
function drawBirdBody(g: Graphics, wing: Graphics, r: number, pose: BirdPose, clock: number) {
  g.clear()
  wing.clear()
  // tail feathers
  for (const [dy, a] of [
    [-0.18, -0.35],
    [0.05, 0],
    [0.26, 0.35],
  ]) {
    tiltedEllipse(g, -r * 1.02, r * dy, r * 0.32, r * 0.12, a).fill(BODY_DARK)
  }
  // head tuft: a little eighth-note flag
  g.moveTo(r * 0.02, -r * 0.82)
    .quadraticCurveTo(r * 0.08, -r * 1.4, r * 0.5, -r * 1.28)
    .quadraticCurveTo(r * 0.24, -r * 1.12, r * 0.26, -r * 0.84)
    .closePath()
    .fill(BODY_DARK)
  // body and belly
  g.ellipse(0, 0, r * 1.05, r * 0.95).fill(BODY)
  g.ellipse(-r * 0.08, r * 0.38, r * 0.62, r * 0.44).fill({ color: BELLY, alpha: 0.85 })
  // cheeks
  g.circle(-r * 0.14, r * 0.2, r * 0.12).fill({ color: CHEEK, alpha: 0.7 })
  g.circle(r * 0.62, r * 0.26, r * 0.1).fill({ color: CHEEK, alpha: 0.7 })
  // eyes
  drawEye(g, r * 0.06, -r * 0.2, r, pose, clock)
  drawEye(g, r * 0.64, -r * 0.22, r, pose, clock)
  // beak: closed, or open in a smile or an "ouch"
  if (pose.mouth === 'open') {
    g.poly([r * 0.86, 0, r * 1.3, r * 0.06, r * 0.88, r * 0.13]).fill(BEAK)
    g.poly([r * 0.88, r * 0.2, r * 1.16, r * 0.27, r * 0.86, r * 0.34]).fill(BEAK)
    g.poly([r * 0.88, r * 0.13, r * 1.06, r * 0.18, r * 0.88, r * 0.2]).fill(0xc2410c)
  } else {
    g.poly([r * 0.88, r * 0.02, r * 1.3, r * 0.13, r * 0.88, r * 0.26]).fill(BEAK)
  }
  // wing, pivoting at the shoulder
  wing.ellipse(-r * 0.4, 0, r * 0.46, r * 0.24).fill(BODY_DARK)
  wing.ellipse(-r * 0.46, -r * 0.05, r * 0.28, r * 0.11).fill({ color: 0xffffff, alpha: 0.2 })
  wing.position.set(-r * 0.22, r * 0.1)
  wing.rotation = pose.wing
  // sweat drop after a wrong key
  if (pose.sweat > 0) {
    g.moveTo(r * 1.0, -r * 0.92)
      .quadraticCurveTo(r * 1.14, -r * 0.7, r * 1.0, -r * 0.62)
      .quadraticCurveTo(r * 0.86, -r * 0.7, r * 1.0, -r * 0.92)
      .fill({ color: 0x7cc8ff, alpha: pose.sweat })
  }
}

export function createBirdScene(
  app: Application,
  game: BirdGame,
  clef: Clef,
  range: number[],
  onEvents: (events: BirdEvent[]) => void,
  onLayout: (layout: StaffLayout) => void,
): Scene {
  const root = new Container()
  app.stage.addChild(root)
  const bg = new Graphics()
  const world = new Graphics()
  const bird = new Container()
  const body = new Graphics()
  const wing = new Graphics()
  bird.addChild(body, wing)
  // Stars circle the dizzy bird's head, drawn without the bird's tilt.
  const halo = new Graphics()
  const fx = new Graphics()
  root.addChild(bg, world, bird, halo, fx)
  let react: ReactionState = { reaction: 'none', since: 0 }
  let particles: { p: Particle; ox: number; oy: number }[] = []
  let flaps = game.flaps
  const reduced = reducedMotion()

  const steps = range.map((m) => staffStep(m, clef))
  const minStep = Math.min(...steps)
  const maxStep = Math.max(...steps)
  let layout: StaffLayout = fitStaff(app.screen.height, minStep, maxStep)
  let size = { w: 0, h: 0 }

  function layoutIfResized() {
    const { width: w, height: h } = app.screen
    if (w === size.w && h === size.h) return
    size = { w, h }
    layout = fitStaff(h, minStep, maxStep, 1.5, w / 11)
    bg.clear()
    bg.rect(0, 0, w, h).fill(SKY_TOP)
    drawStaffLines(bg, 0, w, layout, 0x2b2f3a, 0.55)
    onLayout(layout)
  }

  function drawBird(x: number, y: number, r: number, now: number) {
    const pose = birdPose(react, now, reduced)
    drawBirdBody(body, wing, r, pose, now)
    bird.position.set(x + pose.dx * r, y + pose.dy * r)
    bird.scale.set(pose.scaleX, pose.scaleY)
    const climb = Math.max(-0.4, Math.min(0.4, (game.birdStep - game.birdY) * -0.12))
    bird.rotation = reduced ? 0 : climb + pose.tilt
    halo.clear()
    if (pose.stars > 0) {
      for (let i = 0; i < 3; i++) {
        const a = now / 260 + (i * Math.PI * 2) / 3
        const sx = bird.x + r * 0.3 + Math.cos(a) * r * 0.75
        const sy = bird.y - r * 1.15 + Math.sin(a) * r * 0.22
        star(halo, sx, sy, r * 0.2, a).fill({ color: 0xffd23f, alpha: pose.stars })
      }
    }
  }

  function drawParticles(r: number) {
    fx.clear()
    for (const { p, ox, oy } of particles) {
      const x = ox + p.x * r
      const y = oy + p.y * r
      const fade = 1 - p.age / p.life
      if (p.kind === 'sparkle')
        star(fx, x, y, r * 0.22 * (0.6 + fade * 0.4), p.rot).fill({ color: 0xffd23f, alpha: fade })
      else if (p.kind === 'feather')
        tiltedEllipse(fx, x, y, r * 0.24, r * 0.09, p.rot).fill({ color: BODY, alpha: fade })
      else {
        // a little eighth note floating up: "+1"
        fx.ellipse(x, y, r * 0.17, r * 0.13).fill({ color: 0x7c4dff, alpha: fade })
        fx.rect(x + r * 0.12, y - r * 0.55, r * 0.06, r * 0.55).fill({ color: 0x7c4dff, alpha: fade })
        fx.moveTo(x + r * 0.18, y - r * 0.55)
          .quadraticCurveTo(x + r * 0.42, y - r * 0.42, x + r * 0.34, y - r * 0.2)
          .stroke({ width: r * 0.06, color: 0x7c4dff, alpha: fade, cap: 'round' })
      }
    }
  }

  function start(reaction: 'flap' | 'oops' | 'pass' | 'crash', now: number, x: number, y: number) {
    react = nextReaction(react, reaction, now)
    if (reduced) return
    for (const p of burst(reaction)) particles.push({ p, ox: x, oy: y })
  }

  return {
    tick(dtMs, now) {
      layoutIfResized()
      const events = game.update(dtMs, now)
      if (events.length) onEvents(events)

      const { w, h } = size
      const { gap } = layout
      const pipeW = gap * 1.7
      const opening = gap * 1.25
      world.clear()
      for (const p of game.pipes) {
        const x = p.x * w
        const cy = stepY(p.step, layout)
        const color = p.state === 'crashed' ? 0xff4b4b : PIPE
        const alpha = p.state === 'flying' ? 1 : 0.55
        // top and bottom columns with caps
        world.rect(x - pipeW / 2, -10, pipeW, cy - opening / 2 + 10).fill({ color, alpha })
        world.rect(x - pipeW / 2, cy + opening / 2, pipeW, h - cy - opening / 2 + 10).fill({ color, alpha })
        const round = gap * 0.18
        world
          .roundRect(x - pipeW * 0.62, cy - opening / 2 - gap * 0.5, pipeW * 1.24, gap * 0.5, round)
          .fill({ color: PIPE_DARK, alpha })
        world
          .roundRect(x - pipeW * 0.62, cy + opening / 2, pipeW * 1.24, gap * 0.5, round)
          .fill({ color: PIPE_DARK, alpha })
        if (p.state === 'flying') drawNote(world, x, p.step, layout)
      }

      const r = gap * 0.55
      const bx = BIRD_X * w
      const by = stepY(game.birdY, layout)
      if (game.flaps !== flaps) {
        flaps = game.flaps
        start(game.lastFlapCorrect ? 'flap' : 'oops', now, bx, by)
      }
      for (const e of events) if (e.type !== 'flap') start(e.type, now, bx, by)
      particles = particles
        .map(({ p, ox, oy }) => ({ p: stepParticles([p], dtMs)[0], ox, oy }))
        .filter((q) => q.p !== undefined)
      drawBird(bx, by, r, now)
      drawParticles(r)
    },
  }
}
