import { useEffect, useState } from 'react'
import { findLesson } from '../progress/curriculum'
import { allCards, sessionsSince } from '../progress/history'
import { MIX_LESSON_ID } from '../progress/mix'
import { weekKey } from '../progress/quests'
import { previousWeekStart, weekStart, type WeekSummary, weekSummary } from '../progress/weekly'
import { useProfile } from '../state/profile'

// The weekly progress summary: on the profile for this week, and on the map
// on the first visit of a new week for the week before (until closed).

const titleOf = (id: string) => (id === MIX_LESSON_ID ? 'Günün Karışımı' : (findLesson(id)?.title ?? id))

function change(points: number | null): string | null {
  if (points === null) return null
  const p = Math.round(points * 100)
  return p > 0 ? `${p} puan yukarı` : p < 0 ? `${-p} puan aşağı` : 'aynı'
}

export function WeekStatsView({ s, past }: { s: WeekSummary; past?: boolean }) {
  const { week, before } = s
  if (!week.lessons)
    return (
      <p className="muted">{past ? 'Geçen hafta hiç ders yoktu.' : 'Bu hafta henüz ders yok. İlk dersle başla!'}</p>
    )
  const c = change(s.change)
  return (
    <>
      <div className="week-stats">
        <div>
          <b>{week.lessons}</b>
          <span>ders</span>
        </div>
        <div>
          <b>{week.xp}</b>
          <span>XP</span>
        </div>
        <div>
          <b>{week.days}/7</b>
          <span>gün</span>
        </div>
        <div>
          <b>%{Math.round((week.accuracy ?? 0) * 100)}</b>
          <span>başarı</span>
        </div>
      </div>
      <ul className="week-notes">
        {before.lessons > 0 && (
          <li>
            📊 Önceki haftaya göre: {week.lessons - before.lessons >= 0 ? '+' : ''}
            {week.lessons - before.lessons} ders, {week.xp - before.xp >= 0 ? '+' : ''}
            {week.xp - before.xp} XP{c && `, başarı ${c}`}.
          </li>
        )}
        {s.improved && (
          <li>
            📈 En çok gelişen: <b>{titleOf(s.improved.lessonId)}</b> (%{Math.round(s.improved.from * 100)} → %
            {Math.round(s.improved.to * 100)})
          </li>
        )}
        {s.cards > 0 && (
          <li>
            🗂️ {s.cards} tekrar kartının <b>{s.mastered}</b> tanesi iyice oturdu (kutu 4–5).
          </li>
        )}
      </ul>
    </>
  )
}

/**
 * The last summary worked out per week: shown at once when the map comes back, so the card
 * does not pop in after the map has scrolled to the lesson just played.
 */
const shown = new Map<string, WeekSummary>()

/** Sessions from the week before last on (enough for a week and the one before it), and the cards. */
function useWeek(of: 'this' | 'last', enabled = true): WeekSummary | null {
  const [monday] = useState(() => (of === 'this' ? weekStart(new Date()) : previousWeekStart(new Date())))
  const key = `${of}:${monday.getTime()}`
  const [s, setS] = useState<WeekSummary | null>(() => shown.get(key) ?? null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const from = new Date(monday)
    from.setDate(from.getDate() - 7)
    Promise.all([sessionsSince(from.getTime()), allCards()])
      .then(([sessions, cards]) => {
        const summary = weekSummary(sessions, cards, monday)
        shown.set(key, summary)
        if (alive) setS(summary)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [monday, key, enabled])
  return s
}

export function ThisWeekCard() {
  const s = useWeek('this')
  return (
    <section className="card week-card" data-week="this">
      <h2>Bu hafta</h2>
      {s ? <WeekStatsView s={s} /> : <p className="muted">Yükleniyor…</p>}
    </section>
  )
}

/** The map's card on a new week's first visit: last week in short; closing it hides it until next week. */
export function LastWeekCard() {
  const weekSeen = useProfile((st) => st.weekSeen)
  const close = useProfile((st) => st.closeWeekSummary)
  const [week] = useState(() => weekKey(new Date()))
  // Until the profile is read from the database, `weekSeen` is not known yet.
  const [hydrated, setHydrated] = useState(() => useProfile.persist.hasHydrated())
  useEffect(() => useProfile.persist.onFinishHydration(() => setHydrated(true)), [])
  const s = useWeek('last', weekSeen !== week)
  if (!hydrated || weekSeen === week || !s || !s.week.lessons) return null
  return (
    <section className="card week-card" data-week="last">
      <header>
        <h2>Geçen haftan</h2>
        <button className="icon-btn" onClick={() => close(week)} aria-label="Haftalık özeti kapat">
          ✕
        </button>
      </header>
      <WeekStatsView s={s} past />
    </section>
  )
}
