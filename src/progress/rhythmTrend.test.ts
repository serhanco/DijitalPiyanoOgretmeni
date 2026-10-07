import { describe, expect, it } from 'vitest'
import type { SessionRow } from './db'
import { rhythmTrend } from './rhythmTrend'

const row = (at: number, perfect: number, miss: number, meanOffsetMs: number | null = 10): SessionRow => ({
  lessonId: 'rhythm-1',
  at,
  total: perfect + miss,
  firstTry: perfect,
  accuracy: 0,
  avgReactionMs: null,
  stars: 1,
  xp: 10,
  failed: false,
  timing: { counts: { perfect, good: 0, early: 0, late: 0, miss }, meanOffsetMs, bpm: 70 },
})

describe('rhythmTrend', () => {
  it('keeps rhythm sessions only, oldest first, with the on-beat share', () => {
    const drill = { ...row(5, 1, 0), timing: undefined }
    const { points, change } = rhythmTrend([row(3, 3, 1), drill, row(1, 1, 1)])
    expect(points.map((p) => p.at)).toEqual([1, 3])
    expect(points.map((p) => p.onBeat)).toEqual([0.5, 0.75])
    expect(change).toBeNull()
  })

  it('compares the later sessions with the earlier ones', () => {
    const { change } = rhythmTrend([row(1, 1, 1), row(2, 1, 1), row(3, 4, 0), row(4, 4, 0)])
    expect(change).toBeCloseTo(0.5)
  })
})
