// Pure logic for melody lessons: the player reads a written melody and plays
// it step by step. A step may ask for two keys at once (one per hand).
// No React and no timers: time is passed in, like every other engine.

import { type Clef, handOf, type Hand, type Letter, MIDDLE_C, naturalClef, parseNote } from '../../music/notes'
import type { Accidental, Crossing, SpelledNote } from '../../music/scales'
import type { PromptRecord } from '../noteHunter/session'
import type { SyncSummary } from '../noteHunter/summary'
import type { Melody } from '../noteHunter/lessons'

/** Two presses this close count as "together". */
export const TOGETHER_MS = 100

export interface StepNote {
  midi: number
  clef: Clef
  /** Scales: the written name (B♭ rather than A#). */
  spelled?: SpelledNote
  /** Scales: the finger to play it with (1 = thumb). */
  finger?: number
  /** Scales: the thumb crossing that leads to this note. */
  cross?: Crossing | null
}

export interface Step {
  notes: StepNote[]
  /** Index of the melody (or scale) the step belongs to. */
  melody: number
  /** Scales: the VexFlow key signature ("Bb", "Am"). */
  keySig?: string
  /** Scales: the accidental the key signature gives each letter. */
  keyAcc?: Record<Letter, Accidental>
}

/**
 * Parse a melody string ("E3 D3 C3+E4 C4L"). With `clef` every note goes on
 * that staff (single-staff lessons); otherwise on its grand-staff staff.
 */
export function parseMelody(text: string, clef?: Clef, melody = 0): Step[] {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => ({
      melody,
      notes: token.split('+').map((part) => {
        const m = /^(.+?)([LR])?$/.exec(part)!
        const midi = parseNote(m[1])
        const forced: Clef | undefined = m[2] === 'L' ? 'bass' : m[2] === 'R' ? 'treble' : undefined
        return { midi, clef: clef ?? forced ?? naturalClef(midi) }
      }),
    }))
}

export function parseMelodies(melodies: Melody[], clef?: Clef): Step[] {
  return melodies.flatMap((m, i) => parseMelody(m.notes, clef, i))
}

export type MelodyPressResult =
  /** One key of a two-key step; the step waits for the other hand. */
  | 'partial'
  /** The step is complete. */
  | 'step'
  | 'wrong'
  | 'ignored'

export interface MelodyOptions {
  steps: Step[]
  hearts?: number
  ignoreOctave?: boolean
}

export class MelodySession {
  readonly steps: Step[]
  /** One record per note of each step, in step order. */
  readonly stepRecords: PromptRecord[][]
  readonly hearts: number | null
  private index = 0
  private mistakes = 0
  private readonly ignoreOctave: boolean

  constructor({ steps, hearts, ignoreOctave = false }: MelodyOptions) {
    if (steps.length === 0) throw new Error('A melody needs at least one step')
    this.steps = steps
    this.hearts = hearts ?? null
    this.ignoreOctave = ignoreOctave
    this.stepRecords = steps.map((s) =>
      s.notes.map((n) => ({ target: n.midi, clef: n.clef, shownAt: null, answeredAt: null, wrongPresses: [] })),
    )
  }

  get records(): PromptRecord[] {
    return this.stepRecords.flat()
  }

  get position(): number {
    return this.index
  }

  get failed(): boolean {
    return this.hearts !== null && this.mistakes >= this.hearts
  }

  get done(): boolean {
    return this.failed || this.index >= this.steps.length
  }

  get heartsLeft(): number | null {
    return this.hearts === null ? null : Math.max(0, this.hearts - this.mistakes)
  }

  /** Records of the steps the player has seen: the basis of the report. */
  get attempted(): PromptRecord[] {
    return this.records.filter((r) => r.shownAt !== null)
  }

  /** Keys of the current step still to be played. */
  get pending(): number[] {
    if (this.done) return []
    return this.stepRecords[this.index].filter((r) => r.answeredAt === null).map((r) => r.target)
  }

  markShown(time: number): void {
    if (this.done) return
    for (const r of this.stepRecords[this.index]) if (r.shownAt === null) r.shownAt = time
  }

  private matches(target: number, pressed: number): boolean {
    return this.ignoreOctave ? (target - pressed) % 12 === 0 : target === pressed
  }

  press(midi: number, time: number): MelodyPressResult {
    if (this.done) return 'ignored'
    const records = this.stepRecords[this.index]
    if (records[0].shownAt === null) return 'ignored'
    const open = records.filter((r) => r.answeredAt === null)
    const hit = open.find((r) => this.matches(r.target, midi))
    if (hit) {
      hit.answeredAt = time
      if (open.length > 1) return 'partial'
      this.index++
      return 'step'
    }
    // A key of this step played again (e.g. while waiting for the other hand) is no mistake.
    if (records.some((r) => this.matches(r.target, midi))) return 'ignored'
    // Blame the hand that pressed: the open note on its side of middle C, the nearest one.
    const hand: Hand = midi >= MIDDLE_C ? 'right' : 'left'
    const blamed =
      [...open].sort(
        (a, b) =>
          Number(handOf(b.clef!) === hand) - Number(handOf(a.clef!) === hand) ||
          Math.abs(a.target - midi) - Math.abs(b.target - midi),
      )[0] ?? open[0]
    blamed.wrongPresses.push(midi)
    this.mistakes++
    return 'wrong'
  }
}

/** How close together the two hands played the steps that ask for both. */
export function syncSummary(stepRecords: PromptRecord[][]): SyncSummary | undefined {
  const gaps: number[] = []
  const leads: number[] = []
  for (const rs of stepRecords) {
    const left = rs.find((r) => r.clef === 'bass' && r.answeredAt !== null)
    const right = rs.find((r) => r.clef === 'treble' && r.answeredAt !== null)
    if (!left || !right) continue
    const lead = left.answeredAt! - right.answeredAt!
    leads.push(lead)
    gaps.push(Math.abs(lead))
  }
  if (!gaps.length) return undefined
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  return {
    pairs: gaps.length,
    together: gaps.filter((g) => g <= TOGETHER_MS).length,
    meanGapMs: mean(gaps),
    meanLeadMs: mean(leads),
  }
}
