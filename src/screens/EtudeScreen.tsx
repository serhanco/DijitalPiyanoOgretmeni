// Etüt Kitaplığı: the levels of classical pieces, each lesson opening after
// the one before it. A tap shows the lesson card, as on the map.

import { useEffect, useState } from 'react'
import { FoldCapsule } from '../components/FoldCapsule'
import { foldPath } from '../progress/mapFold'
import { LessonPeek } from '../components/LessonPeek'
import { ETUDE_LEVELS, etudeOpen } from '../games/etudes/lessons'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'
import { Icon } from '../components/icons/Icon'

interface Props {
  onStart: (lesson: NoteLesson) => void
  onBack: () => void
  /** The lesson played last: the list comes back at it. */
  last?: string
}

/** Folds of finished lessons the learner opened, kept while the app runs. */
const openedFolds = new Set<string>()

export function EtudeScreen({ onStart, onBack, last }: Props) {
  const lessons = useProfile((s) => s.lessons)
  const testMode = useSettings((s) => s.testMode)
  const bestStars = (id: string) => lessons[id]?.bestStars ?? 0
  const open = (id: string) => testMode || etudeOpen(id, bestStars)
  const [peek, setPeek] = useState<NoteLesson | null>(null)
  const [, rerender] = useState(0)
  const toggleFold = (id: string) => {
    if (openedFolds.has(id)) openedFolds.delete(id)
    else openedFolds.add(id)
    rerender((n) => n + 1)
  }
  // Finished lessons in a row fold as on the map; the next lesson and the one just played stay in sight.
  const next = ETUDE_LEVELS.flatMap((l) => l.lessons).find((l) => open(l.id) && bestStars(l.id) === 0)

  useEffect(() => {
    const row = last && document.querySelector(`[data-etude="${last}"]`)
    if (row) row.scrollIntoView({ block: 'center' })
    else window.scrollTo({ top: 0 })
  }, [last])

  return (
    <div className="salon etudes">
      <header className="salon-top">
        <button className="icon-btn" onClick={onBack} aria-label="Haritaya dön">
          ✕
        </button>
        <div>
          <h1>
            <Icon name="etudes" size={36} /> Etüt Kitaplığı
          </h1>
          <p className="muted small">
            Gerçek bestecilerin parçaları, kısa cümlelerle: önce her el ayrı, sonra iki elle, en son metronomla. Hepsi
            kamu malı eski baskılardan.
          </p>
        </div>
      </header>

      {ETUDE_LEVELS.map((level) => {
        const done = level.lessons.filter((l) => bestStars(l.id) >= 1).length
        return (
          <section key={level.level} className="card etude-level" data-level={level.level}>
            <h2>
              Seviye {level.level}: {level.title}
            </h2>
            <p className="small muted">
              {level.text} · {done}/{level.lessons.length}
            </p>
            <ol className="etude-list">
              {(testMode
                ? level.lessons.map((lesson) => ({ kind: 'node' as const, lesson }))
                : foldPath(
                    level.lessons,
                    (l) => bestStars(l.id) > 0,
                    (l) => l.id === last || l.id === next?.id,
                    openedFolds,
                  )
              ).map((item) => {
                if (item.kind !== 'node')
                  return (
                    <li key={item.id}>
                      <FoldCapsule
                        id={item.id}
                        lessons={item.lessons}
                        folded={item.kind === 'fold'}
                        stars={bestStars}
                        onToggle={() => toggleFold(item.id)}
                      />
                    </li>
                  )
                const l = item.lesson
                const ok = open(l.id)
                const stars = bestStars(l.id)
                return (
                  <li key={l.id}>
                    <button
                      className={`etude-row ${l.id === last ? 'back' : ''}`}
                      aria-label={l.title}
                      data-etude={l.id}
                      disabled={!ok}
                      onClick={() => setPeek(l)}
                    >
                      <span className="etude-icon" aria-hidden>
                        <Icon name={ok ? (l.kind ?? 'drill') : 'lock'} size={34} />
                      </span>
                      <span className="etude-text">
                        <b>{l.title}</b>
                        <span className="small muted">{l.description}</span>
                      </span>
                      <span className="etude-stars" aria-label={`${stars} yıldız`}>
                        {'★'.repeat(stars)}
                        <span className="muted">{'★'.repeat(3 - stars)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}

      {peek && (
        <LessonPeek
          lesson={peek}
          stars={bestStars(peek.id)}
          bestAccuracy={lessons[peek.id] ? lessons[peek.id].bestAccuracy : null}
          plays={lessons[peek.id]?.plays ?? 0}
          onStart={() => {
            setPeek(null)
            onStart(peek)
          }}
          onClose={() => setPeek(null)}
        />
      )}
    </div>
  )
}
