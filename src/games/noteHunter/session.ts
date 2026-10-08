// Pure game logic for "Nota Avcısı": show a note, the player presses a key.
// Kept free of React and timers so it can be unit tested.

import { type Clef, naturalClef, pitchClass } from '../../music/notes'

export interface PromptRecord {
  target: number
  shownAt: number | null
  answeredAt: number | null
  /** Wrong keys pressed before the right one, in order. */
  wrongPresses: number[]
  /** Arcade games: the target got away (pipe hit, balloon escaped). Counts as not right on the first try. */
  missed?: boolean
  /** Grand-staff lessons: the staff the note was shown on (otherwise the lesson's clef). */
  clef?: Clef
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
  /** Notes asked twice as often as the others. */
  focus?: number[]
  /** Grand-staff lessons: pick the staff each prompt is shown on. */
  clefOf?: (midi: number) => Clef
}

/**
 * Random sequence that never shows the same note twice in a row. Notes in
 * `focus` come twice in every round.
 */
export function buildSequence(
  notes: number[],
  length: number,
  random: () => number = Math.random,
  focus: number[] = [],
): number[] {
  if (notes.length === 0) throw new Error('A lesson needs at least one note')
  const pool = [...notes, ...focus.filter((f) => notes.includes(f))]
  const seq: number[] = []
  // Cover every note once before repeating, shuffled in rounds. A round with a
  // note twice in a row (focus notes, or across rounds) is reshuffled.
  const shuffled = () => {
    const round = [...pool]
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[round[i], round[j]] = [round[j], round[i]]
    }
    return round
  }
  const repeats = (round: number[]) => round.some((x, i) => x === (i === 0 ? seq[seq.length - 1] : round[i - 1]))
  while (seq.length < length) {
    let round = shuffled()
    for (let tries = 0; tries < 100 && repeats(round); tries++) round = shuffled()
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
    this.records = buildSequence(opts.notes, opts.length, opts.random, opts.focus).map((target) => ({
      target,
      shownAt: null,
      answeredAt: null,
      wrongPresses: [],
      ...(opts.clefOf && { clef: opts.clefOf(target) }),
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

/**
 * Staff picker for grand-staff lessons: notes in `both` (around middle C)
 * go to either staff at random, every other note to its natural staff.
 */
export function grandClefPicker(both: number[] = [], random: () => number = Math.random): (midi: number) => Clef {
  return (midi) => (both.includes(midi) ? (random() < 0.5 ? 'treble' : 'bass') : naturalClef(midi))
}
