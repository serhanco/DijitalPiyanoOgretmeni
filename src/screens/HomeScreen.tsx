import { MidiPanel } from '../components/MidiPanel'
import { type NoteLesson, TREBLE_LESSONS } from '../games/noteHunter/lessons'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'

interface Props {
  onStart: (lesson: NoteLesson) => void
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

export function HomeScreen({ onStart }: Props) {
  const progress = useProgress((s) => s.lessons)
  const settings = useSettings()

  return (
    <div className="home">
      <header className="hero">
        <div className="logo" aria-hidden>
          🎹
        </div>
        <div>
          <h1>Dijital Piyano Öğretmeni</h1>
          <p className="muted">Nota Avcısı: notayı gör, doğru tuşa bas.</p>
        </div>
      </header>

      <MidiPanel />

      <h2 className="section-title">Sol anahtarı</h2>
      <div className="lesson-list">
        {TREBLE_LESSONS.map((lesson, i) => {
          const p = progress[lesson.id]
          return (
            <button key={lesson.id} className="lesson" onClick={() => onStart(lesson)}>
              <span className="lesson-num">{i + 1}</span>
              <span className="lesson-text">
                <b>{lesson.title}</b>
                <span className="muted small">{lesson.description}</span>
              </span>
              <span className="lesson-stars" aria-label={`${p?.bestStars ?? 0} yıldız`}>
                {[1, 2, 3].map((s) => (
                  <span key={s} className={s <= (p?.bestStars ?? 0) ? 'on' : ''}>
                    ★
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <details className="card settings">
        <summary>Ayarlar</summary>
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
    </div>
  )
}
