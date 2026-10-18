import { useState } from 'react'
import { BADGES, levelFromXp } from '../progress/gamification'
import { COSTUMES, type CostumeId, costumeOpen } from '../progress/wardrobe'
import { useProfile } from '../state/profile'
import { Mascot } from './Mascot'

/** Kostüm dolabı on the profile: Notiş tries a costume on, a tap on an open one puts it on. */
export function Wardrobe() {
  const { totalXp, badges, costume, setCostume } = useProfile()
  const ctx = { level: levelFromXp(totalXp).level, badges: Object.keys(badges) }
  const [pulse, setPulse] = useState(0)
  const open = COSTUMES.filter((c) => costumeOpen(c, ctx)).length

  const wear = (id: CostumeId | null) => {
    setCostume(id)
    setPulse((p) => p + 1)
  }

  return (
    <section className="card wardrobe">
      <h2>
        Kostüm dolabı{' '}
        <span className="small muted">
          {open}/{COSTUMES.length}
        </span>
      </h2>
      <div className="wardrobe-stage">
        <Mascot mood={pulse ? 'happy' : 'idle'} pulse={pulse} size={110} />
        <p className="small muted">
          Seçtiğin kostümü Notiş haritada, derslerde ve oyunlarda giyer. Yenileri seviye atladıkça ve rozet kazandıkça
          açılır.
        </p>
      </div>
      <div className="wardrobe-grid">
        <button
          className={`costume ${costume === null ? 'on' : ''}`}
          data-costume="none"
          aria-pressed={costume === null}
          onClick={() => wear(null)}
        >
          <span className="costume-icon">🙂</span>
          <b>Kostümsüz</b>
        </button>
        {COSTUMES.map((c) => {
          const ok = costumeOpen(c, ctx)
          const badge = c.badge ? BADGES.find((b) => b.id === c.badge) : null
          return (
            <button
              key={c.id}
              className={`costume ${costume === c.id ? 'on' : ''} ${ok ? '' : 'locked'}`}
              data-costume={c.id}
              aria-pressed={costume === c.id}
              disabled={!ok}
              title={ok ? c.name : c.need}
              onClick={() => wear(c.id)}
            >
              <span className="costume-icon">{ok ? c.icon : '🔒'}</span>
              <b>{c.name}</b>
              {!ok && <span className="small muted">{badge ? `${badge.icon} ${c.need}` : c.need}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
