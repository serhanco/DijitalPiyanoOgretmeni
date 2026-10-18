import { useEffect, useLayoutEffect, useState } from 'react'
import { Greeting } from '../components/Greeting'
import { DailyMixCard } from '../components/DailyMixCard'
import { HomeShortcuts } from '../components/HomeShortcuts'
import { MidiPanel } from '../components/MidiPanel'
import { QuestBoard } from '../components/QuestBoard'
import { LessonPeek } from '../components/LessonPeek'
import { LastWeekCard } from '../components/WeekSummary'
import { MIX_LESSON_ID } from '../progress/mix'
import { TopBar } from '../components/TopBar'
import { UnitNav, type UnitRow } from '../components/UnitNav'
import type { LessonKind, NoteLesson } from '../games/noteHunter/lessons'
import { type Clef, CLEF_NAMES } from '../music/notes'
import { buildReviewLesson, isUnlocked, mapNodeOf, UNITS, weakestNotes } from '../progress/curriculum'
import { noteScores } from '../progress/history'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'

interface Props {
  onStart: (lesson: NoteLesson) => void
  onProfile: () => void
  onCalibrate: () => void
  /** The node of the lesson the learner comes back from (`mapNodeOf` in curriculum): the map scrolls to it. */
  focus?: string
}

/** Where the map was scrolled when it was left, for coming back from the profile or the calibration. */
let savedScroll: number | null = null

/**
 * Back from a lesson, the map glides to the lesson's node and centres it: a jump to just above
 * it, then a smooth scroll over the last stretch so the eye follows. Without motion it jumps.
 * Without a lesson (profile, calibration) the map is where it was left.
 */
function useMapScroll(focus: string | undefined) {
  useLayoutEffect(() => {
    const node = focus ? document.querySelector<HTMLElement>(`[data-node="${CSS.escape(focus)}"]`) : null
    if (!node) {
      if (savedScroll !== null) window.scrollTo(0, savedScroll)
    } else {
      const r = node.getBoundingClientRect()
      const target = Math.max(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2)
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, target)
      else {
        window.scrollTo(0, Math.max(0, target - window.innerHeight * 0.4))
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    }
    // The next screen (a lesson, the profile) opens at its top.
    return () => {
      savedScroll = window.scrollY
      window.scrollTo(0, 0)
    }
  }, [focus])
}

/** A wide window (desktop) puts the quests and the keyboard in a side panel instead of two short cards. */
const WIDE = '(min-width: 1100px)'
function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE)
    if (!mq) return
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

/** Finished units that the learner opened again, kept while the app runs. */
const openedUnits = new Set<string>()

/** Horizontal offsets that make the lesson path zigzag, Duolingo style. */
const ZIGZAG = [0, 56, 84, 56, 0, -56, -84, -56]
const REVIEW_NOTE_COUNT = 4
const KIND_ICON: Record<LessonKind, string> = {
  theory: '📖',
  drill: '♪',
  melody: '🎶',
  bird: '🐦',
  bar: '🍹',
  balloon: '🎈',
  rhythm: '🎵',
  dino: '🦖',
  drum: '🥁',
  scale: '🎹',
  ladder: '🪜',
  memory: '🧠',
  chord: '🎼',
  chef: '🍳',
  space: '🚀',
  chordbar: '🍸',
  arpeggio: '〰️',
  surf: '🏄',
  ear: '🔍',
  waterfall: '🌊',
  boss: '👾',
  mix: '🔀',
}

export function HomeScreen({ onStart, onProfile, onCalibrate, focus }: Props) {
  const lessons = useProfile((s) => s.lessons)
  const testMode = useSettings((s) => s.testMode)
  const bestStars = (id: string) => lessons[id]?.bestStars ?? 0
  const unlockedLesson = (id: string) => testMode || isUnlocked(id, bestStars)
  const [weak, setWeak] = useState<Record<Clef, number[]>>({ treble: [], bass: [] })
  const [toast, setToast] = useState<string | null>(null)
  const [peek, setPeek] = useState<NoteLesson | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const wide = useWide()
  const [, rerender] = useState(0)
  useMapScroll(focus)

  useEffect(() => {
    let alive = true
    const weakOf = (scores: Awaited<ReturnType<typeof noteScores>>) =>
      scores.length >= REVIEW_NOTE_COUNT ? weakestNotes(scores, REVIEW_NOTE_COUNT) : []
    Promise.all([noteScores('treble'), noteScores('bass')])
      .then(([treble, bass]) => alive && setWeak({ treble: weakOf(treble), bass: weakOf(bass) }))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // The first unlocked lesson without stars is where the learner is.
  // Bosses are a side challenge: they wave their own bubble.
  const current = UNITS.flatMap((u) => u.lessons).find(
    (l) => l.kind !== 'boss' && unlockedLesson(l.id) && bestStars(l.id) === 0,
  )

  // A finished unit (boss included) folds into its banner; test mode and a lesson just left keep it open.
  const finished = (unit: (typeof UNITS)[number]) =>
    !testMode &&
    !unit.comingSoon &&
    unit.lessons.every((l) => bestStars(l.id) > 0) &&
    !unit.lessons.some((l) => mapNodeOf(l) === focus || l.id === focus)
  const stars = (unit: (typeof UNITS)[number]) => unit.lessons.reduce((n, l) => n + bestStars(l.id), 0)
  const folded = (unit: (typeof UNITS)[number]) => finished(unit) && !openedUnits.has(unit.id)
  const toggleUnit = (id: string) => {
    if (openedUnits.has(id)) openedUnits.delete(id)
    else openedUnits.add(id)
    rerender((n) => n + 1)
  }
  const unitRows: UnitRow[] = UNITS.map((u) => ({
    id: u.id,
    title: u.title,
    color: u.color,
    done: u.lessons.filter((l) => bestStars(l.id) > 0).length,
    total: u.lessons.length,
    locked: !!u.requires && !unlockedLesson(u.lessons[0].id),
    soon: !!u.comingSoon,
  }))
  const jumpTo = (id: string) => {
    openedUnits.add(id)
    setNavOpen(false)
    rerender((n) => n + 1)
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-unit="${CSS.escape(id)}"]`)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - 76
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
    })
  }

  return (
    <div className={`home ${wide ? 'wide' : ''}`}>
      <TopBar onProfile={onProfile} onCalibrate={onCalibrate} onUnits={() => setNavOpen(true)} onHint={setToast} />
      {wide && (
        <aside className="home-side" aria-label="Günlük özet">
          <QuestBoard />
          <MidiPanel />
        </aside>
      )}
      {testMode && (
        <p className="test-banner">
          🧪 <b>Test modu açık:</b> bütün dersler açık. Bir şey görünce sağdaki 📝 ile not bırak.
        </p>
      )}
      <Greeting />
      <LastWeekCard />
      <DailyMixCard onStart={onStart} back={focus === MIX_LESSON_ID} />
      {!wide && <HomeShortcuts />}

      {UNITS.map((unit) => {
        // A unit waiting for another one (Başlangıç) says so on its banner.
        const waiting = !!unit.requires && !unlockedLesson(unit.lessons[0].id)
        const requiredTitle = UNITS.find((u) => u.id === unit.requires)?.title
        // The weak-notes review comes before the boss, the unit's last node.
        const path = unit.lessons.filter((l) => l.kind !== 'boss')
        const boss = unit.lessons.find((l) => l.kind === 'boss')
        const node = (lesson: NoteLesson, i: number) => {
          const unlocked = unlockedLesson(lesson.id)
          const stars = bestStars(lesson.id)
          const isCurrent = current?.id === lesson.id
          const isBoss = lesson.kind === 'boss'
          return (
            <div
              key={lesson.id}
              className={`path-step ${focus === lesson.id ? 'back' : ''} ${isBoss ? 'boss-step-node' : ''}`}
              data-node={lesson.id}
              style={{ transform: `translateX(${isBoss ? 0 : ZIGZAG[i % ZIGZAG.length]}px)` }}
            >
              {(isCurrent || (isBoss && isUnlocked(lesson.id, bestStars) && stars === 0)) && (
                <span className={`start-bubble ${isBoss ? 'boss' : ''}`}>{isBoss ? 'BOSS!' : 'BAŞLA'}</span>
              )}
              <span className="node-wrap">
                <button
                  className={`node ${isBoss ? 'boss' : ''} ${unlocked ? 'open' : 'locked'} ${stars === 3 ? 'gold' : ''} ${isCurrent ? 'current' : ''}`}
                  style={unlocked ? ({ '--node': unit.color } as React.CSSProperties) : undefined}
                  onClick={() =>
                    unlocked
                      ? setPeek(lesson)
                      : setToast(
                          i === 0 && waiting
                            ? `Bu ünite ${requiredTitle} ünitesinin bütün dersleri bitince açılır.`
                            : isBoss
                              ? 'Boss, ünitenin son dersi bir yıldızla bitince açılır.'
                              : 'Bu dersi açmak için önceki dersi en az 1 yıldızla bitir.',
                        )
                  }
                  aria-label={`${lesson.title}${unlocked ? '' : ' (kilitli)'}`}
                >
                  {unlocked ? KIND_ICON[lesson.kind ?? 'drill'] : '🔒'}
                </button>
                {unlocked && stars > 0 && (
                  <span className={`medal m${stars}`} aria-hidden>
                    {stars === 3 ? (isBoss ? '🏆' : '👑') : stars === 2 ? '★★' : '★'}
                  </span>
                )}
              </span>
              <span className="node-title">{lesson.title}</span>
              <span className="node-stars" aria-label={`${stars} yıldız`}>
                {[1, 2, 3].map((s) => (
                  <span key={s} className={s <= stars ? 'on' : ''}>
                    ★
                  </span>
                ))}
              </span>
            </div>
          )
        }
        return (
          <section
            key={unit.id}
            className={`unit ${unit.comingSoon ? 'soon' : ''}`}
            data-unit={unit.id}
            data-waiting={waiting || undefined}
            data-folded={folded(unit) || undefined}
          >
            <header className="unit-banner" style={{ background: unit.comingSoon ? undefined : unit.color }}>
              <h2>{unit.title}</h2>
              <p>{unit.comingSoon ? 'Yakında' : unit.subtitle}</p>
              {!unit.comingSoon && !waiting && (
                <p className="unit-progress" aria-label={`${stars(unit)} / ${unit.lessons.length * 3} yıldız`}>
                  <span className="unit-progress-bar" aria-hidden>
                    <span style={{ width: `${(stars(unit) / (unit.lessons.length * 3)) * 100}%` }} />
                  </span>
                  <span>
                    {finished(unit) ? '🏅 ' : ''}★ {stars(unit)}/{unit.lessons.length * 3}
                  </span>
                </p>
              )}
              {waiting && <p className="unit-lock">🔒 {requiredTitle} bitince açılır</p>}
              {finished(unit) && (
                <button
                  className="unit-fold"
                  onClick={() => toggleUnit(unit.id)}
                  aria-expanded={!folded(unit)}
                  data-unit-fold={unit.id}
                >
                  {folded(unit) ? '✓ Bitti · aç' : 'Katla'}
                </button>
              )}
            </header>

            {(unit.id === 'rhythm' || unit.id === 'rhythm2') && !folded(unit) && (
              <button className="calib-tip" onClick={onCalibrate}>
                ⏱ Bluetooth piyanoyla mı çalışıyorsun? Önce <b>gecikme ayarını</b> yap.
              </button>
            )}

            {!unit.comingSoon && !folded(unit) && (
              <div className="path">
                {path.map(node)}

                {unit.review &&
                  (() => {
                    const clef = unit.lessons[0].clef
                    const notes = weak[clef]
                    return (
                      <div
                        className={`path-step ${focus === `review-${clef}` ? 'back' : ''}`}
                        data-node={`review-${clef}`}
                        style={{ transform: `translateX(${ZIGZAG[path.length % ZIGZAG.length]}px)` }}
                      >
                        <button
                          className={`node review ${notes.length ? 'open' : 'locked'}`}
                          onClick={() =>
                            notes.length
                              ? onStart(buildReviewLesson(clef, notes))
                              : setToast('Birkaç ders bitirince zayıf notalarını burada çalışabilirsin.')
                          }
                          aria-label={`Zayıf notalar tekrarı (${CLEF_NAMES[clef]})`}
                        >
                          🏋️
                        </button>
                        <span className="node-title">Zayıf Notalar</span>
                      </div>
                    )
                  })()}
                {boss && node(boss, path.length)}
              </div>
            )}
          </section>
        )
      })}

      {peek && (
        <LessonPeek
          lesson={peek}
          icon={KIND_ICON[peek.kind ?? 'drill']}
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
      {navOpen && <UnitNav rows={unitRows} onPick={jumpTo} onClose={() => setNavOpen(false)} />}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
