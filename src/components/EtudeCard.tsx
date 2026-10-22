import { ETUDE_LESSONS } from '../games/etudes/lessons'
import { unitDone } from '../progress/curriculum'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'

/** The map's way into the Etüt Kitaplığı: open once Başlangıç is done. */
export function EtudeCard({ onOpen }: { onOpen: () => void }) {
  const lessons = useProfile((s) => s.lessons)
  const testMode = useSettings((s) => s.testMode)
  const stars = (id: string) => (testMode ? 3 : (lessons[id]?.bestStars ?? 0))
  const starred = ETUDE_LESSONS.filter((l) => (lessons[l.id]?.bestStars ?? 0) >= 1).length
  const open = testMode || starred > 0 || unitDone('basics', stars)
  return (
    <section className="salon-card etude-card" data-node="etudes" aria-label="Etüt Kitaplığı">
      <span className="salon-card-icon" aria-hidden>
        📜
      </span>
      <div className="salon-card-body">
        <h2>Etüt Kitaplığı</h2>
        <p>{open ? `${starred}/${ETUDE_LESSONS.length} etüt çalındı` : '🔒 Başlangıç bitince açılır'}</p>
        <p className="small muted">Bach, Pleyel ve Czerny’nin gerçek notaları, partisyondan.</p>
      </div>
      <button className="btn btn-small" onClick={onOpen} disabled={!open} aria-label="Etüt Kitaplığı’na gir">
        Gir
      </button>
    </section>
  )
}
