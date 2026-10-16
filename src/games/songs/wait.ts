// Nota Şelalesi, learning mode: the notes fall at the song's tempo but stop at
// the keyboard until the right keys are down. A section played with mistakes
// falls once more before the song goes on. Pure: times are passed in.

import { pitchClass } from '../../music/notes'
import { type ParsedSong, sectionOf, type SongNote } from './song'

/** Notes that start together; both hands may be in one step. */
export interface WaitStep {
  beat: number
  notes: SongNote[]
  section: number
}

export interface WaitRecord {
  step: number
  section: number
  /** 0 the first time through the section, 1 on its repeat. */
  pass: number
  notes: SongNote[]
  /** Keys pressed that were not in the step. */
  wrong: number[]
  /** How long the step waited at the keyboard before its last key came (0 when played before it arrived). */
  waitMs: number
  /** First to last key of a step with several keys. */
  spreadMs: number | null
  /** Each note's press time, in step order (null until pressed). */
  pressedAt: (number | null)[]
}

export type WaitEvent =
  | { type: 'hit'; note: SongNote }
  | { type: 'wrong'; midi: number; step: WaitStep }
  | { type: 'step'; record: WaitRecord }
  | { type: 'repeat'; section: number; mistakes: number }
  | { type: 'done' }

export interface WaitOptions {
  bpm: number
  /** Time of beat 0; the first notes start falling before it. */
  startAt: number
  ignoreOctave?: boolean
  /** How many times a section played with mistakes falls again. */
  repeats?: number
}

/** Beats the song is rewound before a repeated section, so its notes fall in again. */
export const REPEAT_LEAD_BEATS = 2

export class WaitSession {
  readonly steps: WaitStep[]
  readonly records: WaitRecord[] = []
  readonly beatMs: number
  /** Repeats played per section. */
  readonly repeated: number[]
  /** The beat at the keyboard line. */
  position: number
  index = 0
  private pressed: (number | null)[] = []
  private wrong: number[] = []
  private arrivedAt: number | null = null
  private last: number
  private pass = 0
  private sectionMistakes = 0
  private readonly maxRepeats: number
  private readonly startAt: number
  private readonly ignoreOctave: boolean

  readonly song: ParsedSong

  constructor(song: ParsedSong, { bpm, startAt, ignoreOctave = false, repeats = 1 }: WaitOptions) {
    this.song = song
    this.beatMs = 60_000 / bpm
    this.ignoreOctave = ignoreOctave
    this.maxRepeats = repeats
    const byBeat = new Map<number, SongNote[]>()
    for (const x of song.notes) byBeat.set(x.beat, [...(byBeat.get(x.beat) ?? []), x])
    this.steps = [...byBeat.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([beat, notes]) => ({ beat, notes, section: sectionOf(song.sections, notes[0].bar) }))
    this.repeated = song.sections.map(() => 0)
    this.startAt = startAt
    this.last = startAt
    this.position = 0
    this.pressed = this.stepNotes().map(() => null)
  }

  get step(): WaitStep | null {
    return this.steps[this.index] ?? null
  }

  get done(): boolean {
    return this.index >= this.steps.length
  }

  get progress(): number {
    return this.steps.length ? this.index / this.steps.length : 1
  }

  /** True while the step at the line waits for keys. */
  get waiting(): boolean {
    return this.arrivedAt !== null
  }

  /** Keys of the current step still to press. */
  get pending(): number[] {
    return this.stepNotes()
      .filter((_, i) => this.pressed[i] === null)
      .map((x) => x.midi)
  }

  /** Keys of the current step already pressed. */
  get held(): number[] {
    return this.stepNotes()
      .filter((_, i) => this.pressed[i] !== null)
      .map((x) => x.midi)
  }

  private stepNotes(): SongNote[] {
    return this.step?.notes ?? []
  }

  private matches(note: SongNote, midi: number) {
    return this.ignoreOctave ? pitchClass(note.midi) === pitchClass(midi) : note.midi === midi
  }

  /**
   * The beat at the keyboard line at `now`: the clock runs until the next step
   * reaches it, then waits. Before `startAt` it is negative (the notes fall in).
   */
  update(now: number): WaitEvent[] {
    if (now < this.startAt) {
      this.position = (now - this.startAt) / this.beatMs
      this.last = now
      return []
    }
    const dt = Math.max(0, now - this.last)
    this.last = now
    const step = this.step
    if (!step) {
      this.position += dt / this.beatMs
      return []
    }
    const target = step.beat
    if (this.position < target) {
      const moved = this.position + dt / this.beatMs
      // The moment it arrived, even if the frame came later.
      if (moved >= target) this.arrivedAt = now - (moved - target) * this.beatMs
      this.position = Math.min(target, moved)
    } else if (this.arrivedAt === null) {
      this.arrivedAt = now
    }
    return []
  }

  press(midi: number, now: number): WaitEvent[] {
    const step = this.step
    if (!step) return []
    const notes = step.notes
    const i = notes.findIndex((x, k) => this.pressed[k] === null && this.matches(x, midi))
    if (i < 0) {
      // A key of this step pressed again is not a mistake.
      if (notes.some((x) => this.matches(x, midi))) return []
      this.wrong.push(midi)
      this.sectionMistakes++
      return [{ type: 'wrong', midi, step }]
    }
    this.pressed[i] = now
    const events: WaitEvent[] = [{ type: 'hit', note: notes[i] }]
    if (this.pressed.every((t) => t !== null)) events.push(...this.complete(now))
    return events
  }

  private complete(now: number): WaitEvent[] {
    const step = this.step!
    const times = this.pressed as number[]
    const record: WaitRecord = {
      step: this.index,
      section: step.section,
      pass: this.pass,
      notes: step.notes,
      wrong: this.wrong,
      waitMs: this.arrivedAt === null ? 0 : Math.max(0, now - this.arrivedAt),
      spreadMs: times.length > 1 ? Math.max(...times) - Math.min(...times) : null,
      pressedAt: [...times],
    }
    this.records.push(record)
    const events: WaitEvent[] = [{ type: 'step', record }]
    // Played before it reached the line: the song catches up.
    this.position = Math.max(this.position, step.beat)
    // The song goes on from this press, not from the last frame.
    this.last = Math.max(this.last, now)
    this.arrivedAt = null
    this.wrong = []
    const next = this.steps[this.index + 1]
    const sectionEnds = !next || next.section !== step.section
    if (sectionEnds && this.sectionMistakes > 0 && this.repeated[step.section] < this.maxRepeats) {
      events.push({ type: 'repeat', section: step.section, mistakes: this.sectionMistakes })
      this.repeated[step.section]++
      this.pass++
      this.index = this.steps.findIndex((s) => s.section === step.section)
      this.position = this.steps[this.index].beat - REPEAT_LEAD_BEATS
    } else {
      if (sectionEnds) this.pass = 0
      this.index++
    }
    if (sectionEnds) this.sectionMistakes = 0
    this.pressed = this.stepNotes().map(() => null)
    if (this.done) events.push({ type: 'done' })
    return events
  }
}
