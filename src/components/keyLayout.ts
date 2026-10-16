// Keyboard geometry shared by the on-screen keyboard and what is drawn over it.

import { isBlackKey } from '../music/notes'

/** Where each key sits, as shares of the keyboard's width (what the falling notes of Nota Şelalesi line up with). */
export function keySpans(low: number, high: number): Map<number, { left: number; width: number; black: boolean }> {
  const whites: number[] = []
  for (let n = low; n <= high; n++) if (!isBlackKey(n)) whites.push(n)
  const w = 1 / whites.length
  const spans = new Map<number, { left: number; width: number; black: boolean }>()
  whites.forEach((midi, i) => {
    spans.set(midi, { left: i * w, width: w, black: false })
    if (midi + 1 <= high && isBlackKey(midi + 1))
      spans.set(midi + 1, { left: (i + 1) * w - w * 0.3, width: w * 0.6, black: true })
  })
  return spans
}
