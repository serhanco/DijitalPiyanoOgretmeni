// "Akor Barmeni": Nota Barmeni with chords. Customers walk along the
// counters towards the bartender, each ordering a chord; play it (every note
// together) to slide them a drink. A customer who reaches the bartender
// unserved costs a heart; a wrong key or the wrong note at the bottom costs
// none. Pure logic: time is passed in.

import type { ChordTarget } from '../../../music/chords'
import type { Clef } from '../../../music/notes'
import { ChordListener, type ChordMatchMode, type ChordRecord, judgeAmong, newChordRecord } from '../../chords/session'
import { BAR_X, ENTER_X } from './engine'

/** Seconds a customer needs to reach the bartender, at the start and at the end. */
const WALK_START_S = 15
const WALK_END_S = 10
/** Seconds between customers. */
const SPAWN_START_S = 3.6
const SPAWN_END_S = 2.4
const MAX_WAITING = 3
const SLIDE_S = 0.45
const LEAVE_S = 0.8

export interface ChordCustomer {
  index: number
  counter: number
  x: number
  look: number
  record: ChordRecord
  state: 'waiting' | 'served' | 'angry'
  leftFor: number
}

export interface ChordDrink {
  counter: number
  toX: number
  x: number
}

export type ChordBarEvent =
  | { type: 'serve'; customer: ChordCustomer; together: boolean }
  | { type: 'angry'; customer: ChordCustomer }
  | { type: 'wrong'; customer: ChordCustomer; midi: number; octave: boolean }
  | { type: 'inversion'; customer: ChordCustomer; bottom: number }
  | { type: 'incomplete'; customer: ChordCustomer }

export interface ChordBarOptions {
  mode: ChordMatchMode
  hearts?: number
  ignoreOctave?: boolean
  random?: () => number
}

/** The staff a chord is read on (one hand per chord in this game). */
export const chordClef = (chord: ChordTarget): Clef => chord.notes[0].clef

/** Counters for a lesson's chords: three for one hand, two per hand when both play. */
export function chordBarRows(chords: ChordTarget[]): Clef[] {
  const clefs = new Set(chords.map(chordClef))
  return clefs.size > 1 ? ['treble', 'treble', 'bass', 'bass'] : Array(3).fill([...clefs][0])
}

export class ChordBarGame {
  readonly records: ChordRecord[]
  readonly rows: Clef[]
  customers: ChordCustomer[] = []
  drinks: ChordDrink[] = []
  hearts: number
  score = 0
  private spawned = 0
  private sinceSpawnS = Infinity
  private readonly listener = new ChordListener()
  private readonly mode: ChordMatchMode
  private readonly ignoreOctave: boolean
  private readonly random: () => number

  constructor(
    chords: ChordTarget[],
    { mode, hearts = 3, ignoreOctave = false, random = Math.random }: ChordBarOptions,
  ) {
    this.records = chords.map(newChordRecord)
    this.rows = chordBarRows(chords)
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
    return this.failed || (this.spawned === this.total && this.waiting.length === 0)
  }

  get progress(): number {
    return this.attempted.length / this.total
  }

  /** Waiting customers, the one closest to the bartender first. */
  get waiting(): ChordCustomer[] {
    return this.customers.filter((c) => c.state === 'waiting').sort((a, b) => b.x - a.x)
  }

  get urgent(): ChordCustomer | null {
    return this.waiting[0] ?? null
  }

  get attempted(): ChordRecord[] {
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }

  /** Keys of the chord being played. */
  playing(now: number): number[] {
    return this.listener.active(now).map((p) => p.midi)
  }

  private lerp(start: number, end: number) {
    const t = this.total > 1 ? Math.min(1, this.spawned / (this.total - 1)) : 0
    return start + (end - start) * t
  }

  /** The counter of the chord's staff with the most room near the door. */
  private pickCounter(clef: Clef): number {
    const options = this.rows.map((c, i) => (c === clef ? i : -1)).filter((i) => i >= 0)
    const room = (c: number) => Math.min(1, ...this.waiting.filter((w) => w.counter === c).map((w) => w.x - ENTER_X))
    const best = Math.max(...options.map(room))
    const free = options.filter((c) => room(c) === best)
    return free[Math.floor(this.random() * free.length)]
  }

  update(dtMs: number, now: number): ChordBarEvent[] {
    const events: ChordBarEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000

    this.sinceSpawnS += dt
    const empty = this.waiting.length === 0
    if (
      this.spawned < this.total &&
      this.waiting.length < MAX_WAITING &&
      (this.sinceSpawnS >= this.lerp(SPAWN_START_S, SPAWN_END_S) || (empty && this.sinceSpawnS >= 0.8))
    ) {
      const record = this.records[this.spawned]
      record.shownAt = now
      this.customers.push({
        index: this.spawned,
        counter: this.pickCounter(chordClef(record.chord)),
        x: ENTER_X,
        look: Math.floor(this.random() * 6),
        record,
        state: 'waiting',
        leftFor: 0,
      })
      this.spawned++
      this.sinceSpawnS = 0
    }

    const speed = (BAR_X - ENTER_X) / this.lerp(WALK_START_S, WALK_END_S)
    for (const c of this.customers) {
      if (c.state !== 'waiting') {
        c.leftFor += dt
        continue
      }
      c.x += speed * dt
      if (c.x >= BAR_X) {
        c.x = BAR_X
        c.state = 'angry'
        c.record.missed = true
        this.hearts--
        events.push({ type: 'angry', customer: c })
        if (this.failed) break
      }
    }
    for (const d of this.drinks) d.x = Math.max(d.toX, d.x - (BAR_X / SLIDE_S) * dt)
    this.drinks = this.drinks.filter((d) => d.x > d.toX)
    this.customers = this.customers.filter((c) => c.state === 'waiting' || c.leftFor < LEAVE_S)

    const urgent = this.urgent
    if (this.listener.abandoned(now) && urgent) {
      urgent.record.incomplete++
      events.push({ type: 'incomplete', customer: urgent })
    }
    return events
  }

  press(midi: number, now: number): ChordBarEvent[] {
    if (this.done) return []
    const waiting = this.waiting
    if (!waiting.length) return []
    this.listener.press(midi, now)
    const judged = judgeAmong(waiting, (c) => c.record, this.listener, midi, now, this.mode, this.ignoreOctave)
    if (!judged) return []
    const { target: customer, event: ev } = judged
    if (ev.type === 'chord') {
      customer.state = 'served'
      this.score++
      this.drinks.push({ counter: customer.counter, toX: customer.x, x: BAR_X })
      return [{ type: 'serve', customer, together: ev.together }]
    }
    if (ev.type === 'wrong') return [{ type: 'wrong', customer, midi: ev.midi, octave: ev.octave }]
    if (ev.type === 'inversion') return [{ type: 'inversion', customer, bottom: ev.bottom }]
    return []
  }

  release(midi: number): void {
    this.listener.release(midi)
  }
}
