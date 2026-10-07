import type { Graphics } from 'pixi.js'
import { ledgerSteps, type StaffLayout, stepY } from './staffGeometry'

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
