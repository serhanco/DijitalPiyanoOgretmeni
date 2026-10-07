// "Balon Patlatma": balloons carrying a note float up; play the note to pop
// them before they fly away. Pure logic: time is passed in.

import type { PromptRecord } from '../../noteHunter/session'
import type { SkillProvider } from '../skill'

export const LANES = 4
/** Seconds a balloon needs to rise through the screen, at the start and at the end. */
const RISE_START_S = 9
const RISE_END_S = 6
/** Seconds between balloons. */
const SPAWN_START_S = 2.4
const SPAWN_END_S = 1.4
/** Never more balloons than this at once. */
const MAX_AIRBORNE = 4
const START_Y = 1.15 // below the bottom edge (y grows downwards, 0 = top)
const ESCAPE_Y = -0.15

export interface Balloon {
  index: number
  lane: number
  y: number
  color: number
  record: PromptRecord
  state: 'flying' | 'popped' | 'escaped'
  /** Seconds since popping, for the burst animation. */
  poppedFor: number
}

export type BalloonEvent = { type: 'pop' | 'escape' | 'wrong'; balloon: Balloon }

const COLORS = [0xff4b4b, 0x1cb0f6, 0xffc800, 0x58cc02, 0xce82ff, 0xff9600]

export class BalloonGame {
  readonly records: PromptRecord[]
  balloons: Balloon[] = []
  hearts: number
  score = 0
  private spawned = 0
  private sinceSpawnS = Infinity
  private lastLanes: number[] = []
  private readonly skill: SkillProvider
  private readonly random: () => number

  constructor(skill: SkillProvider, hearts = 3, random: () => number = Math.random) {
    this.skill = skill
    this.hearts = hearts
    this.random = random
    this.records = skill.targets.map((t) => ({ target: t.midi, shownAt: null, answeredAt: null, wrongPresses: [] }))
  }

  get total(): number {
    return this.records.length
  }

  get failed(): boolean {
    return this.hearts <= 0
  }

  get done(): boolean {
    return this.failed || (this.spawned === this.total && this.balloons.every((b) => b.state !== 'flying'))
  }

  get progress(): number {
    return this.records.filter((r) => r.answeredAt !== null || r.missed).length / this.total
  }

  get flying(): Balloon[] {
    return this.balloons.filter((b) => b.state === 'flying')
  }

  private lerp(start: number, end: number) {
    const t = this.total > 1 ? Math.min(1, this.spawned / (this.total - 1)) : 0
    return start + (end - start) * t
  }

  private pickLane(): number {
    const free = [...Array(LANES).keys()].filter((l) => !this.lastLanes.includes(l))
    const lane = free[Math.floor(this.random() * free.length)]
    this.lastLanes = [lane, ...this.lastLanes].slice(0, 2)
    return lane
  }

  update(dtMs: number, now: number): BalloonEvent[] {
    const events: BalloonEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000

    this.sinceSpawnS += dt
    if (
      this.spawned < this.total &&
      this.flying.length < MAX_AIRBORNE &&
      this.sinceSpawnS >= this.lerp(SPAWN_START_S, SPAWN_END_S)
    ) {
      const record = this.records[this.spawned]
      record.shownAt = now
      this.balloons.push({
        index: this.spawned,
        lane: this.pickLane(),
        y: START_Y,
        color: COLORS[this.spawned % COLORS.length],
        record,
        state: 'flying',
        poppedFor: 0,
      })
      this.spawned++
      this.sinceSpawnS = 0
    }

    const speed = (START_Y - ESCAPE_Y) / this.lerp(RISE_START_S, RISE_END_S)
    for (const b of this.balloons) {
      if (b.state === 'popped') {
        b.poppedFor += dt
        continue
      }
      if (b.state !== 'flying') continue
      b.y -= speed * dt
      if (b.y <= ESCAPE_Y) {
        b.state = 'escaped'
        b.record.missed = true
        this.hearts--
        events.push({ type: 'escape', balloon: b })
      }
    }
    this.balloons = this.balloons.filter((b) => b.state === 'flying' || (b.state === 'popped' && b.poppedFor < 0.4))
    return events
  }

  press(midi: number, now: number): BalloonEvent[] {
    if (this.done) return []
    // The highest balloon is the most urgent one.
    const flying = this.flying.sort((a, b) => a.y - b.y)
    if (!flying.length) return []
    const hit = flying.find((b) => this.skill.matches({ midi: b.record.target }, midi))
    if (hit) {
      hit.state = 'popped'
      hit.record.answeredAt = now
      this.score++
      return [{ type: 'pop', balloon: hit }]
    }
    flying[0].record.wrongPresses.push(midi)
    return [{ type: 'wrong', balloon: flying[0] }]
  }

  get attempted(): PromptRecord[] {
    // Only targets that were settled: played right, or got away.
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }
}
