import { describe, expect, it } from 'vitest'
import {
  cleanCode,
  isCode,
  lastWeekPlace,
  league,
  news,
  nextPlayer,
  pairQuest,
  PAIR_GOAL,
  type Player,
  previousWeek,
  rivalsFor,
  weekStats,
} from './social'

// 2026-10-23 is a Friday of ISO week 43.
const NOW = new Date(2026, 9, 23, 12)
const W = '2026-W43'

const player = (id: string, p: Partial<Player> = {}): Player => ({
  id,
  name: id,
  code: 'ABC123',
  costume: null,
  streak: 0,
  week: W,
  weekXp: 0,
  weekLessons: 0,
  lastWeek: '',
  lastWeekXp: 0,
  records: {},
  ghosts: {},
  partner: null,
  ...p,
})

describe('friends', () => {
  it('reads codes loosely', () => {
    expect(cleanCode(' ab-c1 23 ')).toBe('ABC123')
    expect(isCode('abc12f')).toBe(true)
    expect(isCode('XYZ')).toBe(false)
  })

  it('counts this week’s lessons from Monday', () => {
    const at = (d: number) => new Date(2026, 9, d, 10).getTime()
    expect(
      weekStats(
        [
          { at: at(18), xp: 50 },
          { at: at(19), xp: 10 },
          { at: at(23), xp: 15 },
        ],
        NOW,
      ),
    ).toEqual({
      week: W,
      xp: 25,
      lessons: 2,
    })
  })

  it('keeps last week when a new week starts', () => {
    const rest = { name: 'A', costume: null, streak: 1, records: {}, ghosts: {}, partner: null }
    const prev = nextPlayer(null, { week: '2026-W42', xp: 80, lessons: 5 }, rest)
    const next = nextPlayer(prev, { week: W, xp: 10, lessons: 1 }, rest)
    expect([next.lastWeek, next.lastWeekXp, next.weekXp]).toEqual(['2026-W42', 80, 10])
    expect(nextPlayer(next, { week: W, xp: 20, lessons: 2 }, rest).lastWeekXp).toBe(80)
  })

  it('ranks the league by XP, the learner first on a tie', () => {
    const me = player('me', { weekXp: 40 })
    const rows = league(
      me,
      [player('a', { weekXp: 90 }), player('b', { weekXp: 40 }), player('c', { week: '2026-W40', weekXp: 500 })],
      W,
    )
    expect(rows.map((r) => [r.player.id, r.place, r.xp])).toEqual([
      ['a', 1, 90],
      ['me', 2, 40],
      ['b', 2, 40],
      ['c', 4, 0],
    ])
  })

  it('gives last week’s place, also to friends who have not played this week', () => {
    expect(previousWeek(NOW)).toBe('2026-W42')
    const me = player('me', { lastWeek: '2026-W42', lastWeekXp: 70 })
    const friend = player('a', { week: '2026-W42', weekXp: 50 })
    expect(lastWeekPlace(me, [friend], NOW)).toBe(1)
    expect(lastWeekPlace(me, [], NOW)).toBeNull()
    expect(lastWeekPlace(player('me'), [friend], NOW)).toBeNull()
  })

  it('adds up the shared quest only when both picked each other', () => {
    const me = player('me', { partner: 'a', weekLessons: 12 })
    const a = player('a', { partner: 'me', weekLessons: PAIR_GOAL - 12 })
    expect(pairQuest(me, [a], W)).toMatchObject({ mutual: true, mine: 12, theirs: 8, done: true })
    expect(pairQuest(me, [{ ...a, partner: null }], W)?.done).toBe(false)
    expect(pairQuest(player('me'), [a], W)).toBeNull()
  })

  it('makes news of notes, streaks and the league leader, each cheered once', () => {
    const me = player('me')
    const a = player('a', { name: 'Ayşe', streak: 5, weekXp: 60 })
    const items = news(
      me,
      [a],
      [
        { id: 1, from: 'a', to: 'me', kind: 'beat', about: 'Nota Kuşu', at: 2 },
        { id: 2, from: 'me', to: 'a', kind: 'cheer', about: 'streak-5', at: 1 },
      ],
      W,
    )
    expect(items.map((i) => [i.text, i.cheer])).toEqual([
      ['Ayşe, Nota Kuşu rekorunu geçti!', false],
      ['Ayşe 5 günlük seride 🔥', false],
      ['Ayşe bu hafta ligde önde (60 XP)', true],
    ])
  })

  it('lists the friends who played a Salon game, best first', () => {
    const ghost = { by: 'second' as const, points: [5], score: 5 }
    const rivals = rivalsFor('salon-bird-x', [
      player('a', { records: { 'salon-bird-x': 10 } }),
      player('b', { records: { 'salon-bird-x': 30 }, ghosts: { 'salon-bird-x': ghost } }),
      player('c'),
    ])
    expect(rivals.map((r) => [r.player.id, r.best, !!r.ghost])).toEqual([
      ['b', 30, true],
      ['a', 10, false],
    ])
  })
})
