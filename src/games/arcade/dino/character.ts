// Dino as a character: what it feels after each press and the pose that goes
// with it. Pure: the track and the time are passed in, the scene only draws.
// Lengths are in units of the dino's size, angles in radians.

import type { BeatTrack } from '../../../rhythm/track'

export type DinoReaction = 'run' | 'perfect' | 'good' | 'off' | 'stumble' | 'sniff'
export type DinoEyes = 'open' | 'blink' | 'happy' | 'wide' | 'dizzy' | 'focus'
export type DinoMouth = 'smile' | 'grin' | 'oops' | 'flat'

/** How long each reaction plays, in ms. */
export const DINO_REACTION_MS: Record<DinoReaction, number> = {
  run: 0,
  perfect: 800,
  good: 420,
  off: 650,
  stumble: 1000,
  sniff: 650,
}

export interface DinoFeeling {
  reaction: DinoReaction
  /** Milliseconds since the reaction started (0 for `run`). */
  t: number
}

/** Combo thresholds that dress the dino up for the rest of the lesson. */
export const OUTFIT_COMBOS = [5, 10, 20] as const
/** 0 = nothing, 1 = scarf, 2 = + sunglasses, 3 = + crown. */
export const outfitLevel = (combo: number) => OUTFIT_COMBOS.filter((c) => combo >= c).length

/** What the dino is feeling at `now`, read from the track's latest events. */
export function dinoFeeling(track: BeatTrack, now: number): DinoFeeling {
  let best: { reaction: DinoReaction; since: number } | null = null
  const offer = (reaction: DinoReaction, since: number) => {
    if (now < since || now - since >= DINO_REACTION_MS[reaction]) return
    if (!best || since >= best.since) best = { reaction, since }
  }
  const last = track.lastPress
  if (last) {
    const e = last.event
    if (e.type === 'hit') {
      offer(e.judgement === 'perfect' ? 'perfect' : e.judgement === 'good' ? 'good' : 'off', last.at)
    } else if (e.type === 'stray') offer('off', last.at)
    else offer('stumble', last.at)
  }
  for (const r of track.records) {
    if (r.settledAt === null) continue
    if (r.rest) {
      if (r.judgement === 'perfect') offer('sniff', r.settledAt)
      else if (r.judgement === 'miss') offer('stumble', r.settledAt)
    } else if (r.judgement === 'miss') offer('stumble', r.settledAt)
  }
  const found = best as { reaction: DinoReaction; since: number } | null
  return found ? { reaction: found.reaction, t: now - found.since } : { reaction: 'run', t: 0 }
}

export interface DinoLook {
  /** Whole-body rotation on top of the jump tilt: a full turn for a perfect jump. */
  spin: number
  scaleX: number
  scaleY: number
  eyes: DinoEyes
  mouth: DinoMouth
  /** Arm lift: -1 down, 1 up. */
  arms: number
  /** Opacity of the sweat drop, dizzy stars, sparkles and the "shh" bubble. */
  sweat: number
  stars: number
  sparkles: number
  shh: number
  /** Head dips towards the ground (sniffing). */
  headDip: number
}

const bump = (k: number) => Math.sin(Math.min(1, Math.max(0, k)) * Math.PI)

/** The dino's pose for a feeling; `reduced` keeps the faces but drops the movement. */
export function dinoLook(feeling: DinoFeeling, now: number, reduced = false): DinoLook {
  const { reaction, t } = feeling
  const k = reaction === 'run' ? 1 : Math.min(1, t / DINO_REACTION_MS[reaction])
  const look: DinoLook = {
    spin: 0,
    scaleX: 1,
    scaleY: 1,
    eyes: now % 3200 < 130 ? 'blink' : 'open',
    mouth: 'smile',
    arms: 0,
    sweat: 0,
    stars: 0,
    sparkles: 0,
    shh: 0,
    headDip: 0,
  }
  switch (reaction) {
    case 'perfect':
      look.spin = -Math.PI * 2 * Math.min(1, t / 420)
      look.eyes = 'happy'
      look.mouth = 'grin'
      look.arms = 1
      look.sparkles = 1 - k
      break
    case 'good':
      look.mouth = 'grin'
      look.arms = 0.4
      look.scaleY = 1 + 0.08 * bump(k)
      look.scaleX = 1 - 0.05 * bump(k)
      break
    case 'off':
      look.eyes = 'wide'
      look.mouth = 'oops'
      look.arms = Math.sin(t / 45) * 0.9
      look.sweat = 1 - k
      break
    case 'stumble':
      look.scaleX = 1 + 0.2 * bump(Math.min(1, t / 160))
      look.scaleY = 1 - 0.2 * bump(Math.min(1, t / 160))
      look.eyes = k < 0.85 ? 'dizzy' : 'open'
      look.mouth = 'oops'
      look.arms = -0.6
      look.stars = k < 0.8 ? 1 : (1 - k) / 0.2
      break
    case 'sniff':
      look.eyes = 'happy'
      look.mouth = 'flat'
      look.headDip = bump(k)
      look.shh = bump(k)
      break
    default:
      break
  }
  if (reduced) {
    look.spin = 0
    look.scaleX = 1
    look.scaleY = 1
    look.arms = reaction === 'perfect' ? 1 : 0
    look.headDip = 0
  }
  return look
}

/** Where a footstep's dust puff is: 0 at the step, 1 when it has faded. Steps land twice per beat. */
export const dustAge = (beat: number) => (((beat * 2) % 1) + 1) % 1

export type CactusFace = 'calm' | 'squint' | 'happy' | 'ouch'

/**
 * A cactus watches the dino come: calm far away, squints when close, then
 * smiles once jumped over cleanly or winces when it was hit.
 * `ahead` is the beats until it is due (negative once passed).
 */
export function cactusFace(
  judgement: 'perfect' | 'good' | 'early' | 'late' | 'miss' | null,
  ahead: number,
): CactusFace {
  if (judgement === 'miss') return 'ouch'
  if (judgement) return 'happy'
  return ahead < 0.8 ? 'squint' : 'calm'
}
