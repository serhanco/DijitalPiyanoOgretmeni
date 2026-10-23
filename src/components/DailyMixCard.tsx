import { useEffect, useMemo, useState } from 'react'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { dayKey } from '../progress/gamification'
import { allCards } from '../progress/history'
import { buildMix, MIX_LESSON_ID, MIX_XP } from '../progress/mix'
import { type Card, countsText, dueCounts, MASTERED_BOX, nextDueText } from '../progress/srs'
import { useProfile } from '../state/profile'
import { Icon } from './icons/Icon'

// The map's "Günün Karışımı" card: what is due for review today and a
// button that builds the mix from it. Hidden until the first cards exist.

/** The cards last read: the card is drawn at once when the map comes back (no jump after its scroll). */
let lastCards: Card[] | null = null

export function DailyMixCard({ onStart, back }: { onStart: (lesson: NoteLesson) => void; back: boolean }) {
  const [cards, setCards] = useState<Card[] | null>(lastCards)
  const mixDay = useProfile((s) => s.mixDay)
  const [today] = useState(() => dayKey(new Date()))

  useEffect(() => {
    let alive = true
    allCards()
      .then((c) => {
        lastCards = c
        if (alive) setCards(c)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const lesson = useMemo(() => (cards ? buildMix(cards, today) : null), [cards, today])
  if (!cards?.length) return null
  const due = countsText(dueCounts(cards, today))
  const mastered = cards.filter((c) => c.box >= MASTERED_BOX).length
  const bonus = mixDay !== today

  return (
    <section
      className={`mix-card ${back ? 'back' : ''}`}
      data-node={MIX_LESSON_ID}
      data-due={lesson ? 'yes' : 'no'}
      aria-label="Günün Karışımı"
    >
      <span className="mix-icon" aria-hidden>
        <Icon name="mix" size={40} />
      </span>
      <div className="mix-body">
        <h2>Günün Karışımı</h2>
        {lesson ? (
          <p>
            Tekrar zamanı gelenler: <b>{due}</b>
            {bonus && <span className="mix-bonus"> · +{MIX_XP} XP</span>}
          </p>
        ) : (
          <p>
            ✓ Bugün tekrar zamanı gelen kart yok.{' '}
            {nextDueText(cards, today) && <>Sıradakiler {nextDueText(cards, today)}.</>}
          </p>
        )}
        <p className="small muted">
          {cards.length} kart · {mastered} tanesi iyice oturdu
        </p>
      </div>
      {lesson && (
        <button className="btn btn-small" onClick={() => onStart(lesson)} aria-label="Günün Karışımı’nı başlat">
          Başla
        </button>
      )}
    </section>
  )
}
