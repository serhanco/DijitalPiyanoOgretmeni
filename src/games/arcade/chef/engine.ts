// "Akor Aşçısı": every order is a recipe, a chord ("Re Minör"). Drop its
// notes into the pot together before the order's patience runs out. A
// burnt dish costs a heart; a wrong ingredient or the wrong note at the
// bottom costs none. Pure logic: time is passed in.

import type { ChordTarget } from '../../../music/chords'
import { ChordListener, type ChordMatchMode, type ChordRecord, judgePress, newChordRecord } from '../../chords/session'

/** Seconds an order waits, at the start and at the end. */
const PATIENCE_START_S = 12
const PATIENCE_END_S = 7
/** Seconds between a dish leaving and the next order. */
export const NEXT_ORDER_S = 0.9

export interface Order {
  index: number
  record: ChordRecord
  patienceS: number
  waitedS: number
  state: 'cooking' | 'served' | 'burnt'
  /** Seconds since it was served or burnt. */
  since: number
}

export type ChefEvent =
  | { type: 'add'; order: Order; midi: number }
  | { type: 'serve'; order: Order; together: boolean }
  | { type: 'burn'; order: Order }
  | { type: 'spill'; order: Order; midi: number; octave: boolean }
  | { type: 'inversion'; order: Order; bottom: number }
  | { type: 'incomplete'; order: Order }

export interface ChefOptions {
  mode: ChordMatchMode
  hearts?: number
  ignoreOctave?: boolean
}

export class ChefGame {
  readonly records: ChordRecord[]
  /** The order on the stove, or the dish that just left (for its animation). */
  order: Order | null = null
  hearts: number
  score = 0
  private next = 0
  private waitS = NEXT_ORDER_S - 0.3
  private readonly listener = new ChordListener()
  private readonly mode: ChordMatchMode
  private readonly ignoreOctave: boolean

  constructor(chords: ChordTarget[], { mode, hearts = 3, ignoreOctave = false }: ChefOptions) {
    this.records = chords.map(newChordRecord)
    this.mode = mode
    this.hearts = hearts
    this.ignoreOctave = ignoreOctave
  }

  get total(): number {
    return this.records.length
  }

  get failed(): boolean {
    return this.hearts <= 0
  }

  get done(): boolean {
    return this.failed || (this.next === this.total && this.order?.state !== 'cooking')
  }

  get progress(): number {
    return this.attempted.length / this.total
  }

  /** The order being cooked. */
  get cooking(): Order | null {
    return this.order?.state === 'cooking' ? this.order : null
  }

  /** The recipes waiting after the current one. */
  get upcoming(): ChordRecord[] {
    return this.records.slice(this.next, this.next + 2)
  }

  /** Keys in the pot: the chord being played. */
  playing(now: number): number[] {
    return this.cooking ? this.listener.active(now).map((p) => p.midi) : []
  }

  get attempted(): ChordRecord[] {
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }

  private patience() {
    const t = this.total > 1 ? Math.min(1, this.next / (this.total - 1)) : 0
    return PATIENCE_START_S + (PATIENCE_END_S - PATIENCE_START_S) * t
  }

  update(dtMs: number, now: number): ChefEvent[] {
    const events: ChefEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000
    const order = this.order
    if (order && order.state !== 'cooking') order.since += dt

    if (!this.cooking) {
      this.waitS += dt
      if (this.waitS >= NEXT_ORDER_S && this.next < this.total) {
        const record = this.records[this.next]
        record.shownAt = now
        this.order = { index: this.next, record, patienceS: this.patience(), waitedS: 0, state: 'cooking', since: 0 }
        this.next++
        this.listener.clear()
      }
      return events
    }

    const cooking = this.cooking!
    cooking.waitedS += dt
    if (cooking.waitedS >= cooking.patienceS) {
      cooking.state = 'burnt'
      cooking.record.missed = true
      this.hearts--
      this.waitS = 0
      this.listener.clear()
      events.push({ type: 'burn', order: cooking })
    } else if (this.listener.abandoned(now)) {
      cooking.record.incomplete++
      events.push({ type: 'incomplete', order: cooking })
    }
    return events
  }

  press(midi: number, now: number): ChefEvent[] {
    const order = this.cooking
    if (this.done || !order) return []
    this.listener.press(midi, now)
    const ev = judgePress(order.record, this.listener, now, this.mode, this.ignoreOctave)
    switch (ev.type) {
      case 'chord':
        order.state = 'served'
        this.score++
        this.waitS = 0
        return [{ type: 'serve', order, together: ev.together }]
      case 'wrong':
        return [{ type: 'spill', order, midi: ev.midi, octave: ev.octave }]
      case 'inversion':
        return [{ type: 'inversion', order, bottom: ev.bottom }]
      default:
        return [{ type: 'add', order, midi }]
    }
  }

  release(midi: number): void {
    this.listener.release(midi)
  }
}
