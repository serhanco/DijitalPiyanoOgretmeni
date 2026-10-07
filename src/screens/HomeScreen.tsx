import { useEffect, useState } from 'react'
import { MidiPanel } from '../components/MidiPanel'
import { TopBar } from '../components/TopBar'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { buildReviewLesson, isUnlocked, UNITS, weakestNotes } from '../progress/curriculum'
import { noteScores } from '../progress/history'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'

interface Props {
  onStart: (lesson: NoteLesson) => void
  onProfile: () => void
}

/** Horizontal offsets that make the lesson path zigzag, Duolingo style. */
const ZIGZAG = [0, 56, 84, 56, 0, -56, -84, -56]
const REVIEW_NOTE_COUNT = 4

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  )
}

function Settings() {
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
      <Toggle
        label="Rahat mod: hata yapınca can gitmesin"
        checked={settings.relaxedMode}
        onChange={(v) => settings.set({ relaxedMode: v })}
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
        label="MIDI klavye için de uygulamadan ses çal (piyanon ses çıkarmıyorsa)"
        checked={settings.soundForMidi}
        onChange={(v) => settings.set({ soundForMidi: v })}
      />
      <Toggle
        label="Oktav fark etmesin (küçük klavyeler için)"
        checked={settings.ignoreOctave}
        onChange={(v) => settings.set({ ignoreOctave: v })}
      />
    </details>
  )
}

export function HomeScreen({ onStart, onProfile }: Props) {
  const lessons = useProfile((s) => s.lessons)
  const bestStars = (id: string) => lessons[id]?.bestStars ?? 0
  const [weak, setWeak] = useState<number[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    noteScores('treble')
      .then(
        (scores) => alive && setWeak(scores.length >= REVIEW_NOTE_COUNT ? weakestNotes(scores, REVIEW_NOTE_COUNT) : []),
      )
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
  const current = UNITS.flatMap((u) => u.lessons).find((l) => isUnlocked(l.id, bestStars) && bestStars(l.id) === 0)

  return (
    <div className="home">
      <TopBar onProfile={onProfile} />
      <MidiPanel />

      {UNITS.map((unit) => (
        <section key={unit.id} className={`unit ${unit.comingSoon ? 'soon' : ''}`}>
          <header className="unit-banner" style={{ background: unit.comingSoon ? undefined : unit.color }}>
            <h2>{unit.title}</h2>
            <p>{unit.comingSoon ? 'Yakında' : unit.subtitle}</p>
          </header>

          {!unit.comingSoon && (
            <div className="path">
              {unit.lessons.map((lesson, i) => {
                const unlocked = isUnlocked(lesson.id, bestStars)
                const stars = bestStars(lesson.id)
                const isCurrent = current?.id === lesson.id
                return (
                  <div
                    key={lesson.id}
                    className="path-step"
                    style={{ transform: `translateX(${ZIGZAG[i % ZIGZAG.length]}px)` }}
                  >
                    {isCurrent && <span className="start-bubble">BAŞLA</span>}
                    <button
                      className={`node ${unlocked ? 'open' : 'locked'} ${stars === 3 ? 'gold' : ''} ${isCurrent ? 'current' : ''}`}
                      style={unlocked ? ({ '--node': unit.color } as React.CSSProperties) : undefined}
                      onClick={() =>
                        unlocked
                          ? onStart(lesson)
                          : setToast('Bu dersi açmak için önceki dersi en az 1 yıldızla bitir.')
                      }
                      aria-label={`${lesson.title}${unlocked ? '' : ' (kilitli)'}`}
                    >
                      {unlocked ? (stars === 3 ? '👑' : '♪') : '🔒'}
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

              <div
                className="path-step"
                style={{ transform: `translateX(${ZIGZAG[unit.lessons.length % ZIGZAG.length]}px)` }}
              >
                <button
                  className={`node review ${weak.length ? 'open' : 'locked'}`}
                  onClick={() =>
                    weak.length
                      ? onStart(buildReviewLesson(unit.lessons[0].clef, weak))
                      : setToast('Birkaç ders bitirince zayıf notalarını burada çalışabilirsin.')
                  }
                  aria-label="Zayıf notalar tekrarı"
                >
                  🏋️
                </button>
                <span className="node-title">Zayıf Notalar</span>
              </div>
            </div>
          )}
        </section>
      ))}

      <Settings />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
