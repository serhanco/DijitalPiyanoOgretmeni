import { describe, expect, it } from 'vitest'
import { buildReviewLesson, isUnlocked, UNITS, weakestNotes } from './curriculum'

describe('isUnlocked', () => {
  it('opens the first lesson of each unit and each next one after a star', () => {
    const unit = (id: string) => UNITS.find((u) => u.id === id)!.lessons
    const [first, second, third] = unit('treble')
    const stars: Record<string, number> = Object.fromEntries(unit('basics').map((l) => [l.id, 1]))
    stars[first.id] = 1
    const best = (id: string) => stars[id] ?? 0
    expect(isUnlocked(first.id, best)).toBe(true)
    expect(isUnlocked(second.id, best)).toBe(true)
    expect(isUnlocked(third.id, best)).toBe(false)
    expect(isUnlocked('nope', best)).toBe(false)
    const [rhythm1, rhythm2] = unit('rhythm')
    expect(isUnlocked(rhythm1.id, best)).toBe(true)
    expect(isUnlocked(rhythm2.id, best)).toBe(false)
  })

  it('keeps other units closed until Başlangıç is done, unless they already have stars', () => {
    const unit = (id: string) => UNITS.find((u) => u.id === id)!.lessons
    const stars: Record<string, number> = {}
    const best = (id: string) => stars[id] ?? 0
    expect(isUnlocked(unit('basics')[0].id, best)).toBe(true)
    expect(isUnlocked(unit('treble')[0].id, best)).toBe(false)
    stars[unit('chords')[3].id] = 2
    expect(isUnlocked(unit('chords')[0].id, best)).toBe(true)
    for (const l of unit('basics')) stars[l.id] = 1
    expect(isUnlocked(unit('treble')[0].id, best)).toBe(true)
    expect(isUnlocked(unit('rhythm')[0].id, best)).toBe(true)
  })

  it('starts the map with the basics unit', () => {
    expect(UNITS[0].id).toBe('basics')
    expect(UNITS[0].lessons[0].kind).toBe('theory')
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
