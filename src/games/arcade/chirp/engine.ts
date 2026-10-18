// "Kayıp Kuş Sesi": lost little birds fly in one at a time and sing one
// note. Find the note on the keys (by ear: nothing on screen says which)
// and the bird flies home to its nest, which is labelled with the note's
// name. A bird that waits too long flies away and costs a heart; a wrong key
// costs none, the bird just sings again. Pure logic: time is passed in.

import type { PromptRecord } from '../../noteHunter/session'
import { rampAt, type Ramp, Surprise } from '../ramp'
import type { SkillProvider } from '../skill'

/** Seconds to fly in to the branch. */
export const ARRIVE_S = 1.1
/** Seconds a bird waits after its first song, at the start and at the end. */
const PATIENCE_START_S = 10
const PATIENCE_END_S = 6.5
/** Seconds between a bird leaving and the next one. */
const NEXT_S = 0.9
/** Seconds the flight home (or away) is shown. */
export const LEAVE_S = 1.1

export interface ChirpBird {
  index: number
  record: PromptRecord
  state: 'arriving' | 'waiting' | 'home' | 'lost'
  /** Seconds in the current state. */
  since: number
  patienceS: number
  /** Colour of its feathers: random, so the colour never gives the note away. */
  look: number
}

export type ChirpEvent =
  /** The bird sings: play its note. `again` after a wrong key or a replay. */
  | { type: 'sing'; bird: ChirpBird; again: boolean }
  | { type: 'home' | 'lost'; bird: ChirpBird }
  | { type: 'wrong'; bird: ChirpBird; midi: number }

export class ChirpGame {
  readonly records: PromptRecord[]
  bird: ChirpBird | null = null
  hearts: number
  score = 0
  /** Birds brought home, per note: how full each nest is. */
  readonly nests = new Map<number, number>()
  /** Songs asked for again with the replay button. */
  replays = 0
  /** Adaptive difficulty: every duration is divided by this (1.1 = 10% faster). */
  pace = 1
  ramp: Ramp | null = null
  readonly surprise = new Surprise()
  private next = 0
  private waitS = NEXT_S - 0.4
  private readonly skill: SkillProvider
  private readonly random: () => number

  constructor(skill: SkillProvider, hearts = 3, random: () => number = Math.random) {
    this.skill = skill
    this.hearts = hearts
    this.random = random
    this.records = skill.targets.map((t) => ({ target: t.midi, shownAt: null, answeredAt: null, wrongPresses: [] }))
    // Surprises would rush the ear: this game stays calm.
    this.surprise.enabled = false
  }

  get total(): number {
    return this.records.length
  }

  get failed(): boolean {
    return this.hearts <= 0
  }

  get done(): boolean {
    return (
      this.failed ||
      (this.next === this.total &&
        (!this.bird || this.bird.state === 'home' || this.bird.state === 'lost') &&
        (this.bird?.since ?? LEAVE_S) >= LEAVE_S)
    )
  }

  get progress(): number {
    return this.attempted.length / this.total
  }

  get attempted(): PromptRecord[] {
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }

  /** The bird on the branch, waiting for its note. */
  get waiting(): ChirpBird | null {
    return this.bird?.state === 'waiting' ? this.bird : null
  }

  /** Share of the waiting bird's patience left (1 = just sang). */
  get patienceLeft(): number {
    const b = this.waiting
    return b ? Math.max(0, 1 - b.since / b.patienceS) : 0
  }

  private patience(): number {
    const t = rampAt(this.next, this.total, this.ramp)
    return (PATIENCE_START_S + (PATIENCE_END_S - PATIENCE_START_S) * t) / this.pace
  }

  update(dtMs: number, now: number): ChirpEvent[] {
    const events: ChirpEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000
    const b = this.bird
    if (b) b.since += dt

    if (!b || b.state === 'home' || b.state === 'lost') {
      this.waitS += dt
      if (this.waitS >= NEXT_S && this.next < this.total) {
        this.bird = {
          index: this.next,
          record: this.records[this.next],
          state: 'arriving',
          since: 0,
          patienceS: this.patience(),
          look: Math.floor(this.random() * 6),
        }
        this.next++
      }
      return events
    }
    if (b.state === 'arriving' && b.since >= ARRIVE_S) {
      b.state = 'waiting'
      b.since = 0
      b.record.shownAt = now
      events.push({ type: 'sing', bird: b, again: false })
    } else if (b.state === 'waiting' && b.since >= b.patienceS) {
      b.state = 'lost'
      b.since = 0
      b.record.missed = true
      this.hearts--
      this.waitS = 0
      events.push({ type: 'lost', bird: b })
    }
    return events
  }

  /** The replay button: the bird sings again (its patience does not reset). */
  replay(): ChirpEvent[] {
    const b = this.waiting
    if (!b) return []
    this.replays++
    return [{ type: 'sing', bird: b, again: true }]
  }

  press(midi: number, now: number): ChirpEvent[] {
    const b = this.waiting
    if (this.done || !b) return []
    if (this.skill.matches({ midi: b.record.target }, midi)) {
      b.state = 'home'
      b.since = 0
      b.record.answeredAt = now
      this.score++
      this.nests.set(b.record.target, (this.nests.get(b.record.target) ?? 0) + 1)
      this.waitS = 0
      return [{ type: 'home', bird: b }]
    }
    b.record.wrongPresses.push(midi)
    return [{ type: 'wrong', bird: b, midi }]
  }
}
