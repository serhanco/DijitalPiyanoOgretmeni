import { Sheet } from './Sheet'

export interface UnitRow {
  id: string
  title: string
  color: string
  done: number
  total: number
  locked: boolean
  soon: boolean
}

interface Props {
  rows: UnitRow[]
  onPick: (id: string) => void
  onClose: () => void
}

/** The list of units with their progress; a tap jumps the map to the unit. */
export function UnitNav({ rows, onPick, onClose }: Props) {
  return (
    <Sheet title="Üniteler" onClose={onClose} className="unit-nav">
      <ul className="unit-nav-list">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              className={`unit-nav-row ${r.locked || r.soon ? 'dim' : ''}`}
              data-unit-nav={r.id}
              onClick={() => onPick(r.id)}
            >
              <span className="unit-nav-dot" style={{ background: r.soon ? undefined : r.color }} aria-hidden />
              <span className="unit-nav-body">
                <b>{r.title}</b>
                <span className="unit-nav-bar" aria-hidden>
                  <span style={{ width: `${r.total ? (r.done / r.total) * 100 : 0}%`, background: r.color }} />
                </span>
              </span>
              <span className="unit-nav-count">
                {r.soon ? 'Yakında' : r.locked ? '🔒' : r.done === r.total ? '✓' : `${r.done}/${r.total}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
