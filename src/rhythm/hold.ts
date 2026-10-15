// How long a note was held: a half note pressed and let go at once is not a
// half note. The release is compared with the note's written length, and a
// note held on into the rest that follows it is held too long.

import { isRest, type RhythmValue, VALUE_BEATS } from './rhythm'

/** Held for this share of its length (or more) counts as held in full: fingers lift a little early to play the next note. */
export const HOLD_FULL = 0.75
/** A note may run this share of the following rest before it counts as held too long. */
export const REST_GRACE = 0.25
/** Share of a note's score that depends on the hold; the rest is timing. */
export const HOLD_WEIGHT = 0.5
/** A hold scoring at least this is good enough (not reported as short or long). */
export const HOLD_OK = 0.9

export type HoldVerdict = 'ok' | 'short' | 'long'

/** Eighths are too short to judge how long they were held. */
export const judgesHold = (value: RhythmValue) => !isRest(value) && value !== 'e'

/**
 * Score of a hold, 0..1. `share` is the release time after the note's start, as a share of its length;
 * `restBeats` is the length of the rest right after the note (0 when none).
 */
export function holdScore(share: number, value: RhythmValue, restBeats = 0): number {
  if (share < 1 || restBeats === 0) return Math.max(0, Math.min(1, share / HOLD_FULL))
  // Into the rest: how much of it was not silent, past the grace.
  const into = ((share - 1) * VALUE_BEATS[value]) / restBeats
  return Math.max(0, Math.min(1, 1 - (into - REST_GRACE) / (1 - REST_GRACE)))
}

export function holdVerdict(share: number, score: number): HoldVerdict {
  if (score >= HOLD_OK) return 'ok'
  return share < 1 ? 'short' : 'long'
}

/** How long each value lasts, for the messages. */
export const VALUE_LENGTH: Partial<Record<RhythmValue, string>> = {
  w: 'Birlik dört vuruş',
  q: 'Dörtlük bir vuruş',
  h: 'İkilik iki vuruş',
  qd: 'Noktalı dörtlük bir buçuk vuruş',
  hd: 'Noktalı ikilik üç vuruş',
}

export interface HoldSummary {
  /** Notes whose hold was judged. */
  judged: number
  ok: number
  short: number
  long: number
  /** Mean hold score, 0..1. */
  mean: number
  /** Mean share of their length the notes let go too soon were held. */
  shortShare: number | null
  /** The value most often let go too soon. */
  shortest: RhythmValue | null
}
