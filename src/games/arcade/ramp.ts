// How far an arcade game is along its speed curve, and the short surprises
// ("Rüzgâr!", "Meteor yağmuru!") that speed a game up for a few seconds.
// Pure: time is passed in.

/** Endless games (Oyun Salonu): the speed ramps over `over` targets and may go `max` times as far as a lesson's. */
export interface Ramp {
  over: number
  max: number
}

export const ENDLESS_RAMP: Ramp = { over: 30, max: 1.6 }

/**
 * 0 at the first target, 1 at the last. With a ramp (an endless game) it
 * reaches 1 after `ramp.over` targets and keeps rising up to `ramp.max`.
 */
export function rampAt(spawned: number, total: number, ramp: Ramp | null): number {
  if (ramp) return Math.min(ramp.max, spawned / ramp.over)
  return total > 1 ? Math.min(1, spawned / (total - 1)) : 0
}

/** Seconds of play before the first surprise, between two, and how long one lasts. */
export const SURPRISE_FIRST_S = 20
export const SURPRISE_EVERY_S = 45
export const SURPRISE_FOR_S = 8
/** During a surprise everything moves this much faster, and every target is worth double points. */
export const SURPRISE_BOOST = 1.2

export type SurpriseChange = 'start' | 'end' | null

/** The surprise clock of one game: counts played seconds and switches surprises on and off. */
export class Surprise {
  playedS = 0
  active = false
  /** Surprises started so far. */
  count = 0
  /** False: never starts (lessons that should stay calm, tests). */
  enabled = true

  /** The speed factor now. */
  get boost(): number {
    return this.active ? SURPRISE_BOOST : 1
  }

  /** Points one target is worth now. */
  get points(): number {
    return this.active ? 2 : 1
  }

  /** Seconds left in the current surprise (0 when none). */
  get leftS(): number {
    if (!this.active) return 0
    return Math.max(0, SURPRISE_FOR_S - (this.playedS - this.startedAt(this.count - 1)))
  }

  private startedAt(n: number): number {
    return SURPRISE_FIRST_S + n * SURPRISE_EVERY_S
  }

  tick(dtS: number): SurpriseChange {
    if (!this.enabled) return null
    this.playedS += dtS
    if (this.active && this.playedS >= this.startedAt(this.count - 1) + SURPRISE_FOR_S) {
      this.active = false
      return 'end'
    }
    if (!this.active && this.playedS >= this.startedAt(this.count)) {
      this.active = true
      this.count++
      return 'start'
    }
    return null
  }
}
