// Pure game logic for "Nota Avcısı": show a note, the player presses a key.
// Kept free of React and timers so it can be unit tested.

import { pitchClass } from '../../music/notes'

export interface PromptRecord {
  target: number
  shownAt: number | null
  answeredAt: number | null
  /** Wrong keys pressed before the right one, in order. */
  wrongPresses: number[]
  /** Arcade games: the target got away (pipe hit, balloon escaped). Counts as not right on the first try. */
  missed?: boolean
}

/** Right on the first try: no wrong key and not missed. */
export const firstTryOk = (r: PromptRecord) => r.wrongPresses.length === 0 && !r.missed

export type PressResult = 'correct' | 'wrong' | 'ignored'

export interface SessionOptions {
  notes: number[]
  length: number
  ignoreOctave?: boolean
  /** Lives: the session fails after this many wrong presses. Unlimited when omitted. */
  hearts?: number
  random?: () => number
}

/** Random sequence that never shows the same note twice in a row. */
export function buildSequence(notes: number[], length: number, random: () => number = Math.random): number[] {
  if (notes.length === 0) throw new Error('A lesson needs at least one note')
  const seq: number[] = []
  // Cover every note once before repeating, shuffled in rounds.
  while (seq.length < length) {
    const round = [...notes]
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[round[i], round[j]] = [round[j], round[i]]
    }
    if (round.length > 1 && round[0] === seq[seq.length - 1]) {
      ;[round[0], round[1]] = [round[1], round[0]]
    }
    seq.push(...round)
  }
  return seq.slice(0, length)
}

export class NoteHunterSession {
  readonly records: PromptRecord[]
  private index = 0
  private readonly ignoreOctave: boolean
  private mistakes = 0
  readonly hearts: number | null

  constructor(opts: SessionOptions) {
    this.ignoreOctave = opts.ignoreOctave ?? false
    this.hearts = opts.hearts ?? null
    this.records = buildSequence(opts.notes, opts.length, opts.random).map((target) => ({
      target,
      shownAt: null,
      answeredAt: null,
      wrongPresses: [],
    }))
  }

  get done(): boolean {
    return this.failed || this.index >= this.records.length
  }

  /** True when the hearts ran out before the end. */
  get failed(): boolean {
    return this.hearts !== null && this.mistakes >= this.hearts
  }

  get heartsLeft(): number | null {
    return this.hearts === null ? null : Math.max(0, this.hearts - this.mistakes)
  }

  /** Prompts the player has seen so far: the basis of the report. */
  get attempted(): PromptRecord[] {
    return this.records.filter((r) => r.shownAt !== null)
  }

  get position(): number {
    return this.index
  }

  get current(): PromptRecord | null {
    return this.done ? null : this.records[this.index]
  }

  /** Mark when the current prompt became visible, for reaction time. */
  markShown(time: number): void {
    const cur = this.current
    if (cur && cur.shownAt === null) cur.shownAt = time
  }

  matches(target: number, pressed: number): boolean {
    return this.ignoreOctave ? pitchClass(target) === pitchClass(pressed) : target === pressed
  }

  press(midi: number, time: number): PressResult {
    const cur = this.current
    if (!cur || cur.shownAt === null) return 'ignored'
    if (this.matches(cur.target, midi)) {
      cur.answeredAt = time
      this.index++
      return 'correct'
    }
    cur.wrongPresses.push(midi)
    this.mistakes++
    return 'wrong'
  }
}
