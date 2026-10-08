import { useState } from 'react'
import { currentStreak, dayKey, levelFromXp } from '../progress/gamification'
import { useProfile } from '../state/profile'
import { SettingsPanel } from './SettingsPanel'

interface Props {
  onProfile: () => void
  onCalibrate: () => void
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
export function TopBar({ onProfile, onCalibrate }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { totalXp, streak, daily, dailyGoal } = useProfile()
  const [today] = useState(() => dayKey(new Date()))
  const streakNow = currentStreak(streak, today)
  const xpToday = daily.day === today ? daily.xp : 0
  const { level } = levelFromXp(totalXp)

  return (
    <div className="top-bar">
      <span className={`chip streak ${streak.lastDay === today ? 'lit' : ''}`} title="Günlük seri">
        🔥 {streakNow}
      </span>
      <span className="chip xp" title="Toplam XP">
        ⚡ {totalXp}
      </span>
      <span className="chip goal" title={`Günlük hedef: ${xpToday}/${dailyGoal} XP`}>
        <GoalRing value={xpToday} goal={dailyGoal} size={28} />
        {xpToday}/{dailyGoal}
      </span>
      <button className="chip level" onClick={onProfile} aria-label="Profil">
        Sv. {level} 👤
      </button>
      <button
        className="chip settings-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Ayarlar"
        aria-expanded={settingsOpen}
      >
        ⚙️
      </button>
      {settingsOpen && (
        <SettingsPanel
          onCalibrate={() => {
            setSettingsOpen(false)
            onCalibrate()
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
