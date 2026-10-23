import { describe, expect, it } from 'vitest'
import type { Backup } from '../testing/backup'
import type { Card } from '../progress/srs'
import { addUp, baseOf, mergeBackups, mergeProfiles, mergeStreak, type ProfileData } from './merge'

const profile = (p: Partial<ProfileData> = {}): ProfileData => ({
  totalXp: 0,
  streak: { count: 0, best: 0, lastDay: null },
  daily: { day: '', xp: 0 },
  dailyGoal: 30,
  lessonsCompleted: 0,
  lessons: {},
  badges: {},
  quests: null,
  weekly: null,
  pace: {},
  mixDay: null,
  weekSeen: null,
  salon: {},
  ghosts: {},
  costume: null,
  ...p,
})

const session = (lessonId: string, at: number, xp = 10) => ({
  lessonId,
  at,
  total: 10,
  firstTry: 9,
  accuracy: 0.9,
  avgReactionMs: null,
  stars: 2,
  xp,
  failed: false,
})

const backup = (p: ProfileData, sessions = [session('a', 1)], review: Card[] = []): Backup => ({
  v: 1,
  at: 1,
  build: 'test',
  profile: JSON.stringify({ state: p, version: 0 }),
  settings: null,
  sessions,
  noteStats: [],
  review,
})

const card = (key: string, lastSeen: number, box: number): Card => ({
  key,
  kind: 'note',
  label: key,
  data: { kind: 'note', clef: 'treble', midi: 60 },
  box,
  due: '2026-10-23',
  lastSeen,
  shown: 1,
  firstTry: 1,
  last: 1,
})

describe('merging progress', () => {
  it('adds up XP played on two devices since the last sync', () => {
    // Both started from 100; this device earned 30, the other 50.
    expect(addUp(130, 150, 100)).toBe(180)
    // Nothing new here: the cloud's value stands.
    expect(addUp(100, 150, 100)).toBe(150)
  })

  it('counts both copies on a first sync, minus what they share', () => {
    expect(addUp(40, 60, null)).toBe(100)
    expect(addUp(40, 60, null, 40)).toBe(60)
  })

  it('keeps the best stars, every badge and the later streak', () => {
    const m = mergeProfiles(
      profile({
        lessons: { a: { bestStars: 3, bestAccuracy: 0.8, plays: 2 } },
        badges: { first: 5 },
        streak: { count: 2, best: 4, lastDay: '2026-10-23' },
      }),
      profile({
        lessons: {
          a: { bestStars: 1, bestAccuracy: 0.95, plays: 5 },
          b: { bestStars: 2, bestAccuracy: 0.7, plays: 1 },
        },
        badges: { first: 3, boss: 9 },
        streak: { count: 7, best: 7, lastDay: '2026-10-21' },
      }),
      { xp: 0, lessons: 0 },
    )
    expect(m.lessons).toEqual({
      a: { bestStars: 3, bestAccuracy: 0.95, plays: 5 },
      b: { bestStars: 2, bestAccuracy: 0.7, plays: 1 },
    })
    expect(m.badges).toEqual({ first: 3, boss: 9 })
    expect(m.streak).toEqual({ count: 2, best: 7, lastDay: '2026-10-23' })
  })

  it('takes the longer streak on the same day', () => {
    expect(
      mergeStreak({ count: 3, best: 3, lastDay: '2026-10-23' }, { count: 5, best: 5, lastDay: '2026-10-23' }).count,
    ).toBe(5)
  })

  it('keeps the better Salon record and ghost', () => {
    const m = mergeProfiles(
      profile({
        salon: { s: { best: 10, bestCombo: 9, plays: 1 } },
        ghosts: { s: { by: 'second', points: [1], score: 10 } },
      }),
      profile({
        salon: { s: { best: 20, bestCombo: 3, plays: 4 } },
        ghosts: { s: { by: 'second', points: [2], score: 20 } },
      }),
      null,
    )
    expect(m.salon.s).toEqual({ best: 20, bestCombo: 9, plays: 4 })
    expect(m.ghosts.s.score).toBe(20)
  })

  it('joins lessons played and keeps the card studied last', () => {
    const local = backup(profile({ totalXp: 20 }), [session('a', 1), session('b', 2)], [card('x', 5, 3)])
    const remote = backup(
      profile({ totalXp: 30 }),
      [session('a', 1), session('c', 3, 20)],
      [card('x', 9, 1), card('y', 1, 2)],
    )
    const m = mergeBackups(local, remote, null)
    expect(m.sessions.map((s) => s.lessonId)).toEqual(['a', 'b', 'c'])
    expect(m.review?.map((c) => [c.key, c.box])).toEqual([
      ['x', 1],
      ['y', 2],
    ])
    // First sync: 20 + 30 minus the 10 XP of the lesson both hold.
    expect(baseOf(m)).toEqual({ xp: 40, lessons: 0 })
  })

  it('keeps this device’s settings and takes the cloud copy when there is no local profile', () => {
    const local = { ...backup(profile()), profile: null, settings: '{"a":1}' }
    const remote = { ...backup(profile({ totalXp: 5 })), settings: '{"a":2}' }
    const m = mergeBackups(local, remote, null)
    expect(m.settings).toBe('{"a":1}')
    expect(baseOf(m)?.xp).toBe(5)
    expect(mergeBackups(local, null, null)).toBe(local)
  })
})
