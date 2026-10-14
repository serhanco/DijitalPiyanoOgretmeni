// Little round animal heads for the arcade games (balloon passengers). Pure
// drawing helpers: the kind comes from the bar's customer kinds so the games
// share one cast.

import type { Graphics } from 'pixi.js'
import { type CustomerKind, KIND_COLOR } from './bar/character'

export type CritterMood = 'calm' | 'worried' | 'happy'

const INK = 0x2b1a5c

/** A critter's head centred on (x, y) with radius r, as a flat Notiş-style character. */
export function drawCritter(
  g: Graphics,
  kind: CustomerKind,
  x: number,
  y: number,
  r: number,
  mood: CritterMood,
  alpha = 1,
) {
  const fill = { color: KIND_COLOR[kind], alpha }
  if (kind === 'cat')
    for (const d of [-1, 1])
      g.poly([x + d * r * 0.95, y - r * 0.2, x + d * r * 0.3, y - r * 1.05, x + d * r * 0.1, y - r * 0.85]).fill(fill)
  else if (kind === 'bear') for (const d of [-1, 1]) g.circle(x + d * r * 0.78, y - r * 0.78, r * 0.34).fill(fill)
  else if (kind === 'bunny')
    for (const d of [-1, 1]) g.ellipse(x + d * r * 0.42, y - r * 1.35, r * 0.2, r * 0.62).fill(fill)
  if (kind === 'robot') g.roundRect(x - r, y - r * 0.9, r * 2, r * 1.8, r * 0.38).fill(fill)
  else g.circle(x, y, r).fill(fill)
  if (kind === 'frog') for (const d of [-1, 1]) g.circle(x + d * r * 0.55, y - r * 0.78, r * 0.36).fill(fill)
  if (kind === 'bear') g.ellipse(x, y + r * 0.35, r * 0.45, r * 0.32).fill({ color: 0xf6dcb8, alpha })
  g.circle(x - r * 0.62, y + r * 0.25, r * 0.13).fill({ color: 0xff8fb1, alpha: alpha * 0.65 })
  g.circle(x + r * 0.62, y + r * 0.25, r * 0.13).fill({ color: 0xff8fb1, alpha: alpha * 0.65 })
  for (const dx of [-0.36, 0.36]) {
    const ex = x + dx * r
    if (mood === 'happy') {
      g.moveTo(ex - r * 0.17, y - r * 0.12)
        .lineTo(ex, y - r * 0.28)
        .lineTo(ex + r * 0.17, y - r * 0.12)
        .stroke({ width: Math.max(1.4, r * 0.12), color: INK, alpha, cap: 'round' })
    } else {
      const big = mood === 'worried'
      g.circle(ex, y - r * 0.18, r * (big ? 0.27 : 0.21)).fill({ color: 0xffffff, alpha })
      g.circle(ex, y - r * 0.15, r * (big ? 0.1 : 0.11)).fill({ color: INK, alpha })
    }
  }
  const my = y + r * 0.4
  if (mood === 'worried') g.ellipse(x, my + r * 0.05, r * 0.12, r * 0.16).fill({ color: INK, alpha })
  else if (mood === 'happy')
    g.poly([x - r * 0.26, my - r * 0.05, x + r * 0.26, my - r * 0.05, x, my + r * 0.25]).fill({ color: INK, alpha })
  else
    g.moveTo(x - r * 0.22, my)
      .quadraticCurveTo(x, my + r * 0.2, x + r * 0.22, my)
      .stroke({ width: Math.max(1.4, r * 0.1), color: INK, alpha, cap: 'round' })
}
