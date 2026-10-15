// Clef signs for the arcade staves, drawn from the Bravura music font with
// exact metrics. Pixi's `Text` places a glyph by a measured ascent that can
// come from a fallback font while Bravura is still loading, which left the
// clefs about a staff space too low. A SMuFL clef's origin sits on its
// reference line (G for treble, F for bass), so drawing it with an alphabetic
// baseline on a canvas puts it exactly right at any size.

import { Sprite, Texture } from 'pixi.js'
import type { Clef } from '../../music/notes'

const GLYPH: Record<
  Clef,
  { glyph: string; /** Staff steps above the bottom line of the reference line. */ step: number }
> = {
  treble: { glyph: '', step: 2 },
  bass: { glyph: '', step: 6 },
}

/** Texture size: the font size in pixels (4 staff spaces) and the canvas around the glyph. */
const EM = 240
const W = EM * 1.4
const H = EM * 2.4
const LEFT = EM * 0.1
const BASELINE = H / 2

const cache = new Map<Clef, Texture>()

/** True once Bravura can be drawn (VexFlow registers it; `ArcadeScreen` asks for it to load). */
const fontReady = () => !!document.fonts?.check?.(`${EM}px Bravura`)

function textureOf(clef: Clef): Texture | null {
  const cached = cache.get(clef)
  if (cached) return cached
  if (!fontReady()) return null
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = `${EM}px Bravura`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(GLYPH[clef].glyph, LEFT, BASELINE)
  const texture = Texture.from(canvas)
  cache.set(clef, texture)
  return texture
}

/**
 * A sprite of the clef, or null while the font is not ready (try again next
 * frame). Place it with `placeClef`; it is white, so `tint` colours it.
 */
export function clefSprite(clef: Clef): Sprite | null {
  const texture = textureOf(clef)
  if (!texture) return null
  const sprite = new Sprite(texture)
  sprite.anchor.set(LEFT / W, BASELINE / H)
  return sprite
}

/** Puts the clef on a staff whose bottom line is at `bottomY` with `gap` between lines; its left edge at `x`. */
export function placeClef(sprite: Sprite, clef: Clef, x: number, bottomY: number, gap: number) {
  const scale = (gap * 4) / EM
  sprite.scale.set(scale)
  sprite.position.set(x, bottomY - GLYPH[clef].step * (gap / 2))
}
