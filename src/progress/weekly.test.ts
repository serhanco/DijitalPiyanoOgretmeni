import { describe, expect, it } from 'vitest'
import type { SessionRow } from './db'
import { previousWeekStart, weekStart, weekSummary } from './weekly'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const row = (lessonId: string, when: number, accuracy: number, xp = 10, failed = false): SessionRow => ({
  lessonId,
  at: when,
  total: 10,
  firstTry: Math.round(accuracy * 10),
  accuracy,
  avgReactionMs: null,
  stars: 2,
  xp,
  failed,
})

describe('weekly summary', () => {
  it('starts weeks on Monday', () => {
    // 2026-10-17 is a Saturday.
    expect(weekStart(new Date(2026, 9, 17, 20)).getTime()).toBe(at(2026, 10, 12, 0))
    expect(weekStart(new Date(2026, 9, 12, 0, 5)).getTime()).toBe(at(2026, 10, 12, 0))
    expect(weekStart(new Date(2026, 9, 18)).getTime()).toBe(at(2026, 10, 12, 0))
    expect(previousWeekStart(new Date(2026, 9, 17)).getTime()).toBe(at(2026, 10, 5, 0))
  })

  it('sums up a week against the one before, with the most improved lesson', () => {
    const sessions = [
      row('a', at(2026, 10, 1), 0.5), // two weeks ago: counts for "earlier best" only
      row('a', at(2026, 10, 6), 0.6, 20),
      row('b', at(2026, 10, 7), 0.9, 20),
      row('a', at(2026, 10, 12), 0.95, 30),
      row('b', at(2026, 10, 13), 0.95, 30),
      row('a', at(2026, 10, 13, 18), 0.4, 5, true),
      row('c', at(2026, 10, 14), 1, 15),
    ]
    const cards = [{ box: 4 }, { box: 5 }, { box: 1 }] as never
    const s = weekSummary(sessions, cards, new Date(2026, 9, 14))
    expect(s.from).toBe('2026-10-12')
    expect(s.week).toEqual({ lessons: 4, xp: 80, days: 3, accuracy: (0.95 + 0.95 + 0.4 + 1) / 4 })
    expect(s.before).toEqual({ lessons: 2, xp: 40, days: 2, accuracy: 0.75 })
    expect(s.change).toBeCloseTo((0.95 + 0.95 + 0.4 + 1) / 4 - 0.75)
    // a: 0.6 → 0.95 beats b: 0.9 → 0.95; c is new, so it did not "improve".
    expect(s.improved).toEqual({ lessonId: 'a', from: 0.6, to: 0.95 })
    expect(s.mastered).toBe(2)
    expect(s.cards).toBe(3)
  })

  it('has no change without a week before', () => {
    const s = weekSummary([row('a', at(2026, 10, 13), 0.8)], [], new Date(2026, 9, 13))
    expect(s.change).toBeNull()
    expect(s.improved).toBeNull()
  })
})
