// Hesap ve bulut (phase 17): two copies of the progress, this device's and the
// cloud's, joined into one. Nothing learnt is lost: lessons played and review
// cards are the union of both, stars and records keep the best, badges both.
// Pure.

import type { Backup } from '../testing/backup'
import type { NoteStatRow } from '../progress/db'
import type { Card } from '../progress/srs'
import type { LessonProgress } from '../state/profile'
import type { Streak } from '../progress/gamification'
import type { SalonRecord } from '../games/salon/salon'
import type { Ghost } from '../progress/ghost'
import type { DailyQuests, WeeklyQuest } from '../progress/quests'

/** The persisted profile store's data (the profile as zustand writes it, under `state`). */
export interface ProfileData {
  totalXp: number
  streak: Streak
  daily: { day: string; xp: number }
  dailyGoal: number
  lessonsCompleted: number
  lessons: Record<string, LessonProgress>
  badges: Record<string, number>
  quests: DailyQuests | null
  weekly: WeeklyQuest | null
  pace: Record<string, number>
  mixDay: string | null
  weekSeen: string | null
  salon: Record<string, SalonRecord>
  ghosts: Record<string, Ghost>
  costume: string | null
  [other: string]: unknown
}

/** What this device counted at its last sync, so play on two devices adds up instead of one winning. */
export interface SyncBase {
  xp: number
  lessons: number
}

type Session = Backup['sessions'][number]

const sessionKey = (s: Session) => `${s.lessonId}@${s.at}`

/** Lessons played: every session of both, once, in time order. */
export function mergeSessions(a: Session[], b: Session[]): Session[] {
  const all = new Map<string, Session>()
  for (const s of [...a, ...b]) all.set(sessionKey(s), s)
  return [...all.values()].sort((x, y) => x.at - y.at)
}

/** Review cards: the copy studied last wins. */
export function mergeCards(a: Card[], b: Card[]): Card[] {
  const all = new Map<string, Card>()
  for (const c of [...a, ...b]) {
    const had = all.get(c.key)
    if (!had || c.lastSeen > had.lastSeen || (c.lastSeen === had.lastSeen && c.shown > had.shown)) all.set(c.key, c)
  }
  return [...all.values()]
}

/** Note statistics are running totals: the copy that saw the note more often wins (close enough for advice). */
export function mergeNoteStats(a: NoteStatRow[], b: NoteStatRow[]): NoteStatRow[] {
  const all = new Map<string, NoteStatRow>()
  for (const n of [...a, ...b]) {
    const had = all.get(n.key)
    if (!had || n.shown > had.shown || (n.shown === had.shown && n.lastSeen > had.lastSeen)) all.set(n.key, n)
  }
  return [...all.values()]
}

/** Each of both keys, joined by `pick`. */
function joinRecords<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v
  return out
}

export function mergeStreak(a: Streak, b: Streak): Streak {
  const later =
    (a.lastDay ?? '') > (b.lastDay ?? '') ? a : (b.lastDay ?? '') > (a.lastDay ?? '') ? b : a.count >= b.count ? a : b
  return { ...later, best: Math.max(a.best, b.best, later.count) }
}

const questDone = (q: DailyQuests) => q.quests.reduce((n, p) => n + p.progress, 0)

/**
 * A counter both devices add to: the cloud's value plus what this device added since its last sync.
 * Without a base (this device's first sync), both copies count, minus what they share.
 */
export function addUp(local: number, remote: number, base: number | null, shared = 0): number {
  if (base === null) return Math.max(local, remote, local + remote - shared)
  return Math.max(remote, remote + local - base)
}

/**
 * Join two profiles. `base` is what this device counted at its last sync; `sharedXp` the XP of the
 * lessons both copies already hold (for a first sync).
 */
export function mergeProfiles(
  local: ProfileData,
  remote: ProfileData,
  base: SyncBase | null,
  sharedXp = 0,
  sharedLessons = 0,
): ProfileData {
  const daily =
    local.daily.day === remote.daily.day
      ? { day: local.daily.day, xp: Math.max(local.daily.xp, remote.daily.xp) }
      : local.daily.day > remote.daily.day
        ? local.daily
        : remote.daily
  const quests =
    !local.quests || !remote.quests
      ? (local.quests ?? remote.quests)
      : local.quests.day !== remote.quests.day
        ? local.quests.day > remote.quests.day
          ? local.quests
          : remote.quests
        : questDone(local.quests) >= questDone(remote.quests)
          ? local.quests
          : remote.quests
  const weekly =
    !local.weekly || !remote.weekly
      ? (local.weekly ?? remote.weekly)
      : local.weekly.week !== remote.weekly.week
        ? local.weekly.week > remote.weekly.week
          ? local.weekly
          : remote.weekly
        : local.weekly.quest.progress >= remote.weekly.quest.progress
          ? local.weekly
          : remote.weekly
  return {
    ...remote,
    ...local,
    totalXp: addUp(local.totalXp, remote.totalXp, base?.xp ?? null, sharedXp),
    lessonsCompleted: addUp(local.lessonsCompleted, remote.lessonsCompleted, base?.lessons ?? null, sharedLessons),
    streak: mergeStreak(local.streak, remote.streak),
    daily,
    quests,
    weekly,
    lessons: joinRecords(local.lessons, remote.lessons, (x, y) => ({
      bestStars: Math.max(x.bestStars, y.bestStars),
      bestAccuracy: Math.max(x.bestAccuracy, y.bestAccuracy),
      plays: Math.max(x.plays, y.plays),
    })),
    badges: joinRecords(local.badges, remote.badges, (x, y) => Math.min(x, y)),
    pace: { ...remote.pace, ...local.pace },
    mixDay: [local.mixDay, remote.mixDay].sort().at(-1) ?? null,
    weekSeen: [local.weekSeen, remote.weekSeen].sort().at(-1) ?? null,
    salon: joinRecords(local.salon, remote.salon, (x, y) => ({
      best: Math.max(x.best, y.best),
      bestCombo: Math.max(x.bestCombo, y.bestCombo),
      plays: Math.max(x.plays, y.plays),
    })),
    ghosts: joinRecords(local.ghosts, remote.ghosts, (x, y) => (y.score > x.score ? y : x)),
    costume: local.costume ?? remote.costume,
  }
}

/** The profile store's JSON (as zustand persisted it) → its data and version. */
export function readProfile(json: string | null): { state: ProfileData; version: number } | null {
  if (!json) return null
  try {
    const p = JSON.parse(json) as { state?: ProfileData; version?: number }
    return p.state ? { state: p.state, version: p.version ?? 0 } : null
  } catch {
    return null
  }
}

/**
 * The progress on this device joined with the cloud's. Settings stay per device (latency, theme and
 * keyboard differ from one device to the next), so the local ones are kept.
 */
export function mergeBackups(local: Backup, remote: Backup | null, base: SyncBase | null): Backup {
  if (!remote) return local
  const lp = readProfile(local.profile)
  const rp = readProfile(remote.profile)
  const localKeys = new Set(local.sessions.map(sessionKey))
  const shared = remote.sessions.filter((s) => localKeys.has(sessionKey(s)))
  const sharedXp = shared.reduce((n, s) => n + s.xp, 0)
  const profile =
    lp && rp
      ? JSON.stringify({
          state: mergeProfiles(lp.state, rp.state, base, sharedXp, shared.filter((s) => !s.failed).length),
          version: Math.max(lp.version, rp.version),
        })
      : (local.profile ?? remote.profile)
  return {
    v: 1,
    at: Math.max(local.at, remote.at),
    build: local.build,
    profile,
    settings: local.settings,
    sessions: mergeSessions(local.sessions, remote.sessions),
    noteStats: mergeNoteStats(local.noteStats, remote.noteStats),
    review: mergeCards(local.review ?? [], remote.review ?? []),
  }
}

/** The counters to remember after a sync. */
export function baseOf(b: Backup): SyncBase | null {
  const p = readProfile(b.profile)
  return p ? { xp: p.state.totalXp, lessons: p.state.lessonsCompleted } : null
}
