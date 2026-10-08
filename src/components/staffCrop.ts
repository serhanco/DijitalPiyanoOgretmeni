// Landscape phones are short: there the staff drawings are cropped to what they actually show, so the notes come out
// bigger in the little height left above the keyboard. The media query matches the landscape block in index.css.

import { useSyncExternalStore } from 'react'
import type { Stave, StaveNote } from 'vexflow/bravura'

export const COMPACT_LANDSCAPE = '(orientation: landscape) and (max-height: 520px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(COMPACT_LANDSCAPE)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/** True on a short landscape screen (a phone held sideways). */
export function useCompactLandscape() {
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(COMPACT_LANDSCAPE).matches ?? false)
}

/**
 * The rows a drawing needs: the staves' lines with `linePad` around them and every note (stems included) with
 * `notePad`. A `linePad` that already covers the usual notes keeps the staff one size from note to note.
 */
export function staffBand(staves: Stave[], notes: StaveNote[], linePad: number, notePad: number): [number, number] {
  const tops = staves.map((st) => st.getYForLine(0) - linePad)
  const bottoms = staves.map((st) => st.getYForLine(st.getNumLines() - 1) + linePad)
  for (const n of notes) {
    const box = n.getBoundingBox()
    tops.push(box.getY() - notePad)
    bottoms.push(box.getY() + box.getH() + notePad)
  }
  return [Math.min(...tops), Math.max(...bottoms)]
}

/** Sets the drawing's viewBox: the full `width` × `height`, or only the rows of `band` (see `staffBand`). */
export function setStaffViewBox(svg: SVGSVGElement, width: number, height: number, band?: [number, number]) {
  const top = Math.max(0, band?.[0] ?? 0)
  const bottom = Math.min(height, band?.[1] ?? height)
  svg.setAttribute(
    'viewBox',
    bottom > top ? `0 ${Math.round(top)} ${width} ${Math.round(bottom - top)}` : `0 0 ${width} ${height}`,
  )
}
