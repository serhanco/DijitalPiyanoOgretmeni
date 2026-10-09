// "Nota Kuşu": a Flappy Bird-like game on a staff. Pipes scroll in from the
// right with a gap at one staff position. Playing a note flies the bird to
// that note's height; the bird passes a pipe only at the gap's note.
// Pure logic: time is passed in, the renderer only reads the state.

import type { PromptRecord } from '../../noteHunter/session'
import type { SkillProvider } from '../skill'
import { staffStep } from '../staffGeometry'

export const BIRD_X = 0.25 // fraction of the width
const SPAWN_X = 1.1
/** Seconds a pipe needs to cross the screen, at the start and at the end. */
const CROSS_START_S = 6.5
const CROSS_END_S = 4.2
/** Seconds between pipes. */
const SPACING_START_S = 3.2
const SPACING_END_S = 2.2

export interface Pipe {
  index: number
  x: number
  step: number
  record: PromptRecord
  state: 'flying' | 'passed' | 'crashed'
}

export type BirdEvent = { type: 'pass' | 'crash'; pipe: Pipe } | { type: 'flap'; correct: boolean }

export class BirdGame {
  readonly records: PromptRecord[]
  pipes: Pipe[] = []
  birdStep: number
  /** Smoothly animated bird position, for drawing. */
  birdY: number
  hearts: number
  score = 0
  /** Key presses so far and whether the last one was right, for the bird's reactions. */
  flaps = 0
  lastFlapCorrect = true
  private spawned = 0
  private sinceSpawnS = Infinity
  private readonly skill: SkillProvider

  constructor(skill: SkillProvider, hearts = 3) {
    this.skill = skill
    this.hearts = hearts
    this.records = skill.targets.map((t) => ({ target: t.midi, shownAt: null, answeredAt: null, wrongPresses: [] }))
    const steps = skill.range.map((m) => staffStep(m, skill.clef))
    this.birdStep = Math.round((Math.min(...steps) + Math.max(...steps)) / 2)
    this.birdY = this.birdStep
  }

  get total(): number {
    return this.records.length
  }

  get failed(): boolean {
    return this.hearts <= 0
  }

  get done(): boolean {
    return this.failed || (this.spawned === this.total && this.pipes.every((p) => p.state !== 'flying'))
  }

  /** Progress through the game, 0..1. */
  get progress(): number {
    return this.pipes.filter((p) => p.state !== 'flying').length / this.total
  }

  /** The first pipe still flying towards the bird: what the player should play now. */
  get current(): Pipe | null {
    return this.pipes.find((p) => p.state === 'flying' && p.x > BIRD_X - 0.02) ?? null
  }

  /** Speed ramps up as the game goes on. */
  private lerp(start: number, end: number) {
    const t = this.total > 1 ? Math.min(1, this.spawned / (this.total - 1)) : 0
    return start + (end - start) * t
  }

  update(dtMs: number, now: number): BirdEvent[] {
    const events: BirdEvent[] = []
    if (this.done) return events
    const dt = dtMs / 1000

    this.sinceSpawnS += dt
    if (this.spawned < this.total && this.sinceSpawnS >= this.lerp(SPACING_START_S, SPACING_END_S)) {
      const record = this.records[this.spawned]
      this.pipes.push({
        index: this.spawned,
        x: SPAWN_X,
        step: staffStep(record.target, this.skill.clef),
        record,
        state: 'flying',
      })
      this.spawned++
      this.sinceSpawnS = 0
    }

    const speed = 1 / this.lerp(CROSS_START_S, CROSS_END_S)
    for (const p of this.pipes) {
      if (p.state !== 'flying') {
        p.x -= speed * dt
        continue
      }
      p.x -= speed * dt
      if (p.x <= BIRD_X) {
        if (this.birdStep === p.step) {
          p.state = 'passed'
          this.score++
          // The bird was already at the right height: that counts as played.
          p.record.answeredAt ??= now
          p.record.shownAt ??= now
        } else {
          p.state = 'crashed'
          p.record.missed = true
          this.hearts--
        }
        events.push({ type: p.state === 'passed' ? 'pass' : 'crash', pipe: p })
      }
    }
    this.pipes = this.pipes.filter((p) => p.x > -0.2)

    // The reaction clock starts when a pipe becomes the one to play.
    const cur = this.current
    if (cur && cur.record.shownAt === null) cur.record.shownAt = now

    // Ease the drawn bird towards its target step.
    this.birdY += (this.birdStep - this.birdY) * Math.min(1, dt * 14)
    return events
  }

  press(midi: number, now: number): BirdEvent[] {
    if (this.done) return []
    const cur = this.current
    let correct = false
    if (cur && this.skill.matches({ midi: cur.record.target }, midi)) {
      correct = true
      this.birdStep = cur.step
      if (cur.record.answeredAt === null) {
        cur.record.answeredAt = now
        if (cur.record.shownAt === null) cur.record.shownAt = now
      }
    } else {
      this.birdStep = staffStep(midi, this.skill.clef)
      if (cur && cur.record.answeredAt === null) cur.record.wrongPresses.push(midi)
    }
    this.flaps++
    this.lastFlapCorrect = correct
    return [{ type: 'flap', correct }]
  }

  /** Records of the pipes the player has met, for the report. */
  get attempted(): PromptRecord[] {
    // Only targets that were settled: played right, or got away.
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }
}
