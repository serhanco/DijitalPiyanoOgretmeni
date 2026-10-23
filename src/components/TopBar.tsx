import { useState } from 'react'
import { currentStreak, dayKey, levelFromXp } from '../progress/gamification'
import { useProfile } from '../state/profile'
import { SettingsPanel } from './SettingsPanel'
import { Icon } from './icons/Icon'

interface Props {
  onProfile: () => void
  onCalibrate: () => void
  onSetup: () => void
  onUnits: () => void
  /** Tapping a stat chip explains it (the map shows the text in its toast). */
  onHint?: (text: string) => void
}

/** Ring that fills up as today's XP approaches the daily goal. */
export function GoalRing({ value, goal, size = 40 }: { value: number; goal: number; size?: number }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const frac = Math.min(1, value / goal)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="goal-ring" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} className="goal-ring-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className={`goal-ring-fg ${frac >= 1 ? 'done' : ''}`}
        strokeDasharray={`${c * frac} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

/** The map's top bar: sticks to the top of the screen while the map scrolls. */
export function TopBar({ onProfile, onCalibrate, onSetup, onUnits, onHint }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { totalXp, streak, daily, dailyGoal } = useProfile()
  const [today] = useState(() => dayKey(new Date()))
  const streakNow = currentStreak(streak, today)
  const xpToday = daily.day === today ? daily.xp : 0
  const { level, intoLevel, needed } = levelFromXp(totalXp)

  return (
    <div className="top-bar">
      <button
        className={`chip streak ${streak.lastDay === today ? 'lit' : ''}`}
        onClick={() =>
          onHint?.(
            streakNow > 0
              ? `Seri: ${streakNow} gündür her gün çalışıyorsun. Bugün bir ders yaparsan seri sürer.`
              : 'Seri: art arda kaç gün çalıştığın. Bugün bir ders yap, serin başlasın.',
          )
        }
      >
        <Icon name="streak" size={18} /> {streakNow}
      </button>
      <button className="chip xp" onClick={() => onHint?.(`XP: ders bitirerek kazandığın puan. Toplam ${totalXp} XP.`)}>
        <Icon name="xp" size={18} /> {totalXp}
      </button>
      <button
        className="chip goal"
        onClick={() =>
          onHint?.(`Günlük hedef: bugün ${xpToday} / ${dailyGoal} XP. Hedefi Ayarlar'dan değiştirebilirsin.`)
        }
      >
        <GoalRing value={xpToday} goal={dailyGoal} size={28} />
        {xpToday}/{dailyGoal}
      </button>
      <button
        className="chip level"
        onClick={onProfile}
        aria-label="Profil"
        title={`Seviye ${level}: ${intoLevel} / ${needed} XP`}
      >
        Sv. {level} <Icon name="profile" size={18} />
        <span className="level-bar" aria-hidden>
          <span style={{ width: `${Math.round((intoLevel / needed) * 100)}%` }} />
        </span>
      </button>
      <button className="chip units-btn" onClick={onUnits} aria-label="Üniteler">
        <Icon name="units" size={20} />
      </button>
      <button
        className="chip settings-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Ayarlar"
        aria-expanded={settingsOpen}
      >
        <Icon name="settings" size={20} />
      </button>
      {settingsOpen && (
        <SettingsPanel
          onCalibrate={() => {
            setSettingsOpen(false)
            onCalibrate()
          }}
          onSetup={() => {
            setSettingsOpen(false)
            onSetup()
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
