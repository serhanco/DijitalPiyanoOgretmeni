import { beforeEach, describe, expect, it } from 'vitest'
import { recordSession, noteScores } from '../progress/history'
import { db } from '../progress/db'
import { useProfile } from './profile'

const outcome = {
  lessonId: 'treble-1',
  total: 10,
  firstTry: 8,
  accuracy: 0.8,
  avgReactionMs: 2000,
  stars: 2,
  failed: false,
}

beforeEach(async () => {
  useProfile.setState({
    totalXp: 0,
    streak: { count: 0, best: 0, lastDay: null },
    daily: { day: '', xp: 0 },
    dailyGoal: 30,
    lessonsCompleted: 0,
    lessons: {},
    badges: {},
    quests: null,
    weekly: null,
  })
  await Promise.all([db.sessions.clear(), db.noteStats.clear()])
})

describe('completeLesson', () => {
  it('adds XP, extends the streak, keeps best stars and reports rewards', () => {
    const day1 = new Date(2026, 9, 7, 10)
    const r1 = useProfile.getState().completeLesson(outcome, day1)
    expect(r1.lessonXp).toBe(16 + 10)
    // Quests completed on the way add their own lines.
    expect(r1.xpGained).toBe(r1.xpLines.reduce((n, l) => n + l.xp, 0))
    expect(r1.streak).toBe(1)
    expect(r1.streakExtended).toBe(true)
    expect(r1.previousBestAccuracy).toBeNull()
    expect(r1.newBadges.map((b) => b.id)).toContain('first-lesson')

    const r2 = useProfile.getState().completeLesson({ ...outcome, stars: 1, accuracy: 0.6, firstTry: 6 }, day1)
    expect(r2.streakExtended).toBe(false)
    expect(r2.previousBestAccuracy).toBe(0.8)
    // 26 + 22 >= 30 (a quest reward can cross it already on the first lesson)
    expect(r1.goalJustReached || r2.goalJustReached).toBe(true)
    expect(useProfile.getState().lessons['treble-1']).toEqual({ bestStars: 2, bestAccuracy: 0.8, plays: 2 })

    const r3 = useProfile.getState().completeLesson(outcome, new Date(2026, 9, 8, 9))
    expect(r3.streak).toBe(2)
    expect(r3.dailyXp).toBe(r3.xpGained)
    expect(r3.lessonXp).toBe(26)
  })

  it('moves the day’s quests on and pays out the finished ones', () => {
    const day = new Date(2026, 9, 7, 10)
    useProfile.getState().ensureQuests(day)
    const before = useProfile.getState().quests!
    expect(before.day).toBe('2026-10-07')
    expect(before.quests).toHaveLength(3)
    // A three-star, flawless first play moves most quests on.
    const r = useProfile.getState().completeLesson({ ...outcome, accuracy: 1, firstTry: 10, stars: 3 }, day)
    const after = useProfile.getState().quests!
    expect(after.quests.map((q) => q.id)).toEqual(before.quests.map((q) => q.id))
    for (const step of r.quests.steps.filter((s) => s.completed))
      expect(r.xpLines.map((l) => l.label)).toContain(
        step.def.id.startsWith('week') ? `Haftalık meydan okuma: ${step.def.title}` : `Görev: ${step.def.title}`,
      )
    expect(r.quests.steps.length).toBeGreaterThan(0)
    // Only units already open give quests: on day one no ear or song quests.
    expect(after.quests.some((q) => q.id === 'ear-2' || q.id === 'song-1')).toBe(false)
  })

  it('does not count a failed lesson as completed', () => {
    useProfile.getState().completeLesson({ ...outcome, failed: true, stars: 0 })
    const s = useProfile.getState()
    expect(s.lessonsCompleted).toBe(0)
    expect(s.lessons['treble-1'].bestStars).toBe(0)
  })
})

describe('history', () => {
  it('accumulates per-note stats across sessions', async () => {
    const perNote = [
      {
        midi: 60,
        clef: 'treble' as const,
        shown: 2,
        firstTry: 1,
        accuracy: 0.5,
        avgReactionMs: 1000,
        confusedWith: [],
      },
      { midi: 62, clef: 'treble' as const, shown: 1, firstTry: 0, accuracy: 0, avgReactionMs: null, confusedWith: [] },
      { midi: 60, clef: 'bass' as const, shown: 1, firstTry: 0, accuracy: 0, avgReactionMs: null, confusedWith: [] },
    ]
    const row = { ...outcome, at: 1, xp: 26 }
    await recordSession(row, perNote)
    await recordSession({ ...row, at: 2 }, perNote)
    const scores = await noteScores('treble')
    expect(scores).toEqual([
      { midi: 60, shown: 4, firstTry: 2, avgReactionMs: 1000 },
      { midi: 62, shown: 2, firstTry: 0, avgReactionMs: null },
    ])
    // Middle C read on the bass staff is kept apart.
    expect(await noteScores('bass')).toEqual([{ midi: 60, shown: 2, firstTry: 0, avgReactionMs: null }])
    expect(await db.sessions.count()).toBe(2)
  })
})
