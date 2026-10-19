// Oyun Salonu: pick a game, pick a skill, play. Games and skills open as the
// map's lessons are passed; each pair keeps its own record.

import { useEffect, useRef, useState } from 'react'
import { KIND_ICON } from './kindIcons'
import { ALL_LESSONS, findLesson } from '../progress/curriculum'
import type { NoteLesson } from '../games/noteHunter/lessons'
import {
  bestOf,
  gameOpen,
  isEndless,
  SALON_GAMES,
  salonId,
  salonLesson,
  type SalonGame,
  type SalonSkill,
  skillOpen,
  skillsOf,
} from '../games/salon/salon'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'

interface Props {
  onStart: (lesson: NoteLesson) => void
  onBack: () => void
  /** The game played last: it comes back selected. */
  last?: string
}

/** The first lesson of the kind, named when the game is still locked. */
const opener = (game: SalonGame) => ALL_LESSONS.find((l) => l.kind === game.kind)?.title

export function SalonScreen({ onStart, onBack, last }: Props) {
  const lessons = useProfile((s) => s.lessons)
  const records = useProfile((s) => s.salon)
  const testMode = useSettings((s) => s.testMode)
  const stars = (id: string) => (testMode ? 3 : (lessons[id]?.bestStars ?? 0))
  const [picked, setPicked] = useState<SalonGame | null>(() => {
    const kind = last?.match(/^salon-([a-z]+)-/)?.[1]
    return SALON_GAMES.find((g) => g.kind === kind) ?? null
  })
  const [skill, setSkill] = useState<string | null>(() => last?.replace(/^salon-[a-z]+-/, '') ?? null)
  // Chrome's scrollTo returns a promise, which React would take for a cleanup.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])
  // On a phone the skills sit under the games: bring them into view when a game is picked.
  const pickRef = useRef<HTMLElement>(null)
  const [tapped, setTapped] = useState(0)
  useEffect(() => {
    if (tapped) pickRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [tapped])

  const open = SALON_GAMES.filter((g) => gameOpen(g, ALL_LESSONS, stars))
  const skills = picked ? skillsOf(picked) : []
  const pickedOpen = picked !== null && open.includes(picked)
  const isSkillOpen = (s: SalonSkill) => skillOpen(s, stars, pickedOpen)
  const chosen = skills.find((s) => s.id === skill && isSkillOpen(s)) ?? skills.find(isSkillOpen)
  const lesson = picked && chosen ? salonLesson(picked, chosen, findLesson) : null

  return (
    <div className="salon">
      <header className="salon-top">
        <button className="icon-btn" onClick={onBack} aria-label="Haritaya dön">
          ✕
        </button>
        <div>
          <h1>🕹️ Oyun Salonu</h1>
          <p className="muted small">
            Sevdiğin oyunu açtığın bir beceriyle oyna. Canların bitene kadar puan topla, rekorunu geç!
          </p>
        </div>
      </header>

      <p className="small muted salon-count">
        {open.length}/{SALON_GAMES.length} oyun açık
      </p>
      <div className="salon-games">
        {SALON_GAMES.map((g) => {
          const isOpen = open.includes(g)
          const best = bestOf(g, records)
          return (
            <button
              key={g.kind}
              className={`salon-game ${picked === g ? 'on' : ''}`}
              data-game={g.kind}
              disabled={!isOpen}
              aria-pressed={picked === g}
              onClick={() => {
                setPicked(g)
                setSkill(null)
                setTapped((n) => n + 1)
              }}
            >
              <span className="salon-icon" aria-hidden>
                {isOpen ? KIND_ICON[g.kind] : '🔒'}
              </span>
              <b>{g.name}</b>
              <span className="small">
                {!isOpen
                  ? `“${opener(g)}” dersinde açılır`
                  : best > 0
                    ? `🏆 ${best}${isEndless(g) ? ' puan' : '%'}`
                    : isEndless(g)
                      ? 'Sonsuz oyun'
                      : 'Bir tur ritim'}
              </span>
            </button>
          )
        })}
      </div>

      {picked && (
        <section ref={pickRef} className="card salon-pick" aria-label={`${picked.name}: beceri seç`}>
          <h2>
            {KIND_ICON[picked.kind]} {picked.name}
          </h2>
          <p className="small muted">Hangi beceriyle oynayalım?</p>
          <div className="salon-skills">
            {skills.map((s) => {
              const ok = isSkillOpen(s)
              const rec = records[salonId(picked, s)]
              return (
                <button
                  key={s.id}
                  className={`chip salon-skill ${chosen === s ? 'on' : ''}`}
                  data-skill={s.id}
                  disabled={!ok}
                  aria-pressed={chosen === s}
                  title={ok ? undefined : `“${findLesson(s.source)?.title}” dersinde açılır`}
                  onClick={() => setSkill(s.id)}
                >
                  {ok ? '' : '🔒 '}
                  {s.title}
                  {rec?.best ? ` · 🏆 ${rec.best}${isEndless(picked) ? '' : '%'}` : ''}
                </button>
              )
            })}
          </div>
          {chosen && records[salonId(picked, chosen)] && (
            <p className="small muted">
              {records[salonId(picked, chosen)].plays} kez oynadın
              {records[salonId(picked, chosen)].bestCombo > 0 &&
                `, en uzun seri ${records[salonId(picked, chosen)].bestCombo}`}
              .
            </p>
          )}
          <button className="btn salon-play" disabled={!lesson} onClick={() => lesson && onStart(lesson)}>
            Oyna
          </button>
        </section>
      )}
    </div>
  )
}
