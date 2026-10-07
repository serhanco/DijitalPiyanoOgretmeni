// "Melodi Hafızası": a Simon-like memory game with scale fragments. The app
// plays a short run of scale notes, the player repeats it; every round the
// run grows by one note. Pure: time is passed in, the screen plays the
// notes and lights the keys from the returned schedule.

import { pitchClass } from '../../music/notes'
import { firstTryOk, type PromptRecord } from '../noteHunter/session'
import type { CategoryStat } from '../noteHunter/summary'

export interface MemoryOptions {
  /** Notes the runs are made of, low to high (a scale). */
  pool: number[]
  startLength?: number
  maxLength?: number
  /** Wrong keys allowed. Unlimited when null. */
  hearts?: number | null
  ignoreOctave?: boolean
  random?: () => number
  /** Time from one played note to the next. */
  noteMs?: number
}

export type MemoryPhase = 'ready' | 'listen' | 'play' | 'done'

export interface PlaybackNote {
  midi: number
  /** Time to start the note. */
  at: number
  durationMs: number
}

export type MemoryEvent =
  | { type: 'play' }
  | { type: 'hit'; index: number }
  | { type: 'wrong'; midi: number; expected: number }
  | { type: 'round'; length: number }
  | { type: 'complete' }
  | { type: 'failed' }

/** Pause between "listen" and the first note. */
export const LEAD_MS = 400
/** Steps between neighbouring notes of a run: mostly scale steps, some skips, a few repeats. */
const MOVES = [-2, -1, -1, -1, 0, 1, 1, 1, 2]

export type MoveKind = 'step' | 'skip' | 'repeat'

export class MemoryGame {
  readonly pool: number[]
  readonly startLength: number
  readonly maxLength: number
  readonly hearts: number | null
  readonly noteMs: number
  /** Positions in `pool` of the run, which grows every round. */
  readonly positions: number[] = []
  /** One list of records per round played, one record per note of the run. */
  readonly rounds: PromptRecord[][] = []
  phase: MemoryPhase = 'ready'
  private input = 0
  private listenEndsAt = 0
  private mistakes = 0
  private readonly random: () => number
  private readonly ignoreOctave: boolean

  constructor({
    pool,
    startLength = 3,
    maxLength = 8,
    hearts = null,
    ignoreOctave = false,
    random = Math.random,
    noteMs = 650,
  }: MemoryOptions) {
    if (pool.length < 2) throw new Error('Melodi Hafızası needs at least two notes')
    this.pool = pool
    this.startLength = startLength
    this.maxLength = Math.max(startLength, maxLength)
    this.hearts = hearts
    this.noteMs = noteMs
    this.random = random
    this.ignoreOctave = ignoreOctave
    this.positions.push(Math.floor(random() * pool.length))
    while (this.positions.length < startLength) this.grow()
  }

  /** The notes of the current run. */
  get sequence(): number[] {
    return this.positions.map((p) => this.pool[p])
  }

  get length(): number {
    return this.positions.length
  }

  /** Notes of the current run already repeated. */
  get played(): number {
    return this.input
  }

  get failed(): boolean {
    return this.hearts !== null && this.mistakes >= this.hearts
  }

  get done(): boolean {
    return this.phase === 'done'
  }

  get heartsLeft(): number | null {
    return this.hearts === null ? null : Math.max(0, this.hearts - this.mistakes)
  }

  /** The next note to play, for hints and tests. */
  get expected(): number | null {
    return this.phase === 'play' ? this.pool[this.positions[this.input]] : null
  }

  /** Records of the notes the player was asked to repeat: the basis of the report. */
  get attempted(): PromptRecord[] {
    return this.rounds.flat().filter((r) => r.shownAt !== null)
  }

  /** Move kind leading to note `i` of the run (the first note of a run has none). */
  moveAt(i: number): MoveKind | null {
    if (i === 0) return null
    const d = Math.abs(this.positions[i] - this.positions[i - 1])
    return d === 0 ? 'repeat' : d === 1 ? 'step' : 'skip'
  }

  private grow() {
    const last = this.positions[this.positions.length - 1]
    let move = MOVES[Math.floor(this.random() * MOVES.length)]
    // Never three of the same note in a row.
    const prev = this.positions[this.positions.length - 2]
    if (move === 0 && prev === last) move = 1
    let next = last + move
    if (next < 0 || next >= this.pool.length) next = last - move
    this.positions.push(Math.max(0, Math.min(this.pool.length - 1, next)))
  }

  /** Play the current run to the player: the schedule of notes to sound and light up. */
  startRound(now: number): PlaybackNote[] {
    if (this.phase !== 'ready') return []
    this.phase = 'listen'
    this.input = 0
    this.rounds.push(
      this.positions.map((p) => ({ target: this.pool[p], shownAt: null, answeredAt: null, wrongPresses: [] })),
    )
    const start = now + LEAD_MS
    this.listenEndsAt = start + this.length * this.noteMs
    return this.sequence.map((midi, i) => ({ midi, at: start + i * this.noteMs, durationMs: this.noteMs * 0.8 }))
  }

  /** Hand over to the player once the run has been played. */
  update(now: number): MemoryEvent[] {
    if (this.phase !== 'listen' || now < this.listenEndsAt) return []
    this.phase = 'play'
    this.current().shownAt = now
    return [{ type: 'play' }]
  }

  private current(): PromptRecord {
    return this.rounds[this.rounds.length - 1][this.input]
  }

  private matches(target: number, pressed: number): boolean {
    return this.ignoreOctave ? pitchClass(target) === pitchClass(pressed) : target === pressed
  }

  press(midi: number, now: number): MemoryEvent[] {
    // Keys pressed while listening are the player humming along: no mistake.
    if (this.phase !== 'play') return []
    const record = this.current()
    if (!this.matches(record.target, midi)) {
      record.wrongPresses.push(midi)
      this.mistakes++
      if (this.failed) {
        this.phase = 'done'
        return [{ type: 'wrong', midi, expected: record.target }, { type: 'failed' }]
      }
      return [{ type: 'wrong', midi, expected: record.target }]
    }
    record.answeredAt = now
    const index = this.input++
    if (this.input < this.length) {
      this.current().shownAt = now
      return [{ type: 'hit', index }]
    }
    const length = this.length
    if (length >= this.maxLength) {
      this.phase = 'done'
      return [{ type: 'hit', index }, { type: 'round', length }, { type: 'complete' }]
    }
    this.grow()
    this.phase = 'ready'
    return [
      { type: 'hit', index },
      { type: 'round', length },
    ]
  }
}

export interface MemorySummary {
  /** Longest run repeated without a single wrong key (0 if none). */
  longestClean: number
  /** Longest run repeated to the end. */
  longest: number
  maxLength: number
}

const MOVE_LABELS: Record<MoveKind, string> = {
  step: 'Komşu notalar (adım)',
  skip: 'Atlamalı notalar',
  repeat: 'Tekrar eden notalar',
}

/** Topics of the report: by the move into each note and by the length of the run. */
export function memoryReport(game: MemoryGame): { perCategory: CategoryStat[]; memory: MemorySummary } {
  const groups = new Map<string, { label: string; shown: number; firstTry: number }>()
  const add = (id: string, label: string, r: PromptRecord) => {
    const g = groups.get(id) ?? { label, shown: 0, firstTry: 0 }
    g.shown++
    if (firstTryOk(r)) g.firstTry++
    groups.set(id, g)
  }
  let longest = 0
  let longestClean = 0
  for (const round of game.rounds) {
    const n = round.length
    round.forEach((r, i) => {
      if (r.shownAt === null) return
      const move = game.moveAt(i)
      add(move ?? 'first', move ? MOVE_LABELS[move] : 'Dizinin ilk notası', r)
      add(
        n <= 4 ? 'short' : n <= 6 ? 'mid' : 'long',
        n <= 4 ? 'Kısa diziler (3–4 nota)' : n <= 6 ? 'Orta diziler (5–6 nota)' : 'Uzun diziler (7+ nota)',
        r,
      )
    })
    if (round.every((r) => r.answeredAt !== null)) {
      longest = Math.max(longest, n)
      if (round.every(firstTryOk)) longestClean = Math.max(longestClean, n)
    }
  }
  const order = ['first', 'step', 'skip', 'repeat', 'short', 'mid', 'long']
  const perCategory = order
    .filter((id) => groups.has(id))
    .map((id) => {
      const g = groups.get(id)!
      return { id, label: g.label, shown: g.shown, firstTry: g.firstTry, accuracy: g.firstTry / g.shown }
    })
  return { perCategory, memory: { longest, longestClean, maxLength: game.maxLength } }
}
