// Daily quests and the weekly challenge. Pure: the day's quests are picked
// from the day key, so the same day always gets the same three; progress is
// advanced by one finished lesson at a time.

import type { LessonKind } from '../games/noteHunter/lessons'
import type { LessonOutcome, XpLine } from './gamification'

export const QUEST_XP = 10
export const CHEST_XP = 20
export const WEEKLY_XP = 50
export const DAILY_QUESTS = 3

/** What one finished lesson brings to the quests. */
export interface QuestEvent {
  outcome: LessonOutcome
  kind: LessonKind
  /** XP the lesson itself earned (quest rewards not included). */
  xp: number
  /** The lesson was never played before. */
  isNew: boolean
  /** The lesson's best accuracy went up (it had been played before). */
  beatBest: boolean
  /** Stars added to the lesson's best. */
  starsGained: number
  /** The first lesson of the day. */
  firstOfDay: boolean
}

export interface QuestDef {
  id: string
  title: string
  icon: string
  target: number
  /** A unit that must be open for the quest to be picked ('boss': any boss lesson). */
  needs?: string
  /** How much the event moves the quest on. */
  advance: (e: QuestEvent) => number
}

const ARCADE_KINDS: LessonKind[] = [
  'bird',
  'balloon',
  'bar',
  'dino',
  'drum',
  'ladder',
  'chef',
  'space',
  'chordbar',
  'surf',
  'train',
  'chirp',
  'frog',
  'duet',
]

const passed = (e: QuestEvent) => !e.outcome.failed
const one = (ok: boolean) => (ok ? 1 : 0)

export const DAILY_POOL: QuestDef[] = [
  { id: 'lessons-3', title: '3 ders bitir', icon: '📘', target: 3, advance: (e) => one(passed(e)) },
  {
    id: 'perfect-3',
    title: 'Bugün 3 mükemmel ders (3 yıldız)',
    icon: '🌟',
    target: 3,
    advance: (e) => one(passed(e) && e.outcome.stars >= 3),
  },
  {
    id: 'flawless',
    title: 'Bir dersi hatasız bitir',
    icon: '💎',
    target: 1,
    advance: (e) => one(passed(e) && e.outcome.accuracy === 1),
  },
  { id: 'xp-60', title: '60 XP topla', icon: '⚡', target: 60, advance: (e) => e.xp },
  {
    id: 'rhythm-90',
    title: 'Bir ritim dersini %90 üstü bitir',
    icon: '🥁',
    target: 1,
    needs: 'rhythm',
    advance: (e) => one(passed(e) && !!e.outcome.rhythm && e.outcome.accuracy >= 0.9),
  },
  { id: 'new-lesson', title: 'Yeni bir ders aç', icon: '🗝️', target: 1, advance: (e) => one(passed(e) && e.isNew) },
  {
    id: 'beat-best',
    title: 'Bir dersin rekorunu kır',
    icon: '📈',
    target: 1,
    advance: (e) => one(passed(e) && e.beatBest),
  },
  {
    id: 'games-2',
    title: '2 mini oyun oyna',
    icon: '🎮',
    target: 2,
    advance: (e) => one(passed(e) && ARCADE_KINDS.includes(e.kind)),
  },
  {
    id: 'ear-2',
    title: '2 kulak dersi çöz',
    icon: '👂',
    target: 2,
    needs: 'ear',
    advance: (e) => one(passed(e) && !!e.outcome.ear),
  },
  {
    id: 'song-1',
    title: 'Nota Şelalesi’nde bir şarkı çal',
    icon: '🌊',
    target: 1,
    needs: 'songs',
    advance: (e) => one(passed(e) && !!e.outcome.song),
  },
]

export const WEEKLY_POOL: QuestDef[] = [
  { id: 'week-lessons', title: 'Bu hafta 15 ders bitir', icon: '📚', target: 15, advance: (e) => one(passed(e)) },
  { id: 'week-days', title: 'Bu hafta 5 farklı gün çalış', icon: '📅', target: 5, advance: (e) => one(e.firstOfDay) },
  { id: 'week-xp', title: 'Bu hafta 300 XP topla', icon: '⭐', target: 300, advance: (e) => e.xp },
  {
    id: 'week-boss',
    title: 'Bu hafta bir boss yen',
    icon: '👾',
    target: 1,
    needs: 'boss',
    advance: (e) => one(!!e.outcome.boss?.defeated),
  },
  { id: 'week-stars', title: 'Bu hafta 10 yeni yıldız kazan', icon: '✨', target: 10, advance: (e) => e.starsGained },
]

export interface QuestProgress {
  id: string
  progress: number
  done: boolean
}

export interface DailyQuests {
  day: string
  quests: QuestProgress[]
  /** All three done: the chest was opened. */
  chest: boolean
}

export interface WeeklyQuest {
  week: string
  quest: QuestProgress
}

export const questDef = (id: string): QuestDef | undefined => [...DAILY_POOL, ...WEEKLY_POOL].find((q) => q.id === id)

/** A small deterministic hash of a string (FNV-1a). */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: a seeded random number generator. */
function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `count` quests of the pool for `key`, the same ones every time for the same key and eligibility. */
export function pickQuests(pool: QuestDef[], key: string, count: number, eligible: (q: QuestDef) => boolean) {
  const rnd = seeded(hash(key))
  const xs = pool.filter(eligible)
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[xs[i], xs[j]] = [xs[j], xs[i]]
  }
  return xs.slice(0, count)
}

/** ISO week of the local date, "2026-W42" (weeks start on Monday). */
export function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = d.getUTCDay() || 7
  // The week belongs to the year of its Thursday.
  d.setUTCDate(d.getUTCDate() + 4 - weekday)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const fresh = (q: QuestDef): QuestProgress => ({ id: q.id, progress: 0, done: false })

/** Today's quests: the stored ones when they are today's, new ones otherwise. */
export function dailyFor(stored: DailyQuests | null, day: string, eligible: (q: QuestDef) => boolean): DailyQuests {
  if (stored?.day === day) return stored
  return { day, quests: pickQuests(DAILY_POOL, day, DAILY_QUESTS, eligible).map(fresh), chest: false }
}

/** This week's challenge: the stored one when it is this week's, a new one otherwise. */
export function weeklyFor(stored: WeeklyQuest | null, week: string, eligible: (q: QuestDef) => boolean): WeeklyQuest {
  if (stored?.week === week) return stored
  return { week, quest: fresh(pickQuests(WEEKLY_POOL, week, 1, eligible)[0]) }
}

export interface QuestStep {
  def: QuestDef
  before: number
  after: number
  /** Finished with this lesson. */
  completed: boolean
}

export interface QuestResult {
  daily: DailyQuests
  weekly: WeeklyQuest
  /** The quests this lesson moved on (daily first, then the weekly one). */
  steps: QuestStep[]
  chestOpened: boolean
  weeklyDone: boolean
  xpLines: XpLine[]
}

function step(p: QuestProgress, e: QuestEvent): { next: QuestProgress; step: QuestStep | null } {
  const def = questDef(p.id)
  if (!def || p.done) return { next: p, step: null }
  const by = def.advance(e)
  if (by <= 0) return { next: p, step: null }
  const after = Math.min(def.target, p.progress + by)
  const done = after >= def.target
  return { next: { ...p, progress: after, done }, step: { def, before: p.progress, after, completed: done } }
}

/** Moves today's quests and this week's challenge on by one finished lesson. */
export function advanceQuests(daily: DailyQuests, weekly: WeeklyQuest, e: QuestEvent): QuestResult {
  const steps: QuestStep[] = []
  const quests = daily.quests.map((p) => {
    const r = step(p, e)
    if (r.step) steps.push(r.step)
    return r.next
  })
  const chestOpened = !daily.chest && quests.length > 0 && quests.every((q) => q.done)
  const w = step(weekly.quest, e)
  if (w.step) steps.push(w.step)
  const weeklyDone = !!w.step?.completed

  const xpLines: XpLine[] = steps
    .filter((s) => s.completed && s !== w.step)
    .map((s) => ({ label: `Görev: ${s.def.title}`, xp: QUEST_XP }))
  if (weeklyDone) xpLines.push({ label: `Haftalık meydan okuma: ${w.step!.def.title}`, xp: WEEKLY_XP })
  if (chestOpened) xpLines.push({ label: 'Görev sandığı', xp: CHEST_XP })
  return {
    daily: { ...daily, quests, chest: daily.chest || chestOpened },
    weekly: { ...weekly, quest: w.next },
    steps,
    chestOpened,
    weeklyDone,
    xpLines,
  }
}
