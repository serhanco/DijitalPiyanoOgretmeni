import { describe, expect, it } from 'vitest'
import {
  currentStreak,
  dayKey,
  extendStreak,
  type LessonOutcome,
  levelFromXp,
  newlyEarnedBadges,
  sumXp,
  xpFor,
} from './gamification'

const outcome = (o: Partial<LessonOutcome> = {}): LessonOutcome => ({
  lessonId: 'treble-1',
  total: 10,
  firstTry: 10,
  accuracy: 1,
  avgReactionMs: 900,
  stars: 3,
  failed: false,
  ...o,
})

describe('xpFor', () => {
  it('rewards correct notes, completion, perfection and speed', () => {
    const lines = xpFor(outcome())
    expect(lines.map((l) => l.label)).toEqual([
      'İlk denemede doğru notalar',
      'Ders tamamlandı',
      'Hatasız ders',
      'Hız bonusu',
    ])
    expect(sumXp(lines)).toBe(20 + 10 + 10 + 5)
  })

  it('gives only per-note XP when the hearts ran out', () => {
    expect(sumXp(xpFor(outcome({ failed: true, firstTry: 3, accuracy: 0.3 })))).toBe(6)
  })

  it('skips the speed bonus for slow answers', () => {
    expect(xpFor(outcome({ avgReactionMs: 2500 })).map((l) => l.label)).not.toContain('Hız bonusu')
  })

  it('names the per-note XP after timing in rhythm lessons', () => {
    expect(xpFor(outcome({ rhythm: true }))[0].label).toBe('Vuruşunda çalınan notalar')
  })
})

describe('levelFromXp', () => {
  it('starts at level 1 and grows', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, intoLevel: 0, needed: 50 })
    expect(levelFromXp(49).level).toBe(1)
    expect(levelFromXp(50)).toEqual({ level: 2, intoLevel: 0, needed: 75 })
    expect(levelFromXp(125).level).toBe(3)
  })
})

describe('streak', () => {
  const empty = { count: 0, best: 0, lastDay: null }

  it('counts consecutive days and resets after a gap', () => {
    let s = extendStreak(empty, '2026-10-07')
    expect(s.count).toBe(1)
    s = extendStreak(s, '2026-10-07')
    expect(s.count).toBe(1)
    s = extendStreak(s, '2026-10-08')
    expect(s.count).toBe(2)
    s = extendStreak(s, '2026-10-10')
    expect(s).toEqual({ count: 1, best: 2, lastDay: '2026-10-10' })
  })

  it('works across month and year ends', () => {
    expect(extendStreak({ count: 4, best: 4, lastDay: '2026-12-31' }, '2027-01-01').count).toBe(5)
  })

  it('shows 0 once a day was missed', () => {
    const s = { count: 5, best: 5, lastDay: '2026-10-07' }
    expect(currentStreak(s, '2026-10-08')).toBe(5)
    expect(currentStreak(s, '2026-10-09')).toBe(0)
  })

  it('uses the local calendar day', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('badges', () => {
  const ctx = {
    totalXp: 120,
    streak: 3,
    lessonsCompleted: 1,
    outcome: outcome(),
    threeStarLessons: ['a'],
    allTrebleLessonIds: ['a', 'b'],
  }

  it('awards new badges only once', () => {
    const ids = newlyEarnedBadges(ctx, []).map((b) => b.id)
    expect(ids).toEqual(expect.arrayContaining(['first-lesson', 'perfect', 'speedy', 'streak-3', 'xp-100']))
    expect(ids).not.toContain('treble-master')
    expect(newlyEarnedBadges(ctx, ids)).toEqual([])
  })

  it('awards the treble master badge when every lesson has 3 stars', () => {
    const ids = newlyEarnedBadges({ ...ctx, threeStarLessons: ['a', 'b'] }, []).map((b) => b.id)
    expect(ids).toContain('treble-master')
  })
})
