// Nota Kuşu's bird as a character: its pose for every reaction and the little
// particles around it. Pure: time is passed in, the scene only draws the pose.
// Lengths are in units of the bird's radius, angles in radians.

export type BirdReaction = 'none' | 'flap' | 'oops' | 'pass' | 'crash'
export type BirdEyes = 'open' | 'blink' | 'wide' | 'happy' | 'dizzy'
export type BirdMouth = 'closed' | 'open'

/** How long each reaction plays, in ms. */
export const REACTION_MS: Record<BirdReaction, number> = { none: 0, flap: 260, oops: 520, pass: 760, crash: 1150 }

/** A stronger reaction is not cut short by a weaker one. */
const PRIORITY: Record<BirdReaction, number> = { none: 0, flap: 1, oops: 2, pass: 3, crash: 4 }

export interface BirdPose {
  /** Offsets of the whole bird. */
  dx: number
  dy: number
  /** Extra rotation on top of the climb tilt. */
  tilt: number
  scaleX: number
  scaleY: number
  /** Wing rotation: positive lifts the wing. */
  wing: number
  eyes: BirdEyes
  mouth: BirdMouth
  /** Opacity of the dizzy stars and of the sweat drop, 0..1. */
  stars: number
  sweat: number
}

export interface ReactionState {
  reaction: BirdReaction
  /** Game time the reaction started at. */
  since: number
}

/** The reaction to show after `incoming` happens at `now`. */
export function nextReaction(current: ReactionState, incoming: BirdReaction, now: number): ReactionState {
  const running = now - current.since < REACTION_MS[current.reaction]
  if (running && PRIORITY[incoming] < PRIORITY[current.reaction]) return current
  return { reaction: incoming, since: now }
}

const bump = (k: number) => Math.sin(Math.min(1, Math.max(0, k)) * Math.PI)

/**
 * The bird's pose at game time `now`. While nothing happens it bobs, beats its
 * wings and blinks now and then; `reduced` (prefers-reduced-motion) keeps the
 * faces but drops the movement.
 */
export function birdPose(state: ReactionState, now: number, reduced = false): BirdPose {
  const t = now - state.since
  const reaction = t < REACTION_MS[state.reaction] ? state.reaction : 'none'
  const k = reaction === 'none' ? 1 : t / REACTION_MS[reaction]
  const pose: BirdPose = {
    dx: 0,
    dy: Math.sin(now / 320) * 0.08,
    tilt: 0,
    scaleX: 1,
    scaleY: 1,
    wing: Math.sin(now / 85) * 0.45,
    eyes: now % 3400 < 130 ? 'blink' : 'open',
    mouth: 'closed',
    stars: 0,
    sweat: 0,
  }

  switch (reaction) {
    case 'flap':
    case 'oops': {
      const f = Math.min(1, t / REACTION_MS.flap)
      pose.scaleY = 1 + 0.16 * bump(f)
      pose.scaleX = 1 - 0.1 * bump(f)
      pose.wing = 1.15 * bump(f) - 0.3
      if (reaction === 'oops') {
        pose.eyes = 'wide'
        pose.sweat = 1 - k
        pose.tilt = Math.sin(t / 35) * 0.12 * (1 - k)
      }
      break
    }
    case 'pass':
      pose.dy -= 0.4 * bump(k)
      pose.tilt = -0.3 * bump(k)
      pose.scaleX = 1 + 0.08 * bump(k * 2)
      pose.scaleY = 1 + 0.08 * bump(k * 2)
      pose.wing = 1.1 + Math.sin(t / 45) * 0.5
      pose.eyes = 'happy'
      pose.mouth = 'open'
      break
    case 'crash': {
      // A squashed bump, knocked back, then a dizzy wobble back into place.
      const hit = Math.min(1, t / 140)
      pose.scaleX = 1 + 0.25 * bump(hit)
      pose.scaleY = 1 - 0.25 * bump(hit)
      pose.dx = -0.7 * bump(Math.min(1, t / 500))
      pose.tilt = 0.5 * Math.sin(t / 70) * (1 - k)
      pose.wing = -0.7
      pose.eyes = k < 0.85 ? 'dizzy' : 'open'
      pose.mouth = 'open'
      pose.stars = k < 0.8 ? 1 : (1 - k) / 0.2
      break
    }
  }

  if (reduced) {
    pose.dx = 0
    pose.dy = 0
    pose.tilt = 0
    pose.scaleX = 1
    pose.scaleY = 1
    pose.wing = reaction === 'crash' ? -0.7 : 0
  }
  return pose
}

export type ParticleKind = 'sparkle' | 'note' | 'feather'

export interface Particle {
  kind: ParticleKind
  /** Position relative to where the burst started, velocity per second. */
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  /** Seconds lived and seconds to live. */
  age: number
  life: number
}

/** Particles for a reaction: sparkles and a note on a pass, feathers on a crash. */
export function burst(reaction: BirdReaction, random: () => number = Math.random): Particle[] {
  const make = (kind: ParticleKind, angle: number, speed: number, life: number): Particle => ({
    kind,
    x: 0,
    y: 0,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: random() * Math.PI * 2,
    spin: (random() - 0.5) * 6,
    age: 0,
    life,
  })
  if (reaction === 'pass') {
    const sparkles = Array.from({ length: 5 }, (_, i) =>
      make('sparkle', -Math.PI / 2 + (i - 2) * 0.6 + (random() - 0.5) * 0.3, 2.4 + random(), 0.6),
    )
    return [...sparkles, { ...make('note', -Math.PI / 2, 1.6, 0.9), rot: 0, spin: 0, x: 0.3, y: -1 }]
  }
  if (reaction === 'crash') {
    return Array.from({ length: 4 }, (_, i) =>
      make('feather', -Math.PI / 2 + (i - 1.5) * 0.7 + (random() - 0.5) * 0.4, 2 + random() * 1.2, 1.1),
    )
  }
  return []
}

/** Moves particles on by `dtMs` and drops the ones whose life is over. */
export function stepParticles(particles: Particle[], dtMs: number): Particle[] {
  const dt = dtMs / 1000
  return particles
    .map((p) => {
      // Feathers drift down and slow down; sparkles and notes float up and slow down.
      const drag = p.kind === 'feather' ? 2.2 : 2.8
      const gravity = p.kind === 'feather' ? 2.2 : p.kind === 'note' ? -0.6 : 0
      const vx = p.vx * Math.exp(-drag * dt)
      const vy = p.vy * Math.exp(-drag * dt) + gravity * dt
      const sway = p.kind === 'feather' ? Math.sin((p.age + dt) * 9) * 0.6 * dt : 0
      return { ...p, x: p.x + vx * dt + sway, y: p.y + vy * dt, vx, vy, rot: p.rot + p.spin * dt, age: p.age + dt }
    })
    .filter((p) => p.age < p.life)
}
