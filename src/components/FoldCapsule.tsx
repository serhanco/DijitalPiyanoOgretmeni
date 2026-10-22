interface Props {
  id: string
  lessons: { id: string; title: string }[]
  /** Folded: one capsule standing for the lessons; open: a small button that folds them again. */
  folded: boolean
  stars: (id: string) => number
  onToggle: () => void
  /** The unit's colour. */
  color?: string
}

/** Finished lessons in a row, folded into one capsule (`progress/mapFold.ts`); a tap opens them. */
export function FoldCapsule({ id, lessons, folded, stars, onToggle, color }: Props) {
  if (!folded)
    return (
      <button className="fold-again" onClick={onToggle} aria-expanded data-fold={id}>
        ▴ {lessons.length} dersi katla
      </button>
    )
  return (
    <button
      className="fold-capsule"
      style={color ? ({ '--node': color } as React.CSSProperties) : undefined}
      onClick={onToggle}
      aria-expanded={false}
      aria-label={`${lessons.length} bitmiş ders: ${lessons.map((l) => l.title).join(', ')}`}
      data-fold={id}
      data-titles={JSON.stringify(lessons.map((l) => l.title))}
    >
      <span className="fold-check" aria-hidden>
        ✓
      </span>
      <span className="fold-text">
        <b>{lessons.length} ders bitti</b>
        <span>★ {lessons.reduce((n, l) => n + stars(l.id), 0)} · aç</span>
      </span>
      <span className="fold-medals" aria-hidden>
        {lessons.map((l) => (
          <span key={l.id} className={`fold-dot m${stars(l.id)}`} />
        ))}
      </span>
    </button>
  )
}
