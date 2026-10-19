// Hayalet: the best run of a game races the learner, as a faint copy of it.
// A run is kept as its score along the way: second by second in the endless
// games (the score is points), note by note in the beat games (the score is
// the timing so far, in percent of the whole round). Pure.

import { scoreOf } from '../rhythm/summary'
import type { TimingRecord } from '../rhythm/track'

export interface Ghost {
  /** What a point stands for: a second of play or a note of the round. */
  by: 'second' | 'note'
  /** The score after each second or note. */
  points: number[]
  /** The run's final score. */
  score: number
}

/** The endless games keep a point a second. */
export const GHOST_STEP_MS = 1000
/** Longer runs keep their first ten minutes. */
export const GHOST_MAX_POINTS = 600

/** The ghost's score after `i` seconds or notes (0 before it started, its final score after it ended). */
export function ghostAt(ghost: Ghost, i: number): number {
  if (i <= 0 || !ghost.points.length) return 0
  return ghost.points[Math.min(i, ghost.points.length) - 1]
}

/** A finished run replaces the ghost only when it scored more. */
export const beatsGhost = (prev: Ghost | undefined, next: Ghost): boolean =>
  next.points.length > 0 && next.score > 0 && (!prev || next.score > prev.score)

/**
 * A beat round note by note: after each settled note (in the order they were due),
 * the timing so far as a share of the whole round, in percent.
 */
export function beatPoints(records: TimingRecord[]): number[] {
  const played = records.filter((r) => !r.demo).sort((a, b) => a.dueAt - b.dueAt)
  if (!played.length) return []
  const points: number[] = []
  let sum = 0
  for (const r of played) {
    if (r.judgement === null) break
    sum += scoreOf(r)
    points.push(Math.round((sum * 100) / played.length))
  }
  return points
}

/** The run of a beat game (a tempo ladder's rounds one after another). */
export function beatGhost(rounds: TimingRecord[][]): Ghost {
  let offset = 0
  const points: number[] = []
  const total = rounds.reduce((n, r) => n + r.filter((t) => !t.demo).length, 0)
  for (const records of rounds) {
    const played = records.filter((r) => !r.demo).length
    // Each round's percent is scaled to its share of all rounds.
    for (const p of beatPoints(records)) points.push(Math.round(offset + (p * played) / Math.max(1, total)))
    offset += (100 * played) / Math.max(1, total)
  }
  return { by: 'note', points: points.slice(0, GHOST_MAX_POINTS), score: points.at(-1) ?? 0 }
}

/** Ahead (> 0), level (0) or behind (< 0) the ghost. */
export const lead = (ghost: Ghost, i: number, mine: number): number => mine - ghostAt(ghost, i)
