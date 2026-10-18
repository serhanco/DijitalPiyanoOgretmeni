// "Nota Treni": the notes of a melody ride towards the station in a row of
// wagons, several in sight at once, so the player reads ahead like a real
// pianist. Play the front wagon's note to couple it to the engine; a wagon
// that reaches the signal unplayed derails and costs a heart. A wrong key
// costs none. Pure logic: time is passed in.

import type { PromptRecord } from '../../noteHunter/session'
import { rampAt, type Ramp, Surprise } from '../ramp'
import type { SkillProvider } from '../skill'

/** The signal on the left (0..1 of the width): the front wagon must be played before it gets here. */
export const SIGNAL_X = 0.16
/** Wagons enter on the right, this far apart. */
export const ENTER_X = 1.06
export const WAGON_GAP = 0.16
/** Seconds a wagon needs from the right edge to the signal, at the start and at the end. */
const CROSS_START_S = 9
const CROSS_END_S = 5.5
/** Seconds a coupled or derailed wagon stays on screen. */
export const LEAVE_S = 0.7

export interface Wagon {
  index: number
  x: number
  record: PromptRecord
  state: 'coming' | 'coupled' | 'derailed'
  since: number
}

export type TrainEvent = { type: 'couple' | 'derail' | 'wrong'; wagon: Wagon }

export class TrainGame {
  readonly records: PromptRecord[]
  wagons: Wagon[] = []
  hearts: number
  score = 0
  /** Wagons coupled so far: the length of the train. */
  coupled = 0
  /** Adaptive difficulty: every duration is divided by this (1.1 = 10% faster). */
  pace = 1
  /** Oyun Salonu: an endless game ramps its speed over a number of targets instead of the whole list. */
  ramp: Ramp | null = null
  /** Short surprises that speed the game up and double the points for a few seconds. */
  readonly surprise = new Surprise()
  private spawned = 0
  private readonly skill: SkillProvider

  constructor(skill: SkillProvider, hearts = 3) {
    this.skill = skill
    this.hearts = hearts
    this.records = skill.targets.map((t) => ({
      target: t.midi,
      clef: t.clef ?? skill.clef,
      shownAt: null,
      answeredAt: null,
      wrongPresses: [],
    }))
  }

  get total(): number {
    return this.records.length
  }

  get failed(): boolean {
    return this.hearts <= 0
  }

  get done(): boolean {
    return this.failed || (this.spawned === this.total && this.wagons.every((w) => w.state !== 'coming'))
  }

  get progress(): number {
    return this.attempted.length / this.total
  }

  /** The wagon to play now. */
  get front(): Wagon | null {
    return this.wagons.find((w) => w.state === 'coming') ?? null
  }

  get attempted(): PromptRecord[] {
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }

  private speed(): number {
    const t = rampAt(this.spawned, this.total, this.ramp)
    const s = CROSS_START_S + (CROSS_END_S - CROSS_START_S) * t
    return (ENTER_X - SIGNAL_X) / (s / (this.pace * this.surprise.boost))
  }

  /** The front wagon's prompt starts when it becomes the front (reading ahead is a bonus, not a cost). */
  private markFront(now: number) {
    const f = this.front
    if (f && f.record.shownAt === null) f.record.shownAt = now
  }

  update(dtMs: number, now: number): TrainEvent[] {
    const events: TrainEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000
    this.surprise.tick(dt)

    const last = this.wagons[this.wagons.length - 1]
    if (this.spawned < this.total && (!last || last.x <= ENTER_X - WAGON_GAP)) {
      this.wagons.push({
        index: this.spawned,
        x: last ? last.x + WAGON_GAP : ENTER_X,
        record: this.records[this.spawned],
        state: 'coming',
        since: 0,
      })
      this.spawned++
    }

    const v = this.speed()
    for (const w of this.wagons) {
      if (w.state !== 'coming') {
        w.since += dt
        continue
      }
      w.x -= v * dt
    }
    const f = this.front
    if (f && f.x <= SIGNAL_X) {
      f.state = 'derailed'
      f.record.missed = true
      if (f.record.shownAt === null) f.record.shownAt = now
      this.hearts--
      events.push({ type: 'derail', wagon: f })
    }
    this.wagons = this.wagons.filter((w) => w.state === 'coming' || w.since < LEAVE_S)
    this.markFront(now)
    return events
  }

  press(midi: number, now: number): TrainEvent[] {
    const f = this.front
    if (this.done || !f) return []
    this.markFront(now)
    if (this.skill.matches({ midi: f.record.target }, midi)) {
      f.state = 'coupled'
      f.record.answeredAt = now
      this.coupled++
      this.score += this.surprise.points
      this.markFront(now)
      return [{ type: 'couple', wagon: f }]
    }
    f.record.wrongPresses.push(midi)
    return [{ type: 'wrong', wagon: f }]
  }
}
