import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { db } from '../progress/db'
import { TREBLE_LESSONS } from '../games/noteHunter/lessons'
import {
  type Badge,
  DEFAULT_DAILY_GOAL,
  dayKey,
  extendStreak,
  levelFromXp,
  type LessonOutcome,
  newlyEarnedBadges,
  type Streak,
  sumXp,
  xpFor,
  type XpLine,
} from '../progress/gamification'
import { REVIEW_LESSON_ID } from '../progress/curriculum'

export interface LessonProgress {
  bestStars: number
  bestAccuracy: number
  plays: number
}

export interface Reward {
  xpLines: XpLine[]
  xpGained: number
  levelBefore: number
  levelAfter: number
  streak: number
  /** True when this lesson was the first practice of the day. */
  streakExtended: boolean
  dailyXp: number
  dailyGoal: number
  /** True when this lesson pushed the daily XP over the goal. */
  goalJustReached: boolean
  newBadges: Badge[]
  previousBestAccuracy: number | null
}

interface ProfileState {
  totalXp: number
  streak: Streak
  daily: { day: string; xp: number }
  dailyGoal: number
  lessonsCompleted: number
  lessons: Record<string, LessonProgress>
  badges: Record<string, number>
  completeLesson: (outcome: LessonOutcome, now?: Date) => Reward
  setDailyGoal: (xp: number) => void
}

/** zustand storage backed by the IndexedDB key/value table. */
const idbStorage: StateStorage = {
  getItem: async (key) => (await db.kv.get(key))?.value ?? null,
  setItem: async (key, value) => {
    await db.kv.put({ key, value })
  },
  removeItem: async (key) => {
    await db.kv.delete(key)
  },
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      streak: { count: 0, best: 0, lastDay: null },
      daily: { day: '', xp: 0 },
      dailyGoal: DEFAULT_DAILY_GOAL,
      lessonsCompleted: 0,
      lessons: {},
      badges: {},

      completeLesson(outcome, now = new Date()) {
        const s = get()
        const today = dayKey(now)
        const xpLines = xpFor(outcome)
        const xpGained = sumXp(xpLines)
        const totalXp = s.totalXp + xpGained

        const streak = extendStreak(s.streak, today)
        const dailyBefore = s.daily.day === today ? s.daily.xp : 0
        const dailyXp = dailyBefore + xpGained

        const prev = s.lessons[outcome.lessonId]
        const lessons = { ...s.lessons }
        // The review lesson changes every time, so it keeps no stars.
        if (outcome.lessonId !== REVIEW_LESSON_ID) {
          const p = prev ?? { bestStars: 0, bestAccuracy: 0, plays: 0 }
          lessons[outcome.lessonId] = {
            bestStars: outcome.failed ? p.bestStars : Math.max(p.bestStars, outcome.stars),
            bestAccuracy: outcome.failed ? p.bestAccuracy : Math.max(p.bestAccuracy, outcome.accuracy),
            plays: p.plays + 1,
          }
        }
        const lessonsCompleted = s.lessonsCompleted + (outcome.failed ? 0 : 1)

        const newBadges = newlyEarnedBadges(
          {
            totalXp,
            streak: streak.count,
            lessonsCompleted,
            outcome,
            threeStarLessons: Object.entries(lessons)
              .filter(([, l]) => l.bestStars >= 3)
              .map(([id]) => id),
            allTrebleLessonIds: TREBLE_LESSONS.map((l) => l.id),
          },
          Object.keys(s.badges),
        )
        const badges = { ...s.badges }
        for (const b of newBadges) badges[b.id] = now.getTime()

        set({ totalXp, streak, daily: { day: today, xp: dailyXp }, lessons, lessonsCompleted, badges })

        return {
          xpLines,
          xpGained,
          levelBefore: levelFromXp(s.totalXp).level,
          levelAfter: levelFromXp(totalXp).level,
          streak: streak.count,
          streakExtended: s.streak.lastDay !== today,
          dailyXp,
          dailyGoal: s.dailyGoal,
          goalJustReached: dailyBefore < s.dailyGoal && dailyXp >= s.dailyGoal,
          newBadges,
          previousBestAccuracy: prev && prev.plays > 0 ? prev.bestAccuracy : null,
        }
      },

      setDailyGoal: (xp) => set({ dailyGoal: xp }),
    }),
    {
      name: 'profile',
      storage: createJSONStorage(() => idbStorage),
      partialize: ({ completeLesson: _c, setDailyGoal: _s, ...data }) => data,
    },
  ),
)

/** Today's XP, or 0 if nothing was played today yet. */
export function todaysXp(daily: { day: string; xp: number }, now = new Date()): number {
  return daily.day === dayKey(now) ? daily.xp : 0
}
