import { gameOpen, SALON_GAMES } from '../games/salon/salon'
import { ALL_LESSONS } from '../progress/curriculum'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'

/** The map's way into the Oyun Salonu, shown once a game is open. */
export function SalonCard({ onOpen }: { onOpen: () => void }) {
  const lessons = useProfile((s) => s.lessons)
  const records = useProfile((s) => s.salon)
  const testMode = useSettings((s) => s.testMode)
  const open = SALON_GAMES.filter((g) =>
    gameOpen(g, ALL_LESSONS, (id) => (testMode ? 3 : (lessons[id]?.bestStars ?? 0))),
  ).length
  if (!open) return null
  const played = Object.values(records).reduce((n, r) => n + r.plays, 0)
  return (
    <section className="salon-card" data-node="salon" aria-label="Oyun Salonu">
      <span className="salon-card-icon" aria-hidden>
        🕹️
      </span>
      <div className="salon-card-body">
        <h2>Oyun Salonu</h2>
        <p>
          {open} oyun açık{played ? ` · ${Object.keys(records).length} rekor` : ''}
        </p>
        <p className="small muted">Sevdiğin oyunu istediğin beceriyle oyna, rekorunu kır.</p>
      </div>
      <button className="btn btn-small" onClick={onOpen} aria-label="Oyun Salonu’na gir">
        Gir
      </button>
    </section>
  )
}
