import { FEVER_AT } from './useArcade'

/** The flame and the record on the HUD. */
export function ArcadeChips({ combo, record }: { combo: number; record?: number }) {
  return (
    <>
      {combo >= FEVER_AT && (
        <span className="combo-chip" key={combo} aria-label={`${combo} doğru üst üste`}>
          🔥 {combo}
        </span>
      )}
      {record !== undefined && record > 0 && (
        <span className="record-chip" title="Bu oyunun rekoru">
          🏆 {record}
        </span>
      )}
    </>
  )
}
