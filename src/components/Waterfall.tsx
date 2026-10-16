// Nota Şelalesi's playfield: notes fall onto the keys below, each as long as
// it lasts, and are played the moment they touch the line. Drawn on a canvas
// every frame, lined up with the real keyboard (`.keyboard` in the same game),
// so it follows the keyboard when it scrolls sideways.

import { useEffect, useRef } from 'react'
import { solfegeName } from '../music/notes'
import type { SongNote } from '../games/songs/song'
import { keySpans } from './keyLayout'

export type FallState = 'pending' | 'active' | 'hit' | 'off' | 'miss' | 'held'

export interface WaterfallProps {
  notes: SongNote[]
  low: number
  high: number
  beatsPerBar: number
  /** The beat at the line, read every frame. */
  position: () => number
  /** The state of note `i`, read every frame. */
  stateOf: (i: number) => FallState
  /** Beats visible above the line. */
  lookAhead?: number
}

const HAND_COLOUR = { right: ['#5b8def', '#3d6fd6'], left: ['#f06fa4', '#d24f88'] } as const
const STATE_FILL: Partial<Record<FallState, string>> = {
  hit: '#3fbf7f',
  held: '#3fbf7f',
  off: '#e3a63b',
  miss: '#7d7f8c',
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function Waterfall({ notes, low, high, beatsPerBar, position, stateOf, lookAhead = 4 }: WaterfallProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const props = useRef({ notes, position, stateOf, beatsPerBar, lookAhead })
  useEffect(() => {
    props.current = { notes, position, stateOf, beatsPerBar, lookAhead }
  })

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const spans = keySpans(low, high)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const { notes, position, stateOf, beatsPerBar, lookAhead } = props.current
      const box = cv.getBoundingClientRect()
      const keyboard = cv.closest('.game')?.querySelector('.keyboard')?.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const W = Math.round(box.width * dpr)
      const H = Math.round(box.height * dpr)
      if (!W || !H) return
      if (cv.width !== W || cv.height !== H) {
        cv.width = W
        cv.height = H
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const w = box.width
      const h = box.height
      ctx.clearRect(0, 0, w, h)
      // Keys line up with the keyboard; without one (never in a lesson) the canvas is the keyboard.
      const kx = keyboard ? keyboard.left - box.left : 0
      const kw = keyboard ? keyboard.width : w
      const lineY = h - 6
      const ppb = (lineY - 8) / lookAhead
      const pos = position()
      const now = performance.now()

      // Lanes: a faint line at every Do, darker bands over the black keys.
      for (const [midi, s] of spans) {
        const x = kx + s.left * kw
        if (s.black) {
          ctx.fillStyle = 'rgba(0,0,0,0.18)'
          ctx.fillRect(x, 0, s.width * kw, lineY)
        } else if (midi % 12 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.fillRect(x, 0, 1, lineY)
        }
      }
      // Bar lines fall with the notes.
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      for (let b = Math.ceil(pos / beatsPerBar) * beatsPerBar; b <= pos + lookAhead; b += beatsPerBar) {
        const y = lineY - (b - pos) * ppb
        ctx.fillRect(0, Math.round(y), w, 1)
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      notes.forEach((x, i) => {
        const bottom = lineY - (x.beat - pos) * ppb
        const top = bottom - x.beats * ppb + 3
        if (top > lineY || bottom < -4) return
        const s = spans.get(x.midi)
        if (!s) return
        const state = stateOf(i)
        const gap = s.black ? 1 : 2
        const left = kx + s.left * kw + gap
        const width = s.width * kw - gap * 2
        const clipBottom = Math.min(bottom, lineY)
        const [fill, edge] = HAND_COLOUR[x.hand]
        ctx.globalAlpha = state === 'miss' ? 0.55 : 1
        ctx.fillStyle = STATE_FILL[state] ?? fill
        roundRect(ctx, left, top, width, Math.max(4, clipBottom - top), 5)
        ctx.fill()
        if (state === 'active') {
          // The step waiting at the line breathes.
          const glow = reduced ? 1 : 0.6 + 0.4 * Math.sin(now / 160)
          ctx.lineWidth = 3
          ctx.strokeStyle = `rgba(255,236,140,${glow})`
          ctx.stroke()
        } else {
          ctx.lineWidth = 1.5
          ctx.strokeStyle = edge
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        if (width >= 16 && clipBottom - top >= 16) {
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.font = `700 ${Math.min(13, width * 0.45)}px Nunito, system-ui, sans-serif`
          ctx.fillText(solfegeName(x.midi, false), left + width / 2, clipBottom - 3)
        }
      })

      // The line where notes are played.
      const g = ctx.createLinearGradient(0, lineY - 8, 0, lineY + 4)
      g.addColorStop(0, 'rgba(255,236,140,0)')
      g.addColorStop(1, 'rgba(255,236,140,0.85)')
      ctx.fillStyle = g
      ctx.fillRect(0, lineY - 8, w, 10)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [low, high])

  return (
    <div className="waterfall">
      <canvas ref={canvas} aria-hidden />
    </div>
  )
}
