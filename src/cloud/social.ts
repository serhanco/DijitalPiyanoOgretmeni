// Arkadaşlar (phase 17): what a learner shares with friends and what is made
// of the friends' summaries: the weekly friends league, last week's medals,
// the shared quest with a partner, the news on the map and the Salon rivals.
// Pure.

import type { SessionRow } from '../progress/db'
import type { Ghost } from '../progress/ghost'
import { weekKey } from '../progress/quests'

/** What friends see of a learner (the `players` table). */
export interface Player {
  id: string
  name: string
  /** Six-character invite code. */
  code: string
  costume: string | null
  streak: number
  /** Week key of `weekXp` and `weekLessons`. */
  week: string
  weekXp: number
  weekLessons: number
  /** The week before `week`, kept when a new week starts. */
  lastWeek: string
  lastWeekXp: number
  /** Salon records (best score) and ghosts, by Salon lesson id. */
  records: Record<string, number>
  ghosts: Record<string, Ghost>
  /** The friend picked for the shared quest. */
  partner: string | null
}

/** The part of a player a learner writes. */
export type PlayerUpdate = Omit<Player, 'id' | 'code'>

/** A note from a friend. */
export interface CloudEvent {
  id: number
  from: string
  to: string
  kind: 'cheer' | 'beat'
  /** What it is about: the news cheered, or the Salon game whose record was beaten. */
  about: string
  at: number
}

/** Lessons played together in a week for the shared quest's chest. */
export const PAIR_GOAL = 20
export const PAIR_XP = 30
/** Last week's friends league: XP for the first three places. */
export const MEDAL_XP = [30, 20, 10]
/** Names are short so they fit the league rows. */
export const NAME_MAX = 24
/** Streaks worth a line in the news. */
export const NEWS_STREAK = 3

export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
export const cleanCode = (code: string) =>
  code
    .replace(/[^0-9a-z]/gi, '')
    .toUpperCase()
    .slice(0, 6)
export const isCode = (code: string) => /^[0-9A-F]{6}$/.test(cleanCode(code))

/** This week's XP and lessons from the lessons played (Monday to Sunday, the quests' week). */
export function weekStats(
  sessions: Pick<SessionRow, 'at' | 'xp'>[],
  now: Date,
): { week: string; xp: number; lessons: number } {
  const week = weekKey(now)
  const mine = sessions.filter((s) => weekKey(new Date(s.at)) === week)
  return { week, xp: mine.reduce((n, s) => n + s.xp, 0), lessons: mine.length }
}

/** The summary to publish: a new week moves the old one to `lastWeek`. */
export function nextPlayer(
  prev: PlayerUpdate | null,
  now: { week: string; xp: number; lessons: number },
  rest: Pick<PlayerUpdate, 'name' | 'costume' | 'streak' | 'records' | 'ghosts' | 'partner'>,
): PlayerUpdate {
  const rolled = prev && prev.week && prev.week !== now.week
  return {
    ...rest,
    week: now.week,
    weekXp: now.xp,
    weekLessons: now.lessons,
    lastWeek: rolled ? prev.week : (prev?.lastWeek ?? ''),
    lastWeekXp: rolled ? prev.weekXp : (prev?.lastWeekXp ?? 0),
  }
}

/** A player's XP in a given week (0 when they have not played in it). */
export const xpIn = (p: Player, week: string) => (p.week === week ? p.weekXp : p.lastWeek === week ? p.lastWeekXp : 0)

export interface LeagueRow {
  player: Player
  xp: number
  place: number
  me: boolean
}

/** The friends league of a week: most XP first; equal XP share a place. */
export function league(me: Player, friends: Player[], week: string): LeagueRow[] {
  const rows = [me, ...friends]
    .map((player) => ({ player, xp: xpIn(player, week), me: player.id === me.id }))
    .sort((a, b) => b.xp - a.xp || Number(b.me) - Number(a.me) || a.player.name.localeCompare(b.player.name, 'tr'))
  return rows.map((r) => ({ ...r, place: rows.findIndex((x) => x.xp === r.xp) + 1 }))
}

/** The week before a week key (`2026-W43` → `2026-W42`), from a date in it. */
export function previousWeek(now: Date): string {
  return weekKey(new Date(now.getTime() - 7 * 86400000))
}

/** Last week's place of the learner, when they played and had at least one friend; null otherwise. */
export function lastWeekPlace(me: Player, friends: Player[], now: Date): number | null {
  const week = previousWeek(now)
  if (!friends.length || xpIn(me, week) === 0) return null
  return league(me, friends, week).find((r) => r.me)!.place
}

export interface PairQuest {
  partner: Player
  /** Both picked each other. */
  mutual: boolean
  mine: number
  theirs: number
  done: boolean
}

/** The shared quest with the picked friend this week. */
export function pairQuest(me: Player, friends: Player[], week: string): PairQuest | null {
  const partner = friends.find((f) => f.id === me.partner)
  if (!partner) return null
  const mine = me.week === week ? me.weekLessons : 0
  const theirs = partner.week === week ? partner.weekLessons : 0
  const mutual = partner.partner === me.id
  return { partner, mutual, mine, theirs, done: mutual && mine + theirs >= PAIR_GOAL }
}

export interface NewsItem {
  id: string
  /** The friend it is about. */
  friend: Player
  text: string
  /** Can be cheered (once). */
  cheer: boolean
  /** A note from the friend to the learner. */
  event?: CloudEvent
}

/** The map's friend news: notes received first, then streaks and the week's leader. */
export function news(me: Player, friends: Player[], events: CloudEvent[], week: string): NewsItem[] {
  const byId = new Map(friends.map((f) => [f.id, f]))
  const sent = new Set(events.filter((e) => e.from === me.id && e.kind === 'cheer').map((e) => `${e.to}:${e.about}`))
  const items: NewsItem[] = []
  for (const e of events.filter((e) => e.to === me.id).sort((a, b) => b.at - a.at)) {
    const friend = byId.get(e.from)
    if (!friend) continue
    items.push({
      id: `event-${e.id}`,
      friend,
      text: e.kind === 'cheer' ? `${friend.name} seni alkışladı 👏` : `${friend.name}, ${e.about} rekorunu geçti!`,
      cheer: false,
      event: e,
    })
  }
  const add = (friend: Player, about: string, text: string) =>
    items.push({ id: `${friend.id}:${about}`, friend, text, cheer: !sent.has(`${friend.id}:${about}`) })
  for (const f of friends)
    if (f.streak >= NEWS_STREAK) add(f, `streak-${f.streak}`, `${f.name} ${f.streak} günlük seride 🔥`)
  const top = league(me, friends, week)[0]
  if (top && !top.me && top.xp > 0)
    add(top.player, `lead-${week}`, `${top.player.name} bu hafta ligde önde (${top.xp} XP)`)
  return items
}

export interface Rival {
  player: Player
  best: number
  ghost: Ghost | null
}

/** Friends who played a Salon game, best first. */
export function rivalsFor(lessonId: string, friends: Player[]): Rival[] {
  return friends
    .filter((f) => (f.records[lessonId] ?? 0) > 0)
    .map((player) => ({ player, best: player.records[lessonId], ghost: player.ghosts[lessonId] ?? null }))
    .sort((a, b) => b.best - a.best)
}
