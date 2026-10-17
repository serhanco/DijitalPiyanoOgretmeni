import { type ReactNode, useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

/** A card that opens over the map, closed by ✕, Escape or a tap outside (the settings sheet's look). */
export function Sheet({ title, onClose, children, className = '' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="settings-sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`card settings sheet ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="settings-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={`${title} penceresini kapat`}>
            ✕
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
