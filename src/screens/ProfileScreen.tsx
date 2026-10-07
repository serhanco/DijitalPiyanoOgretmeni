import { useEffect, useState } from 'react'
import type { SessionRow } from '../progress/db'
import { findLesson, REVIEW_LESSON_ID } from '../progress/curriculum'
import { BADGES, currentStreak, dayKey, levelFromXp } from '../progress/gamification'
import { noteScores, recentSessions } from '../progress/history'
import { solfegeName } from '../music/notes'
import { useProfile } from '../state/profile'

interface Props {
  onBack: () => void
}

type Score = Awaited<ReturnType<typeof noteScores>>[number]

function heatColor(accuracy: number): string {
  // Red → amber → green.
  const hue = Math.round(accuracy * 120)
  return `hsl(${hue} 75% 48%)`
}

export function ProfileScreen({ onBack }: Props) {
  const { totalXp, streak, lessonsCompleted, badges } = useProfile()
  const { level, intoLevel, needed } = levelFromXp(totalXp)
  const [today] = useState(() => dayKey(new Date()))
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [scores, setScores] = useState<Score[]>([])

  useEffect(() => {
    let alive = true
    Promise.all([recentSessions(8), noteScores('treble')])
      .then(([s, n]) => {
        if (!alive) return
        setSessions(s)
        setScores(n)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="profile">
      <header className="game-top">
        <button className="icon-btn" onClick={onBack} aria-label="Geri">
          ←
        </button>
        <h1>Profilim</h1>
      </header>

      <section className="card level-card">
        <div className="level-badge">{level}</div>
        <div className="level-info">
          <b>Seviye {level}</b>
          <div className="bar">
            <div className="bar-fill good" style={{ width: `${(intoLevel / needed) * 100}%` }} />
          </div>
          <span className="small muted">
            Sonraki seviyeye {needed - intoLevel} XP · toplam {totalXp} XP
          </span>
        </div>
      </section>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">🔥 {currentStreak(streak, today)}</span>
          <span className="stat-label">Günlük seri (en iyi {streak.best})</span>
        </div>
        <div className="stat">
          <span className="stat-value">{lessonsCompleted}</span>
          <span className="stat-label">Tamamlanan ders</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {Object.keys(badges).length}/{BADGES.length}
          </span>
          <span className="stat-label">Rozet</span>
        </div>
      </div>

      <section className="card">
        <h2>Rozetler</h2>
        <div className="badge-grid">
          {BADGES.map((b) => (
            <div key={b.id} className={`badge ${badges[b.id] ? 'earned' : 'locked'}`}>
              <span className="badge-icon">{badges[b.id] ? b.icon : '🔒'}</span>
              <b>{b.title}</b>
              <span className="small muted">{b.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Sol anahtarı nota haritası</h2>
        {scores.length === 0 ? (
          <p className="muted">İlk dersini bitirince her notadaki başarın burada görünecek.</p>
        ) : (
          <div className="heat-grid">
            {scores.map((s) => {
              const acc = s.firstTry / s.shown
              return (
                <div key={s.midi} className="heat-cell" style={{ background: heatColor(acc) }}>
                  <b>{solfegeName(s.midi)}</b>
                  <span>%{Math.round(acc * 100)}</span>
                  <span className="small">
                    {s.avgReactionMs !== null ? `${(s.avgReactionMs / 1000).toFixed(1)} sn` : '–'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Son dersler</h2>
        {sessions.length === 0 ? (
          <p className="muted">Henüz ders yok.</p>
        ) : (
          <ul className="history">
            {sessions.map((s) => (
              <li key={s.id}>
                <span>
                  {s.lessonId === REVIEW_LESSON_ID ? 'Zayıf Notalar' : (findLesson(s.lessonId)?.title ?? s.lessonId)}
                  <span className="small muted"> · {new Date(s.at).toLocaleDateString('tr-TR')}</span>
                </span>
                <span className={s.failed ? 'bad' : ''}>
                  {s.failed ? 'Kalpler bitti' : `%${Math.round(s.accuracy * 100)}`} · +{s.xp} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
