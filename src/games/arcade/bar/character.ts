// The bar's characters: the bartender's moods and the customers' kinds and
// patience. Pure: time is passed in, the scene only draws what is computed here.
// Lengths are in units of the bartender's radius, angles in radians.

export type BarMood = 'idle' | 'serve' | 'wrong' | 'angry'
export type BarEyes = 'open' | 'blink' | 'happy' | 'wide' | 'wink'
export type BarMouth = 'smile' | 'grin' | 'oops'

export const MOOD_MS: Record<BarMood, number> = { idle: 0, serve: 700, wrong: 900, angry: 1100 }
const PRIORITY: Record<BarMood, number> = { idle: 0, serve: 1, wrong: 2, angry: 3 }

export interface MoodState {
  mood: BarMood
  since: number
}

/** A stronger mood is not cut short by a weaker one. */
export function nextMood(current: MoodState, incoming: BarMood, now: number): MoodState {
  const running = now - current.since < MOOD_MS[current.mood]
  if (running && PRIORITY[incoming] < PRIORITY[current.mood]) return current
  return { mood: incoming, since: now }
}

/** Serves in a row that make the bartender juggle. */
export const JUGGLE_STREAK = 5

export interface BartenderLook {
  /** Whole-body offsets and tilt. */
  dx: number
  dy: number
  tilt: number
  eyes: BarEyes
  mouth: BarMouth
  /** Arm lift per side: -1 down, 1 straight up. */
  armL: number
  armR: number
  /** A bottle tossed in the air: 0..1 progress, null when none. */
  toss: number | null
  /** A glass slipping out of the hand: 0..1 progress, null when none. */
  slip: number | null
  /** Sweat drop and steam opacity. */
  sweat: number
  /** Three bottles in the air, circling. */
  juggling: boolean
}

const bump = (k: number) => Math.sin(Math.min(1, Math.max(0, k)) * Math.PI)

/** The bartender's pose; `reduced` (prefers-reduced-motion) keeps the faces but drops the movement. */
export function bartenderLook(state: MoodState, streak: number, now: number, reduced = false): BartenderLook {
  const t = now - state.since
  const mood = t < MOOD_MS[state.mood] ? state.mood : 'idle'
  const k = mood === 'idle' ? 1 : t / MOOD_MS[mood]
  const juggling = streak >= JUGGLE_STREAK && mood !== 'wrong' && mood !== 'angry'
  const look: BartenderLook = {
    dx: 0,
    dy: Math.sin(now / 380) * 0.04,
    tilt: 0,
    eyes: now % 3600 < 140 ? 'blink' : 'open',
    mouth: 'smile',
    armL: 0.1 + Math.sin(now / 500) * 0.05,
    armR: 0.1 - Math.sin(now / 500) * 0.05,
    toss: null,
    slip: null,
    sweat: 0,
    juggling,
  }
  if (juggling) {
    look.armL = 0.7 + Math.sin(now / 130) * 0.25
    look.armR = 0.7 - Math.sin(now / 130) * 0.25
    look.eyes = 'happy'
    look.mouth = 'grin'
  }
  switch (mood) {
    case 'serve':
      look.armR = 0.5 + 0.6 * bump(k * 1.4)
      look.toss = k
      look.eyes = t < 400 ? 'wink' : 'happy'
      look.mouth = 'grin'
      look.dy -= 0.12 * bump(k * 2)
      break
    case 'wrong':
      look.tilt = -0.28 * bump(k * 1.5)
      look.dx = 0.12 * bump(k * 1.5)
      look.eyes = 'wide'
      look.mouth = 'oops'
      look.armR = -0.2
      look.slip = k
      look.sweat = 1 - k
      break
    case 'angry':
      // facepalm: both hands up to the face
      look.armL = 0.9
      look.armR = 0.9
      look.tilt = Math.sin(t / 60) * 0.06 * (1 - k)
      look.eyes = 'wide'
      look.mouth = 'oops'
      look.sweat = 1 - k
      break
    default:
      break
  }
  if (reduced) {
    look.dx = 0
    look.dy = 0
    look.tilt = 0
    look.toss = null
    look.slip = null
    look.juggling = false
    look.armL = mood === 'angry' ? 0.9 : 0.1
    look.armR = mood === 'serve' ? 0.8 : mood === 'angry' ? 0.9 : 0.1
  }
  return look
}

/** Where juggled bottle `i` of three is at `now`: x offset and height (0 = hands, 1 = top). */
export function juggleBottle(i: number, now: number): { x: number; h: number; spin: number } {
  const phase = (now / 650 + i / 3) % 1
  return { x: Math.cos(phase * Math.PI * 2) * 0.55, h: bump(phase) * 0.9, spin: phase * Math.PI * 4 }
}

export const CUSTOMER_KINDS = ['cat', 'frog', 'robot', 'octopus', 'bear', 'bunny'] as const
export type CustomerKind = (typeof CUSTOMER_KINDS)[number]

export const kindOf = (look: number): CustomerKind => CUSTOMER_KINDS[((look % 6) + 6) % 6]

/** Body colour per kind. */
export const KIND_COLOR: Record<CustomerKind, number> = {
  cat: 0xffa95e,
  frog: 0x7bd389,
  robot: 0x9fb7ff,
  octopus: 0xd6a2ff,
  bear: 0xc98b52,
  bunny: 0xff9fb2,
}

export type Patience = 'calm' | 'tapping' | 'watching' | 'steaming'

/** How patient a customer still is, from how far along the counter (0..1 of the walk) it is. */
export function patienceOf(progress: number): Patience {
  if (progress < 0.5) return 'calm'
  if (progress < 0.72) return 'tapping'
  if (progress < 0.88) return 'watching'
  return 'steaming'
}

export interface ServedFx {
  /** Glass raised to the mouth, 0..1 (tilts and empties). */
  sip: number
  /** Heart and coin float up: progress 0..1 and opacity. */
  rise: number
  fade: number
}

/** A served customer's little celebration over its `leftFor` seconds. */
export function servedFx(leftFor: number): ServedFx {
  const k = Math.min(1, Math.max(0, leftFor / 0.8))
  return { sip: bump(k * 1.6), rise: k, fade: 1 - Math.max(0, k - 0.6) / 0.4 }
}
