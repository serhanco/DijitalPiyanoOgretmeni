// The weekly progress summary: lessons, XP, days practised and accuracy of
// one week next to the week before, the lesson that improved most and the
// cards known well. Pure: weeks start on Monday, local time.

import type { SessionRow } from './db'
import { dayKey } from './gamification'
import { type Card, MASTERED_BOX } from './srs'

/** Monday 00:00 (local) of the week `date` is in. */
export function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

/** Monday 00:00 of the week before. */
export function previousWeekStart(date: Date): Date {
  const d = weekStart(date)
  d.setDate(d.getDate() - 7)
  return d
}

export interface WeekStats {
  lessons: number
  xp: number
  /** Days with at least one lesson. */
  days: number
  /** Mean accuracy of the lessons played, null without any. */
  accuracy: number | null
}

export interface WeekSummary {
  /** Monday of the week summed up, as a day key. */
  from: string
  week: WeekStats
  before: WeekStats
  /** Accuracy change against the week before (points of 0..1), null when either week has none. */
  change: number | null
  /** The lesson whose best accuracy rose most this week over its earlier best. */
  improved: { lessonId: string; from: number; to: number } | null
  /** Cards in box 4 or 5 now. */
  mastered: number
  cards: number
}

function stats(rows: SessionRow[]): WeekStats {
  return {
    lessons: rows.length,
    xp: rows.reduce((n, r) => n + r.xp, 0),
    days: new Set(rows.map((r) => dayKey(new Date(r.at)))).size,
    accuracy: rows.length ? rows.reduce((n, r) => n + r.accuracy, 0) / rows.length : null,
  }
}

/** The week starting `monday`, against the week before; `sessions` may hold any range. */
export function weekSummary(sessions: SessionRow[], cards: Card[], monday: Date): WeekSummary {
  const start = weekStart(monday)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  const prev = new Date(start)
  prev.setDate(prev.getDate() - 7)
  const inRange = (r: SessionRow, a: Date, b: Date) => r.at >= a.getTime() && r.at < b.getTime()
  const week = sessions.filter((r) => inRange(r, start, end))
  const before = sessions.filter((r) => inRange(r, prev, start))
  const w = stats(week)
  const b = stats(before)

  // Best accuracy per lesson before this week and during it (lost games do not count).
  const best = (rows: SessionRow[]) => {
    const m = new Map<string, number>()
    for (const r of rows) if (!r.failed) m.set(r.lessonId, Math.max(m.get(r.lessonId) ?? 0, r.accuracy))
    return m
  }
  const earlier = best(sessions.filter((r) => r.at < start.getTime()))
  let improved: WeekSummary['improved'] = null
  for (const [lessonId, to] of best(week)) {
    const from = earlier.get(lessonId)
    if (from === undefined || to <= from) continue
    if (!improved || to - from > improved.to - improved.from) improved = { lessonId, from, to }
  }

  return {
    from: dayKey(start),
    week: w,
    before: b,
    change: w.accuracy !== null && b.accuracy !== null ? w.accuracy - b.accuracy : null,
    improved,
    mastered: cards.filter((c) => c.box >= MASTERED_BOX).length,
    cards: cards.length,
  }
}
