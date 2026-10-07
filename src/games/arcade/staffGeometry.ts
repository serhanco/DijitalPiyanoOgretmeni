// Where notes sit on a staff, in "steps": one step is one line or space.
// Step 0 is the bottom staff line; step 8 is the top line.

import { type Clef, diatonicIndex, parseNote } from '../../music/notes'

const BOTTOM_LINE: Record<Clef, number> = {
  treble: diatonicIndex(parseNote('E4')),
  bass: diatonicIndex(parseNote('G2')),
}

/** Staff step of a note (black keys share their letter's step). */
export function staffStep(midi: number, clef: Clef): number {
  return diatonicIndex(midi) - BOTTOM_LINE[clef]
}

/** Steps of the ledger lines a note needs (even steps outside 0..8). */
export function ledgerSteps(step: number): number[] {
  const out: number[] = []
  for (let s = -2; s >= step; s -= 2) out.push(s)
  for (let s = 10; s <= step; s += 2) out.push(s)
  return out
}

export interface StaffLayout {
  /** Pixels between two staff lines. */
  gap: number
  /** y of step 0 (bottom line). */
  bottomY: number
}

/**
 * Fit the steps from `minStep` to `maxStep` (always including the staff
 * itself) into `height` pixels with `padSteps` of margin. The line gap is
 * capped at `maxGap` so tall, narrow screens do not get giant notes; the
 * staff is then centred vertically.
 */
export function fitStaff(
  height: number,
  minStep: number,
  maxStep: number,
  padSteps = 2,
  maxGap = Infinity,
): StaffLayout {
  const lo = Math.min(minStep, 0) - padSteps
  const hi = Math.max(maxStep, 8) + padSteps
  const gap = Math.min((height / (hi - lo)) * 2, maxGap)
  const used = ((hi - lo) * gap) / 2
  const top = (height - used) / 2
  return { gap, bottomY: top + used - (0 - lo) * (gap / 2) }
}

export function stepY(step: number, layout: StaffLayout): number {
  return layout.bottomY - step * (layout.gap / 2)
}
