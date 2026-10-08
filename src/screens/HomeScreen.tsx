import { useEffect, useLayoutEffect, useState } from 'react'
import { Greeting } from '../components/Greeting'
import { MidiPanel } from '../components/MidiPanel'
import { TopBar } from '../components/TopBar'
import type { LessonKind, NoteLesson } from '../games/noteHunter/lessons'
import { type Clef, CLEF_NAMES } from '../music/notes'
import { buildReviewLesson, isUnlocked, UNITS, weakestNotes } from '../progress/curriculum'
import { noteScores } from '../progress/history'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'
import { BackupPanel } from '../testing/BackupPanel'

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
        requestAnimationFrame(() => window.scrollTo({ top: target, behavior: 'smooth' }))
      }
    }
    // The next screen (a lesson, the profile) opens at its top.
    return () => {
      savedScroll = window.scrollY
      window.scrollTo(0, 0)
    }
  }, [focus])
}

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
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  )
}

function Settings({ onCalibrate }: { onCalibrate: () => void }) {
  const settings = useSettings()
  const { dailyGoal, setDailyGoal } = useProfile()
  return (
    <details className="card settings">
      <summary>Ayarlar</summary>
      <div className="goal-picker">
        <span>Günlük hedef</span>
        {[10, 20, 30, 50].map((xp) => (
          <button key={xp} className={`pill ${dailyGoal === xp ? 'on' : ''}`} onClick={() => setDailyGoal(xp)}>
            {xp} XP
          </button>
        ))}
      </div>
      <div className="goal-picker">
        <span>Ritim gecikmesi</span>
        <button className="pill" onClick={onCalibrate}>
          ⏱ Ölç ve ayarla
        </button>
      </div>
      <Toggle
        label="Rahat mod: hata yapınca can gitmesin"
        checked={settings.relaxedMode}
        onChange={(v) => settings.set({ relaxedMode: v })}
      />
      <Toggle
        label="Ses efektleri"
        checked={settings.soundEffects}
        onChange={(v) => settings.set({ soundEffects: v })}
      />
      <Toggle
        label="Teori kartlarını ve soruları sesli oku"
        checked={settings.narration}
        onChange={(v) => settings.set({ narration: v })}
      />
      <Toggle
        label="Titreşim (Android)"
        checked={settings.vibration}
        onChange={(v) => settings.set({ vibration: v })}
      />
      <Toggle
        label="Ekran klavyesinde nota adlarını göster"
        checked={settings.showKeyLabels}
        onChange={(v) => settings.set({ showKeyLabels: v })}
      />
      <Toggle
        label="Ekran ve bilgisayar klavyesi için ses"
        checked={settings.soundForScreen}
        onChange={(v) => settings.set({ soundForScreen: v })}
      />
      <Toggle
        label="MIDI klavye için de uygulamadan ses çal (Akai gibi sessiz klavyelerde hep açık)"
        checked={settings.soundForMidi}
        onChange={(v) => settings.set({ soundForMidi: v })}
      />
      <Toggle
        label="Oktav fark etmesin (küçük klavyeler için)"
        checked={settings.ignoreOctave}
        onChange={(v) => settings.set({ ignoreOctave: v })}
      />
      <Toggle
        label="Test modu: bütün dersler açık, her ekranda 📝 not düğmesi"
        checked={settings.testMode}
        onChange={(v) => settings.set({ testMode: v })}
      />
      <BackupPanel />
    </details>
  )
}

export function HomeScreen({ onStart, onProfile, onCalibrate, focus }: Props) {
  const lessons = useProfile((s) => s.lessons)
  const testMode = useSettings((s) => s.testMode)
  const bestStars = (id: string) => lessons[id]?.bestStars ?? 0
  const unlockedLesson = (id: string) => testMode || isUnlocked(id, bestStars)
  const [weak, setWeak] = useState<Record<Clef, number[]>>({ treble: [], bass: [] })
  const [toast, setToast] = useState<string | null>(null)
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
  const current = UNITS.flatMap((u) => u.lessons).find((l) => unlockedLesson(l.id) && bestStars(l.id) === 0)

  return (
    <div className="home">
      <TopBar onProfile={onProfile} />
      {testMode && (
        <p className="test-banner">
          🧪 <b>Test modu açık:</b> bütün dersler açık. Bir şey görünce sağdaki 📝 ile not bırak.
        </p>
      )}
      <Greeting />
      <MidiPanel />

      {UNITS.map((unit) => {
        // A unit waiting for another one (Başlangıç) says so on its banner.
        const waiting = !!unit.requires && !unlockedLesson(unit.lessons[0].id)
        const requiredTitle = UNITS.find((u) => u.id === unit.requires)?.title
        return (
          <section
            key={unit.id}
            className={`unit ${unit.comingSoon ? 'soon' : ''}`}
            data-waiting={waiting || undefined}
          >
            <header className="unit-banner" style={{ background: unit.comingSoon ? undefined : unit.color }}>
              <h2>{unit.title}</h2>
              <p>{unit.comingSoon ? 'Yakında' : unit.subtitle}</p>
              {waiting && <p className="unit-lock">🔒 {requiredTitle} bitince açılır</p>}
            </header>

            {unit.id === 'rhythm' && (
              <button className="calib-tip" onClick={onCalibrate}>
                ⏱ Bluetooth piyanoyla mı çalışıyorsun? Önce <b>gecikme ayarını</b> yap.
              </button>
            )}

            {!unit.comingSoon && (
              <div className="path">
                {unit.lessons.map((lesson, i) => {
                  const unlocked = unlockedLesson(lesson.id)
                  const stars = bestStars(lesson.id)
                  const isCurrent = current?.id === lesson.id
                  return (
                    <div
                      key={lesson.id}
                      className={`path-step ${focus === lesson.id ? 'back' : ''}`}
                      data-node={lesson.id}
                      style={{ transform: `translateX(${ZIGZAG[i % ZIGZAG.length]}px)` }}
                    >
                      {isCurrent && <span className="start-bubble">BAŞLA</span>}
                      <button
                        className={`node ${unlocked ? 'open' : 'locked'} ${stars === 3 ? 'gold' : ''} ${isCurrent ? 'current' : ''}`}
                        style={unlocked ? ({ '--node': unit.color } as React.CSSProperties) : undefined}
                        onClick={() =>
                          unlocked
                            ? onStart(lesson)
                            : setToast(
                                i === 0 && waiting
                                  ? `Bu ünite ${requiredTitle} ünitesinin bütün dersleri bitince açılır.`
                                  : 'Bu dersi açmak için önceki dersi en az 1 yıldızla bitir.',
                              )
                        }
                        aria-label={`${lesson.title}${unlocked ? '' : ' (kilitli)'}`}
                      >
                        {unlocked ? (stars === 3 ? '👑' : KIND_ICON[lesson.kind ?? 'drill']) : '🔒'}
                      </button>
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
                })}

                {unit.review &&
                  (() => {
                    const clef = unit.lessons[0].clef
                    const notes = weak[clef]
                    return (
                      <div
                        className={`path-step ${focus === `review-${clef}` ? 'back' : ''}`}
                        data-node={`review-${clef}`}
                        style={{ transform: `translateX(${ZIGZAG[unit.lessons.length % ZIGZAG.length]}px)` }}
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
              </div>
            )}
          </section>
        )
      })}

      <Settings onCalibrate={onCalibrate} />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
