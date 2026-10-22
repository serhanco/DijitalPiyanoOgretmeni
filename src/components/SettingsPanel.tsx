import { useEffect } from 'react'
import { useProfile } from '../state/profile'
import { type ThemeChoice, useSettings } from '../state/settings'
import { BackupPanel } from '../testing/BackupPanel'
import { InstallPanel } from './InstallPanel'

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  )
}

const THEMES: [ThemeChoice, string][] = [
  ['system', '📱 Sistem'],
  ['light', '☀️ Açık'],
  ['dark', '🌙 Koyu'],
]

interface Props {
  onCalibrate: () => void
  onSetup: () => void
  onClose: () => void
}

/** The settings sheet, opened from the ⚙️ button in the top bar; closes on ✕, Escape or a tap outside. */
export function SettingsPanel({ onCalibrate, onSetup, onClose }: Props) {
  const settings = useSettings()
  const { dailyGoal, setDailyGoal } = useProfile()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="settings-sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="card settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-head">
          <h2 id="settings-title">⚙️ Ayarlar</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Ayarları kapat">
            ✕
          </button>
        </header>
        <h3 className="settings-group">Ders</h3>
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
          label="İpucu parıltısı: takılınca doğru tuş parlasın"
          checked={settings.hintGlow}
          onChange={(v) => settings.set({ hintGlow: v })}
        />
        <h3 className="settings-group">Görünüm</h3>
        <div className="goal-picker" role="radiogroup" aria-label="Tema">
          <span>Tema</span>
          {THEMES.map(([value, label]) => (
            <button
              key={value}
              className={`pill ${settings.theme === value ? 'on' : ''}`}
              role="radio"
              aria-checked={settings.theme === value}
              data-theme-choice={value}
              onClick={() => settings.set({ theme: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <h3 className="settings-group">Ses</h3>
        <Toggle
          label="Ses efektleri"
          checked={settings.soundEffects}
          onChange={(v) => settings.set({ soundEffects: v })}
        />
        <Toggle
          label="Oyun müziği: doğru notalar seri uzadıkça katman katman eşlik kazansın"
          checked={settings.musicLayers}
          onChange={(v) => settings.set({ musicLayers: v })}
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
          label="Ekran ve bilgisayar klavyesi için ses"
          checked={settings.soundForScreen}
          onChange={(v) => settings.set({ soundForScreen: v })}
        />
        <h3 className="settings-group">Klavye ve MIDI</h3>
        <div className="goal-picker">
          <span>Piyanonu bağla</span>
          <button className="pill" onClick={onSetup} data-open-setup>
            🎹 Adım adım kontrol
          </button>
        </div>
        <div className="goal-picker">
          <span>Ritim gecikmesi</span>
          <button className="pill" onClick={onCalibrate}>
            ⏱ Ölç ve ayarla
          </button>
        </div>
        <Toggle
          label="Ekran klavyesinde nota adlarını göster"
          checked={settings.showKeyLabels}
          onChange={(v) => settings.set({ showKeyLabels: v })}
        />
        <Toggle
          label="MIDI klavye için de uygulamadan ses çal (Akai gibi sessiz klavyelerde hep açık)"
          checked={settings.soundForMidi}
          onChange={(v) => settings.set({ soundForMidi: v })}
        />
        <Toggle
          label="Örnek notaları piyanodan çal (Yankı, hafıza ve kulak derslerinde; piyanonun MIDI çıkışı varsa)"
          checked={settings.demoOnPiano}
          onChange={(v) => settings.set({ demoOnPiano: v })}
        />
        <Toggle
          label="Oktav fark etmesin (küçük klavyeler için)"
          checked={settings.ignoreOctave}
          onChange={(v) => settings.set({ ignoreOctave: v })}
        />
        <h3 className="settings-group">Uygulama</h3>
        <InstallPanel />
        <h3 className="settings-group">Gelişmiş</h3>
        <Toggle
          label="Test modu: bütün dersler açık, her ekranda 📝 not düğmesi"
          checked={settings.testMode}
          onChange={(v) => settings.set({ testMode: v })}
        />
        <BackupPanel />
      </section>
    </div>
  )
}
