// Adaptive difficulty. The arcade note games (Nota Kuşu, Balon, Nota Barmeni, Nota Treni, Kayıp Kuş Sesi)
// keep a pace per lesson that rises after a very good game and falls after a
// lost or hard one; rhythm lessons move their remembered tempo the same way.
// Pure.

import { BEAT_KINDS, type LessonKind } from '../games/noteHunter/lessons'

export const PACE_KINDS: LessonKind[] = ['bird', 'balloon', 'bar', 'train', 'chirp']
export const PACE_MIN = 0.8
export const PACE_MAX = 1.3
export const PACE_STEP = 0.1
/** A game at least this good (and not lost) speeds the lesson up. */
export const SPEED_UP_AT = 0.95
/** A game below this (or lost) slows it down. */
export const SLOW_DOWN_BELOW = 0.6

export const TEMPO_STEP = 4
/** The tempo stays within these of the lesson's suggested one. */
export const TEMPO_UP_MAX = 30
export const TEMPO_DOWN_MAX = 20
export const TEMPO_FLOOR = 40

export interface PlayResult {
  accuracy: number
  stars: number
  failed: boolean
}

const round1 = (x: number) => Math.round(x * 10) / 10

/** The lesson's pace after a game. */
export function nextPace(pace: number, r: PlayResult): number {
  if (r.failed || r.accuracy < SLOW_DOWN_BELOW) return Math.max(PACE_MIN, round1(pace - PACE_STEP))
  if (r.accuracy >= SPEED_UP_AT) return Math.min(PACE_MAX, round1(pace + PACE_STEP))
  return pace
}

/** "×1,1". */
export const paceText = (pace: number) => `×${pace.toFixed(1).replace('.', ',')}`

/**
 * The tempo to suggest next time, from the tempo just played: a little
 * faster after three stars, a little slower when the hearts ran out, within
 * bounds of the lesson's own tempo. Null: leave it as it is. Tempo ladders
 * raise their own tempo and are left alone.
 */
export function nextTempo(base: number, played: number, r: PlayResult): number | null {
  const top = base + TEMPO_UP_MAX
  const bottom = Math.max(TEMPO_FLOOR, base - TEMPO_DOWN_MAX)
  if (r.failed) {
    const next = Math.max(bottom, played - TEMPO_STEP)
    return next < played ? next : null
  }
  if (r.stars >= 3) {
    const next = Math.min(top, played + TEMPO_STEP)
    return next > played ? next : null
  }
  return null
}

/** Lessons whose tempo adapts: played on the metronome, without a tempo ladder. */
export function adaptsTempo(kind: LessonKind | undefined, hasLadder: boolean): boolean {
  return BEAT_KINDS.includes(kind ?? 'drill') && !hasLadder
}
