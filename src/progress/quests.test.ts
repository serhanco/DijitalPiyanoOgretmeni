import { describe, expect, it } from 'vitest'
import type { LessonOutcome } from './gamification'
import {
  advanceQuests,
  CHEST_XP,
  DAILY_POOL,
  dailyFor,
  pickQuests,
  QUEST_XP,
  type QuestEvent,
  WEEKLY_XP,
  weeklyFor,
  weekKey,
} from './quests'

const outcome: LessonOutcome = {
  lessonId: 'treble-1',
  total: 10,
  firstTry: 10,
  accuracy: 1,
  avgReactionMs: 900,
  stars: 3,
  failed: false,
}
const event = (o: Partial<QuestEvent> = {}): QuestEvent => ({
  outcome,
  kind: 'drill',
  xp: 40,
  isNew: false,
  beatBest: false,
  starsGained: 0,
  firstOfDay: false,
  ...o,
})
const all = () => true

describe('quests', () => {
  it('picks the same three quests for the same day, different ones on other days', () => {
    const a = pickQuests(DAILY_POOL, '2026-10-16', 3, all).map((q) => q.id)
    expect(pickQuests(DAILY_POOL, '2026-10-16', 3, all).map((q) => q.id)).toEqual(a)
    expect(new Set(a).size).toBe(3)
    const days = ['2026-10-17', '2026-10-18', '2026-10-19'].map((d) => pickQuests(DAILY_POOL, d, 3, all).join())
    expect(days.some((d) => d !== a.join())).toBe(true)
  })

  it('leaves out quests for units that are not open', () => {
    for (let d = 1; d <= 28; d++) {
      const ids = pickQuests(DAILY_POOL, `2026-02-${String(d).padStart(2, '0')}`, 3, (q) => !q.needs).map((q) => q.id)
      expect(ids).not.toContain('ear-2')
      expect(ids).not.toContain('song-1')
    }
  })

  it('keeps the stored quests for today and starts again on a new day or week', () => {
    const today = dailyFor(null, '2026-10-16', all)
    expect(dailyFor(today, '2026-10-16', all)).toBe(today)
    expect(dailyFor(today, '2026-10-17', all).day).toBe('2026-10-17')
    const week = weeklyFor(null, '2026-W42', all)
    expect(weeklyFor(week, '2026-W42', all)).toBe(week)
  })

  it('numbers weeks from Monday, ISO style', () => {
    expect(weekKey(new Date(2026, 9, 12))).toBe('2026-W42') // Monday
    expect(weekKey(new Date(2026, 9, 18))).toBe('2026-W42') // Sunday
    expect(weekKey(new Date(2026, 9, 19))).toBe('2026-W43')
    expect(weekKey(new Date(2027, 0, 1))).toBe('2026-W53')
  })

  it('advances quests, pays each finished one and opens the chest when all three are done', () => {
    const daily = {
      day: '2026-10-16',
      chest: false,
      quests: [
        { id: 'perfect-3', progress: 2, done: false },
        { id: 'flawless', progress: 0, done: false },
        { id: 'xp-60', progress: 30, done: false },
      ],
    }
    const weekly = { week: '2026-W42', quest: { id: 'week-boss', progress: 0, done: false } }
    const r = advanceQuests(daily, weekly, event())
    expect(r.daily.quests.every((q) => q.done)).toBe(true)
    expect(r.daily.quests[2].progress).toBe(60)
    expect(r.chestOpened).toBe(true)
    expect(r.weeklyDone).toBe(false)
    expect(r.xpLines.map((l) => l.xp)).toEqual([QUEST_XP, QUEST_XP, QUEST_XP, CHEST_XP])
    // Nothing more to earn today.
    const again = advanceQuests(r.daily, r.weekly, event())
    expect(again.xpLines).toEqual([])
    expect(again.chestOpened).toBe(false)
  })

  it('a failed lesson counts only its XP; the weekly boss quest needs a beaten boss', () => {
    const daily = dailyFor(null, 'x', all)
    daily.quests = [
      { id: 'lessons-3', progress: 0, done: false },
      { id: 'xp-60', progress: 0, done: false },
      { id: 'games-2', progress: 0, done: false },
    ]
    const weekly = { week: 'w', quest: { id: 'week-boss', progress: 0, done: false } }
    const failed = advanceQuests(daily, weekly, event({ outcome: { ...outcome, failed: true }, kind: 'bird', xp: 8 }))
    expect(failed.daily.quests.map((q) => q.progress)).toEqual([0, 8, 0])
    const boss = advanceQuests(
      daily,
      weekly,
      event({ outcome: { ...outcome, boss: { defeated: true } }, kind: 'boss' }),
    )
    expect(boss.weeklyDone).toBe(true)
    expect(boss.xpLines.at(-1)).toEqual({ label: 'Haftalık meydan okuma: Bu hafta bir boss yen', xp: WEEKLY_XP })
  })
})
