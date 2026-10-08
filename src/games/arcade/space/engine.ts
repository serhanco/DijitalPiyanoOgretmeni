// "Uzay Savunması": invaders carrying a chord drift down towards the base;
// play the chord (every note together) and the cannon shoots it. An invader
// that lands costs a heart; a wrong key or a wrong inversion costs none.
// Pure logic: time is passed in.

import type { ChordTarget } from '../../../music/chords'
import { ChordListener, type ChordMatchMode, type ChordRecord, judgeAmong, newChordRecord } from '../../chords/session'

export const SPACE_LANES = 3
/** Seconds an invader takes from the top to the base, at the start and at the end. */
const FALL_START_S = 14
const FALL_END_S = 9
/** Seconds between invaders. */
const SPAWN_START_S = 4.2
const SPAWN_END_S = 2.6
const MAX_FLYING = 3
export const START_Y = -0.12
/** Where the base is, as a share of the height (y grows downwards). */
export const BASE_Y = 0.8
/** Seconds a shot or landed invader stays on screen for its animation. */
export const LINGER_S = 0.5

export interface Invader {
  index: number
  lane: number
  y: number
  record: ChordRecord
  state: 'flying' | 'hit' | 'landed'
  /** Seconds since it was hit or landed. */
  since: number
}

export type SpaceEvent =
  | { type: 'shoot'; invader: Invader; together: boolean }
  | { type: 'land'; invader: Invader }
  | { type: 'wrong'; invader: Invader; midi: number; octave: boolean }
  | { type: 'inversion'; invader: Invader; bottom: number }
  | { type: 'incomplete'; invader: Invader }

export interface SpaceOptions {
  mode: ChordMatchMode
  hearts?: number
  ignoreOctave?: boolean
  random?: () => number
}

export class SpaceGame {
  readonly records: ChordRecord[]
  invaders: Invader[] = []
  hearts: number
  score = 0
  /** The latest shot, for the laser. */
  lastShot: { invader: Invader; lane: number } | null = null
  private spawned = 0
  private sinceSpawnS = Infinity
  private lastLane = -1
  private readonly listener = new ChordListener()
  private readonly mode: ChordMatchMode
  private readonly ignoreOctave: boolean
  private readonly random: () => number

  constructor(chords: ChordTarget[], { mode, hearts = 3, ignoreOctave = false, random = Math.random }: SpaceOptions) {
    this.records = chords.map(newChordRecord)
    this.mode = mode
    this.hearts = hearts
    this.ignoreOctave = ignoreOctave
    this.random = random
  }

  get total(): number {
    return this.records.length
  }

  get failed(): boolean {
    return this.hearts <= 0
  }

  get done(): boolean {
    return this.failed || (this.spawned === this.total && this.invaders.every((i) => i.state !== 'flying'))
  }

  get progress(): number {
    return this.attempted.length / this.total
  }

  /** Flying invaders, the lowest (most urgent) first. */
  get flying(): Invader[] {
    return this.invaders.filter((i) => i.state === 'flying').sort((a, b) => b.y - a.y)
  }

  /** The chord to play first, for hints and tests. */
  get urgent(): Invader | null {
    return this.flying[0] ?? null
  }

  /** Keys of the chord being played. */
  playing(now: number): number[] {
    return this.listener.active(now).map((p) => p.midi)
  }

  /** Chords that were settled: shot, or landed. */
  get attempted(): ChordRecord[] {
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }

  private lerp(start: number, end: number) {
    const t = this.total > 1 ? Math.min(1, this.spawned / (this.total - 1)) : 0
    return start + (end - start) * t
  }

  private pickLane(): number {
    const lanes = [...Array(SPACE_LANES).keys()].filter(
      (l) => l !== this.lastLane && !this.flying.some((i) => i.lane === l && i.y < 0.25),
    )
    const lane = lanes.length ? lanes[Math.floor(this.random() * lanes.length)] : (this.lastLane + 1) % SPACE_LANES
    this.lastLane = lane
    return lane
  }

  update(dtMs: number, now: number): SpaceEvent[] {
    const events: SpaceEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000

    this.sinceSpawnS += dt
    const nothingFlying = this.flying.length === 0
    if (
      this.spawned < this.total &&
      this.flying.length < MAX_FLYING &&
      (this.sinceSpawnS >= this.lerp(SPAWN_START_S, SPAWN_END_S) || (nothingFlying && this.sinceSpawnS >= 0.8))
    ) {
      const record = this.records[this.spawned]
      record.shownAt = now
      this.invaders.push({ index: this.spawned, lane: this.pickLane(), y: START_Y, record, state: 'flying', since: 0 })
      this.spawned++
      this.sinceSpawnS = 0
    }

    const speed = (BASE_Y - START_Y) / this.lerp(FALL_START_S, FALL_END_S)
    for (const inv of this.invaders) {
      if (inv.state !== 'flying') {
        inv.since += dt
        continue
      }
      inv.y += speed * dt
      if (inv.y >= BASE_Y) {
        inv.state = 'landed'
        inv.record.missed = true
        this.hearts--
        events.push({ type: 'land', invader: inv })
        if (this.failed) break
      }
    }
    this.invaders = this.invaders.filter((i) => i.state === 'flying' || i.since < LINGER_S)

    const urgent = this.urgent
    if (this.listener.abandoned(now) && urgent) {
      urgent.record.incomplete++
      events.push({ type: 'incomplete', invader: urgent })
    }
    return events
  }

  press(midi: number, now: number): SpaceEvent[] {
    if (this.done) return []
    const flying = this.flying
    if (!flying.length) return []
    this.listener.press(midi, now)
    const judged = judgeAmong(flying, (i) => i.record, this.listener, midi, now, this.mode, this.ignoreOctave)
    if (!judged) return []
    const { target, event: ev } = judged
    if (ev.type === 'chord') {
      target.state = 'hit'
      this.score++
      this.lastShot = { invader: target, lane: target.lane }
      return [{ type: 'shoot', invader: target, together: ev.together }]
    }
    if (ev.type === 'wrong') return [{ type: 'wrong', invader: target, midi: ev.midi, octave: ev.octave }]
    if (ev.type === 'inversion') return [{ type: 'inversion', invader: target, bottom: ev.bottom }]
    return []
  }

  release(midi: number): void {
    this.listener.release(midi)
  }
}
