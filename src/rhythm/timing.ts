// Timing judgement: how far a press was from the beat it was meant for.

export type Judgement = 'perfect' | 'good' | 'early' | 'late' | 'miss'

export const PERFECT_MS = 40
export const GOOD_MS = 90
/** A press further than this from every note does not count for any note. */
export const MAX_WINDOW_MS = 220

export const JUDGEMENT_LABELS: Record<Judgement, string> = {
  perfect: 'Mükemmel',
  good: 'İyi',
  early: 'Erken',
  late: 'Geç',
  miss: 'Kaçırıldı',
}

export const JUDGEMENTS: Judgement[] = ['perfect', 'good', 'early', 'late', 'miss']

/** Score of each judgement, 0..1. Early or late presses still earn a little. */
export const JUDGEMENT_SCORE: Record<Judgement, number> = { perfect: 1, good: 0.85, early: 0.4, late: 0.4, miss: 0 }

/** Judge a press `offsetMs` after the beat (negative = before). Assumes it is inside the note's window. */
export function judge(offsetMs: number): Judgement {
  const a = Math.abs(offsetMs)
  if (a <= PERFECT_MS) return 'perfect'
  if (a <= GOOD_MS) return 'good'
  return offsetMs < 0 ? 'early' : 'late'
}

export const onTime = (j: Judgement | null) => j === 'perfect' || j === 'good'

export const beatMs = (bpm: number) => 60_000 / bpm

export const MIN_BPM = 40
export const MAX_BPM = 160

export const clampBpm = (bpm: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))

/** "23 ms geç", "15 ms erken", "tam zamanında". */
export function describeOffset(ms: number): string {
  const r = Math.round(ms)
  if (Math.abs(r) < 5) return 'tam zamanında'
  return r < 0 ? `${-r} ms erken` : `${r} ms geç`
}
