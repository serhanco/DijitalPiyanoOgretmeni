import type { Graphics } from 'pixi.js'
import { type CardPitch, ledgerSteps, pitchAcc, pitchStep, type StaffLayout, stepY } from './staffGeometry'
import type { Clef } from '../../music/notes'

export const INK = 0x2b2f3a

export function drawStaffLines(g: Graphics, x0: number, x1: number, layout: StaffLayout, color = INK, alpha = 0.8) {
  for (let s = 0; s <= 8; s += 2) {
    const y = stepY(s, layout)
    g.moveTo(x0, y).lineTo(x1, y)
  }
  g.stroke({ width: Math.max(1, layout.gap * 0.08), color, alpha })
}

/** A whole-note style head with its ledger lines. */
export function drawNote(g: Graphics, x: number, step: number, layout: StaffLayout, color = INK) {
  const { gap } = layout
  const ledgers = ledgerSteps(step)
  for (const s of ledgers) {
    const y = stepY(s, layout)
    g.moveTo(x - gap * 0.95, y).lineTo(x + gap * 0.95, y)
  }
  // Stroking with no new path would outline the previous shape instead.
  if (ledgers.length) g.stroke({ width: Math.max(1, gap * 0.1), color })
  const y = stepY(step, layout)
  g.ellipse(x, y, gap * 0.62, gap * 0.45).fill(color)
  // Hollow centre, tilted like a printed whole note.
  g.ellipse(x - gap * 0.05, y, gap * 0.28, gap * 0.22).fill(0xffffff)
}

/** A sharp, flat, double sharp or double flat centred on (x, step), drawn with lines. */
export function drawAccidental(g: Graphics, x: number, step: number, layout: StaffLayout, acc: number, color = INK) {
  const { gap } = layout
  const y = stepY(step, layout)
  const thin = Math.max(1, gap * 0.1)
  const thick = Math.max(1.5, gap * 0.2)
  if (acc === 1) {
    // Two stems and two rising bars.
    const dx = gap * 0.22
    g.moveTo(x - dx, y - gap * 1.1).lineTo(x - dx, y + gap * 1.3)
    g.moveTo(x + dx, y - gap * 1.3).lineTo(x + dx, y + gap * 1.1)
    g.stroke({ width: thin, color })
    for (const off of [-0.4, 0.4])
      g.moveTo(x - gap * 0.4, y + gap * (off + 0.12)).lineTo(x + gap * 0.4, y + gap * (off - 0.12))
    g.stroke({ width: thick, color })
    return
  }
  if (acc === 2) {
    const r = gap * 0.32
    g.moveTo(x - r, y - r)
      .lineTo(x + r, y + r)
      .moveTo(x + r, y - r)
      .lineTo(x - r, y + r)
    g.stroke({ width: thick, color })
    return
  }
  // Flat (twice for a double flat): a stem and a bowl on its right.
  for (const fx of acc === -2 ? [x - gap * 0.3, x + gap * 0.3] : [x]) {
    const sx = fx - gap * 0.2
    g.moveTo(sx, y - gap * 1.6).lineTo(sx, y + gap * 0.5)
    g.moveTo(sx, y - gap * 0.05).bezierCurveTo(
      sx + gap * 0.9,
      y - gap * 0.6,
      sx + gap * 0.75,
      y + gap * 0.25,
      sx,
      y + gap * 0.5,
    )
    g.stroke({ width: thin * 1.2, color })
  }
}

/**
 * The notes of a card at one x: heads with ledger lines, and the accidentals
 * before them, moved further left where two would touch. With `left` the notes
 * move right as far as their accidentals need to stay inside the card.
 */
export function drawCardNotes(
  g: Graphics,
  x: number,
  notes: CardPitch[],
  clef: Clef,
  layout: StaffLayout,
  color = INK,
  left = -Infinity,
) {
  const { gap } = layout
  const signed = notes
    .map((p) => ({ step: pitchStep(p, clef), acc: pitchAcc(p), col: -1 }))
    .sort((a, b) => b.step - a.step)
  for (const n of signed) {
    if (n.acc === 0) continue
    let col = 0
    while (signed.some((p) => p.col === col && Math.abs(p.step - n.step) < 6)) col++
    n.col = col
  }
  const cols = Math.max(0, ...signed.map((n) => n.col + 1))
  const headX = Math.max(x, left + gap * 0.3 + cols * gap * 1.05 + gap * 0.7)
  for (const n of signed) {
    drawNote(g, headX, n.step, layout, color)
    if (n.col >= 0) drawAccidental(g, headX - gap * 1.25 - n.col * gap * 1.05, n.step, layout, n.acc, color)
  }
}
