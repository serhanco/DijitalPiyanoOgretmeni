// "Nota Barmeni" (after the old Tapper arcade game): customers walk along
// four counters towards the bartender, each with a note in a speech bubble.
// The two upper counters read the treble staff (right hand), the two lower
// ones the bass staff (left hand). Play a customer's note to slide a drink
// to them; a customer who reaches the bartender unserved costs a heart.
// Pure logic: time is passed in.

import type { Clef } from '../../../music/notes'
import type { PromptRecord } from '../../noteHunter/session'
import type { SkillProvider } from '../skill'

export const COUNTERS = 4
/** Counters of each staff, top to bottom. */
export const COUNTERS_OF: Record<Clef, number[]> = { treble: [0, 1], bass: [2, 3] }
export const clefOfCounter = (counter: number): Clef => (counter < 2 ? 'treble' : 'bass')

/** Where customers enter and where the bartender stands (0..1 along the counter). */
export const ENTER_X = 0
export const BAR_X = 0.86
/** Seconds a customer needs to reach the bartender, at the start and at the end. */
const WALK_START_S = 11
const WALK_END_S = 7
/** Seconds between customers. */
const SPAWN_START_S = 2.3
const SPAWN_END_S = 1.3
const MAX_WAITING = 5
/** Seconds a drink takes to slide along the whole counter. */
const SLIDE_S = 0.45
/** Seconds a served or angry customer stays on screen. */
const LEAVE_S = 0.8

export interface Customer {
  index: number
  counter: number
  x: number
  look: number
  record: PromptRecord
  state: 'waiting' | 'served' | 'angry'
  /** Seconds since being served or getting angry. */
  leftFor: number
}

export interface Drink {
  counter: number
  /** Where it was sent from and where it stops. */
  toX: number
  x: number
  customer: Customer
}

export type BarEvent = { type: 'serve' | 'angry' | 'wrong'; customer: Customer }

export class BarGame {
  readonly records: PromptRecord[]
  customers: Customer[] = []
  drinks: Drink[] = []
  hearts: number
  score = 0
  private spawned = 0
  private sinceSpawnS = Infinity
  private readonly skill: SkillProvider
  private readonly random: () => number

  constructor(skill: SkillProvider, hearts = 3, random: () => number = Math.random) {
    this.skill = skill
    this.hearts = hearts
    this.random = random
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
    return this.failed || (this.spawned === this.total && this.waiting.length === 0)
  }

  get progress(): number {
    return this.records.filter((r) => r.answeredAt !== null || r.missed).length / this.total
  }

  get waiting(): Customer[] {
    return this.customers.filter((c) => c.state === 'waiting')
  }

  get attempted(): PromptRecord[] {
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }

  private lerp(start: number, end: number) {
    const t = this.total > 1 ? Math.min(1, this.spawned / (this.total - 1)) : 0
    return start + (end - start) * t
  }

  /** The counter of the customer's staff with the most room near the door. */
  private pickCounter(clef: Clef): number {
    const options = COUNTERS_OF[clef]
    const room = (c: number) => Math.min(1, ...this.waiting.filter((w) => w.counter === c).map((w) => w.x - ENTER_X))
    const best = Math.max(...options.map(room))
    const free = options.filter((c) => room(c) === best)
    return free[Math.floor(this.random() * free.length)]
  }

  update(dtMs: number, now: number): BarEvent[] {
    const events: BarEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000

    this.sinceSpawnS += dt
    if (
      this.spawned < this.total &&
      this.waiting.length < MAX_WAITING &&
      this.sinceSpawnS >= this.lerp(SPAWN_START_S, SPAWN_END_S)
    ) {
      const record = this.records[this.spawned]
      record.shownAt = now
      this.customers.push({
        index: this.spawned,
        counter: this.pickCounter(record.clef!),
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
      }
    }
    for (const d of this.drinks) d.x = Math.max(d.toX, d.x - (BAR_X / SLIDE_S) * dt)
    this.drinks = this.drinks.filter((d) => d.x > d.toX)
    this.customers = this.customers.filter((c) => c.state === 'waiting' || c.leftFor < LEAVE_S)
    return events
  }

  press(midi: number, now: number): BarEvent[] {
    if (this.done) return []
    // The customer closest to the bartender is the most urgent one.
    const waiting = this.waiting.sort((a, b) => b.x - a.x)
    if (!waiting.length) return []
    const hit = waiting.find((c) => this.skill.matches({ midi: c.record.target }, midi))
    if (hit) {
      hit.state = 'served'
      hit.record.answeredAt = now
      this.score++
      this.drinks.push({ counter: hit.counter, toX: hit.x, x: BAR_X, customer: hit })
      return [{ type: 'serve', customer: hit }]
    }
    // A wrong key is blamed on the most urgent customer of the hand that played it.
    const side: Clef = midi >= 60 ? 'treble' : 'bass'
    const blamed = waiting.find((c) => c.record.clef === side) ?? waiting[0]
    blamed.record.wrongPresses.push(midi)
    return [{ type: 'wrong', customer: blamed }]
  }
}
