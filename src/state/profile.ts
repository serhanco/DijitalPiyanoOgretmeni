import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { db } from '../progress/db'
import { TREBLE_LESSONS } from '../games/noteHunter/lessons'
import { BASS_LESSONS } from '../games/noteHunter/bassLessons'
import { CHORD_LESSONS } from '../games/chords/lessons'
import { SCALE_LESSONS } from '../games/scales/lessons'
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
import { BOSS_LESSON_IDS, questEligible, REVIEW_LESSON_ID } from '../progress/curriculum'
import { nextPace, PACE_KINDS } from '../progress/adaptive'
import { MIX_LESSON_ID, MIX_XP } from '../progress/mix'
import { isSalonId, nextRecord, type SalonRecord } from '../games/salon/salon'
import {
  advanceQuests,
  dailyFor,
  type DailyQuests,
  type QuestStep,
  weeklyFor,
  type WeeklyQuest,
  weekKey,
} from '../progress/quests'

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
  /** XP of the lesson itself (the quest rewards are in `xpLines` and `xpGained` too). */
  lessonXp: number
  /** Quests this lesson moved on, the chest and the weekly challenge. */
  quests: { steps: QuestStep[]; chestOpened: boolean; weeklyDone: boolean }
  /** Arcade games: the lesson's pace before and after this game, when it changed. */
  pace?: { from: number; to: number }
  /** Oyun Salonu: the score, the record before this game and whether it was beaten. */
  record?: { score: number; combo: number; before: number; isNew: boolean }
}

/** Lessons that change every time keep no stars. */
const UNSCORED = [REVIEW_LESSON_ID, MIX_LESSON_ID]

interface ProfileState {
  totalXp: number
  streak: Streak
  daily: { day: string; xp: number }
  dailyGoal: number
  lessonsCompleted: number
  lessons: Record<string, LessonProgress>
  badges: Record<string, number>
  /** Today's quests and this week's challenge (picked when first needed). */
  quests: DailyQuests | null
  weekly: WeeklyQuest | null
  /** Arcade note games: the pace of each lesson (1 = as written), set by how the last games went. */
  pace: Record<string, number>
  /** Day key of the last Günün Karışımı that earned its bonus. */
  mixDay: string | null
  /** Week key of the last weekly summary the learner closed on the map. */
  weekSeen: string | null
  /** Oyun Salonu: the record of each game with each skill, by its lesson id. */
  salon: Record<string, SalonRecord>
  closeWeekSummary: (week: string) => void
  /** Picks today's quests and this week's challenge when they are not picked yet. */
  ensureQuests: (now?: Date) => void
  /** `save: false` (a test finish) works the reward out without keeping it. */
  completeLesson: (outcome: LessonOutcome, now?: Date, save?: boolean) => Reward
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
      quests: null,
      weekly: null,
      pace: {},
      mixDay: null,
      weekSeen: null,
      salon: {},

      closeWeekSummary: (week) => set({ weekSeen: week }),

      ensureQuests(now = new Date()) {
        const s = get()
        const eligible = questEligible((id) => s.lessons[id]?.bestStars ?? 0)
        const quests = dailyFor(s.quests, dayKey(now), eligible)
        const weekly = weeklyFor(s.weekly, weekKey(now), eligible)
        if (quests !== s.quests || weekly !== s.weekly) set({ quests, weekly })
      },

      completeLesson(outcome, now = new Date(), save = true) {
        const s = get()
        const today = dayKey(now)
        // The first mix finished each day earns a bonus.
        const mixBonus =
          outcome.lessonId === MIX_LESSON_ID && !outcome.failed && outcome.total > 0 && s.mixDay !== today
        const lessonLines = [...xpFor(outcome), ...(mixBonus ? [{ label: 'Günün karışımı', xp: MIX_XP }] : [])]
        const lessonXp = sumXp(lessonLines)

        const streak = extendStreak(s.streak, today)
        const dailyBefore = s.daily.day === today ? s.daily.xp : 0

        const prev = s.lessons[outcome.lessonId]
        const lessons = { ...s.lessons }
        // The review lesson and the mix change every time, so they keep no stars; Salon games keep a record instead.
        const salonGame = isSalonId(outcome.lessonId)
        if (!UNSCORED.includes(outcome.lessonId) && !salonGame) {
          const p = prev ?? { bestStars: 0, bestAccuracy: 0, plays: 0 }
          lessons[outcome.lessonId] = {
            bestStars: outcome.failed ? p.bestStars : Math.max(p.bestStars, outcome.stars),
            bestAccuracy: outcome.failed ? p.bestAccuracy : Math.max(p.bestAccuracy, outcome.accuracy),
            plays: p.plays + 1,
          }
        }
        const lessonsCompleted = s.lessonsCompleted + (outcome.failed ? 0 : 1)

        // Quests are picked for what was open before this lesson.
        const eligible = questEligible((id) => s.lessons[id]?.bestStars ?? 0)
        const q = advanceQuests(dailyFor(s.quests, today, eligible), weeklyFor(s.weekly, weekKey(now), eligible), {
          outcome,
          kind: outcome.kind ?? 'drill',
          xp: lessonXp,
          isNew: !prev && !UNSCORED.includes(outcome.lessonId) && !salonGame,
          beatBest: !!prev && prev.plays > 0 && outcome.accuracy > prev.bestAccuracy,
          starsGained: Math.max(0, (lessons[outcome.lessonId]?.bestStars ?? 0) - (prev?.bestStars ?? 0)),
          firstOfDay: s.streak.lastDay !== today,
        })
        const xpLines = [...lessonLines, ...q.xpLines]
        const xpGained = sumXp(xpLines)
        const totalXp = s.totalXp + xpGained
        const dailyXp = dailyBefore + xpGained

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
            allBassLessonIds: BASS_LESSONS.map((l) => l.id),
            allScaleLessonIds: SCALE_LESSONS.map((l) => l.id),
            allChordLessonIds: CHORD_LESSONS.map((l) => l.id),
            bossesDefeated: BOSS_LESSON_IDS.filter((id) => (lessons[id]?.bestStars ?? 0) >= 1).length,
            bossCount: BOSS_LESSON_IDS.length,
            weeklyDone: q.weeklyDone,
          },
          Object.keys(s.badges),
        )
        const badges = { ...s.badges }
        for (const b of newBadges) badges[b.id] = now.getTime()

        const paceBefore = s.pace[outcome.lessonId] ?? 1
        // Endless Salon games always end with the hearts gone: their pace stays as it is.
        const paceAfter =
          PACE_KINDS.includes(outcome.kind ?? 'drill') && !salonGame ? nextPace(paceBefore, outcome) : paceBefore
        const pace = paceAfter === paceBefore ? s.pace : { ...s.pace, [outcome.lessonId]: paceAfter }

        const salonBefore = s.salon[outcome.lessonId]
        const salonNext = salonGame && outcome.salon ? nextRecord(salonBefore, outcome.salon) : null

        if (save)
          set({
            pace,
            ...(salonNext && { salon: { ...s.salon, [outcome.lessonId]: salonNext.record } }),
            ...(mixBonus && { mixDay: today }),
            totalXp,
            streak,
            daily: { day: today, xp: dailyXp },
            lessons,
            lessonsCompleted,
            badges,
            quests: q.daily,
            weekly: q.weekly,
          })

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
          lessonXp,
          quests: { steps: q.steps, chestOpened: q.chestOpened, weeklyDone: q.weeklyDone },
          ...(paceAfter !== paceBefore && { pace: { from: paceBefore, to: paceAfter } }),
          ...(salonNext &&
            outcome.salon && {
              record: {
                ...outcome.salon,
                before: salonBefore?.best ?? 0,
                isNew: salonNext.isNew,
              },
            }),
        }
      },

      setDailyGoal: (xp) => set({ dailyGoal: xp }),
    }),
    {
      name: 'profile',
      storage: createJSONStorage(() => idbStorage),
      partialize: ({ completeLesson: _c, setDailyGoal: _s, ensureQuests: _e, closeWeekSummary: _w, ...data }) => data,
    },
  ),
)
