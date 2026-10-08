import { describe, expect, it } from 'vitest'
import { lessonNotes } from '../games/noteHunter/keyboard'
import { ALL_LESSONS, buildReviewLesson, isUnlocked, mapNodeOf, UNITS, weakestNotes } from './curriculum'

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
    expect(l.keyboard).toEqual({ low: 60, high: 72 })
  })
})

describe('lesson keyboards', () => {
  it('show every key a note lesson asks for', () => {
    for (const l of ALL_LESSONS)
      for (const n of lessonNotes(l)) {
        expect(n, l.id).toBeGreaterThanOrEqual(l.keyboard.low)
        expect(n, l.id).toBeLessThanOrEqual(l.keyboard.high)
      }
  })

  it('show one octave when the notes fit in one', () => {
    const ids = ['treble-1', 'treble-2', 'treble-bird-1', 'bass-1', 'bass-melody-2', 'scale-c-right', 'scale-g-right']
    for (const id of ids) {
      const { low, high } = ALL_LESSONS.find((l) => l.id === id)!.keyboard
      expect(high - low, id).toBe(12)
    }
  })
  it('start on Do in the note-reading units', () => {
    for (const unit of UNITS.filter((u) => ['basics', 'treble', 'bass', 'hands'].includes(u.id)))
      for (const l of unit.lessons) expect(l.keyboard.low % 12, l.id).toBe(0)
  })
})

describe('mapNodeOf', () => {
  it('names the node a lesson is started from, the weak-notes node by its clef', () => {
    const lesson = UNITS[1].lessons[2]
    expect(mapNodeOf(lesson)).toBe(lesson.id)
    expect(mapNodeOf(buildReviewLesson('bass', [48, 50, 52, 53]))).toBe('review-bass')
    expect(mapNodeOf(buildReviewLesson('grand', [48, 60, 64, 67]))).toBe('review-grand')
  })
})
