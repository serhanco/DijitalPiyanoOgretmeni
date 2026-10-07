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
  })
  await Promise.all([db.sessions.clear(), db.noteStats.clear()])
})

describe('completeLesson', () => {
  it('adds XP, extends the streak, keeps best stars and reports rewards', () => {
    const day1 = new Date(2026, 9, 7, 10)
    const r1 = useProfile.getState().completeLesson(outcome, day1)
    expect(r1.xpGained).toBe(16 + 10)
    expect(r1.streak).toBe(1)
    expect(r1.streakExtended).toBe(true)
    expect(r1.previousBestAccuracy).toBeNull()
    expect(r1.newBadges.map((b) => b.id)).toContain('first-lesson')

    const r2 = useProfile.getState().completeLesson({ ...outcome, stars: 1, accuracy: 0.6, firstTry: 6 }, day1)
    expect(r2.streakExtended).toBe(false)
    expect(r2.previousBestAccuracy).toBe(0.8)
    expect(r2.goalJustReached).toBe(true) // 26 + 22 >= 30
    expect(useProfile.getState().lessons['treble-1']).toEqual({ bestStars: 2, bestAccuracy: 0.8, plays: 2 })

    const r3 = useProfile.getState().completeLesson(outcome, new Date(2026, 9, 8, 9))
    expect(r3.streak).toBe(2)
    expect(r3.dailyXp).toBe(26)
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
      { midi: 60, shown: 2, firstTry: 1, accuracy: 0.5, avgReactionMs: 1000, confusedWith: [] },
      { midi: 62, shown: 1, firstTry: 0, accuracy: 0, avgReactionMs: null, confusedWith: [] },
    ]
    const row = { ...outcome, at: 1, xp: 26 }
    await recordSession(row, 'treble', perNote)
    await recordSession({ ...row, at: 2 }, 'treble', perNote)
    const scores = await noteScores('treble')
    expect(scores).toEqual([
      { midi: 60, shown: 4, firstTry: 2, avgReactionMs: 1000 },
      { midi: 62, shown: 2, firstTry: 0, avgReactionMs: null },
    ])
    expect(await db.sessions.count()).toBe(2)
  })
})
