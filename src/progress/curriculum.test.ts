import { describe, expect, it } from 'vitest'
import { ALL_LESSONS, buildReviewLesson, isUnlocked, weakestNotes } from './curriculum'

describe('isUnlocked', () => {
  it('opens the first lesson and each next one after a star', () => {
    const [first, second, third] = ALL_LESSONS
    const stars: Record<string, number> = { [first.id]: 1 }
    const best = (id: string) => stars[id] ?? 0
    expect(isUnlocked(first.id, best)).toBe(true)
    expect(isUnlocked(second.id, best)).toBe(true)
    expect(isUnlocked(third.id, best)).toBe(false)
    expect(isUnlocked('nope', best)).toBe(false)
  })
})

describe('weakestNotes', () => {
  it('ranks by smoothed first-try accuracy', () => {
    const stats = [
      { midi: 60, shown: 20, firstTry: 20 },
      { midi: 62, shown: 10, firstTry: 4 },
      { midi: 64, shown: 1, firstTry: 0 }, // one miss: (0+1)/(1+2) = 0.33
      { midi: 65, shown: 10, firstTry: 8 },
      { midi: 67, shown: 0, firstTry: 0 },
    ]
    expect(weakestNotes(stats, 3)).toEqual([64, 62, 65])
  })
})

describe('buildReviewLesson', () => {
  it('drills the given notes', () => {
    const l = buildReviewLesson('treble', [62, 64])
    expect(l.id).toBe('review')
    expect(l.notes).toEqual([62, 64])
  })
})
