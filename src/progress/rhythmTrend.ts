// The rhythm progress shown on the profile: how many notes were on the beat
// (Mükemmel or İyi) in each rhythm session, and how the mean offset moved.

import type { SessionRow } from './db'

export interface RhythmPoint {
  at: number
  lessonId: string
  /** Share of played notes judged Mükemmel or İyi, 0..1. */
  onBeat: number
  meanOffsetMs: number | null
  bpm: number
}

export interface RhythmTrend {
  points: RhythmPoint[]
  /** Change in the on-beat share, last half of the points vs the first half; null with fewer than 4. */
  change: number | null
}

export function rhythmTrend(sessions: SessionRow[]): RhythmTrend {
  const points = sessions
    .filter((s) => s.timing)
    .sort((a, b) => a.at - b.at)
    .map((s) => {
      const c = s.timing!.counts
      const notes = ['perfect', 'good', 'early', 'late', 'miss'].reduce((n, j) => n + (c[j] ?? 0), 0)
      return {
        at: s.at,
        lessonId: s.lessonId,
        onBeat: notes ? ((c.perfect ?? 0) + (c.good ?? 0)) / notes : 0,
        meanOffsetMs: s.timing!.meanOffsetMs,
        bpm: s.timing!.bpm,
      }
    })
  let change: number | null = null
  if (points.length >= 4) {
    const half = Math.floor(points.length / 2)
    const mean = (ps: RhythmPoint[]) => ps.reduce((n, p) => n + p.onBeat, 0) / ps.length
    change = mean(points.slice(-half)) - mean(points.slice(0, half))
  }
  return { points, change }
}
