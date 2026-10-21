// Rhythm notation (VexFlow) on a single line that scrolls: the whole piece is drawn once with every beat the same
// width, the clef stays on the left and the playhead stays put while the bars slide under it. Notes are coloured
// by how they were played.

import { useEffect, useRef, useState } from 'react'
import {
  Barline,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  type StaveNote as StaveNoteType,
  StaveNote,
  Voice,
} from 'vexflow/bravura'
import { vexKey } from '../music/notes'
import { VALUE_BEATS, type RhythmValue } from '../rhythm/rhythm'
import type { HoldVerdict } from '../rhythm/hold'
import type { Judgement } from '../rhythm/timing'

export interface StaffEvent {
  value: RhythmValue
  beat: number
  judgement: Judgement | null
  /** Songs: the note to play (pitched staff). */
  midi?: number | null
  /** How long the note was held, as a share of its length; `verdict` is null while the key is down. */
  hold?: { share: number; verdict: HoldVerdict | null } | null
}

interface Props {
  /** Events of the whole piece, beats counted from the first bar. */
  events: StaffEvent[]
  bars: number
  beatsPerBar: number
  /** Current beat (negative during the count-in), or null before the start. */
  playhead: number | null
  /** Songs: five lines and a treble clef, every note on its pitch; otherwise one line for the rhythm alone. */
  pitched?: boolean
}

const WIDTH = 360
const HEIGHT = 120
const STAVE_Y = 15
/** The visible band of the drawing: the stave reserves four empty lines above the one we show, so the top is cropped. */
const VIEW_Y = 42
const VIEW_H = 72

const JUDGEMENT_COLORS: Record<Judgement, string> = {
  perfect: '#22a559',
  good: '#1cb0f6',
  early: '#ff9600',
  late: '#ff9600',
  miss: '#ff4b4b',
}

const DURATION: Record<RhythmValue, string> = {
  w: 'w',
  h: 'h',
  q: 'q',
  e: '8',
  s: '16',
  qr: 'qr',
  qd: 'qd',
  hd: 'hd',
  ed: '8d',
}

/** The notation sets its own paper and ink for the colour scheme instead of leaning on a CSS filter, so it reads in any browser. */
const THEMES = {
  light: { paper: '#ffffff', ink: '#1f2a30' },
  dark: { paper: '#1b2a31', ink: '#eef3f6' },
}

function useDark() {
  const query = '(prefers-color-scheme: dark)'
  const [dark, setDark] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

let fontsReady: Promise<unknown> | null = null
function waitForFonts() {
  fontsReady ??= document.fonts ? document.fonts.load('30px Bravura').catch(() => undefined) : Promise.resolve()
  return fontsReady
}

/** Width of one beat in the drawing's units: eighths are half of it everywhere, in every bar. */
const BEAT_U = 34
/** Where the playhead stands, and the width of the fixed clef box on the left. */
const PLAYHEAD_U = 120
const CLIP_U = 86
/** Room before the first beat (half a beat of it is the first barline's distance). */
const LEAD = BEAT_U

/** Centre of a note head, in the strip's units. */
const xOf = (beat: number) => LEAD + beat * BEAT_U

export function RhythmStaff({ events, bars, beatsPerBar, playhead, pitched = false }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)
  const fixedRef = useRef<HTMLDivElement>(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const theme = THEMES[useDark() ? 'dark' : 'light']
  const totalBeats = bars * beatsPerBar
  const totalU = LEAD + totalBeats * BEAT_U + BEAT_U
  // `events` is a new array every frame; redraw only when what it shows changes.
  const key = events.map((e) => `${e.beat}${e.value}${e.midi ?? ''}${e.judgement ?? ''}`).join(',')
  const eventsRef = useRef(events)
  useEffect(() => {
    eventsRef.current = events
  })

  useEffect(() => {
    let alive = true
    waitForFonts().then(() => alive && setFontsLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  const crop = (el: HTMLElement, width: number) => {
    const svg = el.querySelector('svg')
    if (!svg) return
    svg.setAttribute('viewBox', `0 ${VIEW_Y} ${width} ${VIEW_H}`)
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.style.removeProperty('width')
    svg.style.removeProperty('height')
    svg.style.filter = 'none'
  }

  // The fixed part: clef and time signature on a paper-coloured box that the bars slide under.
  useEffect(() => {
    const el = fixedRef.current
    if (!el || !fontsLoaded) return
    el.innerHTML = ''
    const ink = { fillStyle: theme.ink, strokeStyle: theme.ink }
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(WIDTH, HEIGHT)
    const ctx = renderer.getContext()
    ctx.setFillStyle(theme.ink)
    ctx.setStrokeStyle(theme.ink)
    const stave = new Stave(10, STAVE_Y, CLIP_U - 10)
    stave.setConfigForLines([0, 1, 2, 3, 4].map((i) => ({ visible: pitched || i === 2 })))
    stave.addClef(pitched ? 'treble' : 'percussion').addTimeSignature(`${beatsPerBar}/4`)
    stave.setEndBarType(Barline.type.NONE)
    stave.setStyle(ink)
    stave.setContext(ctx).draw()
    crop(el, WIDTH)
    const svg = el.querySelector('svg')
    if (svg) {
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      box.setAttribute('data-paper', '')
      box.setAttribute('x', '0')
      box.setAttribute('y', String(VIEW_Y))
      box.setAttribute('width', String(CLIP_U))
      box.setAttribute('height', String(VIEW_H))
      box.setAttribute('fill', theme.paper)
      box.setAttribute('stroke', 'none')
      svg.insertBefore(box, svg.firstChild)
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', 'Ritim')
    }
  }, [beatsPerBar, fontsLoaded, theme, pitched])

  // The strip: every bar of the piece, one beat = BEAT_U wherever it is.
  useEffect(() => {
    const el = stripRef.current
    if (!el || !fontsLoaded) return
    const events = eventsRef.current
    el.innerHTML = ''
    const ink = { fillStyle: theme.ink, strokeStyle: theme.ink }
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(totalU, HEIGHT)
    const ctx = renderer.getContext()
    ctx.setFillStyle(theme.ink)
    ctx.setStrokeStyle(theme.ink)
    for (let bar = 0; bar < bars; bar++) {
      // The first bar's line starts at the left edge so it meets the clef box (its barline is the box's own).
      const x0 = LEAD + (bar * beatsPerBar - 0.5) * BEAT_U
      const from = bar === 0 ? 0 : x0
      const stave = new Stave(from, STAVE_Y, beatsPerBar * BEAT_U + (x0 - from))
      if (bar === 0) stave.setBegBarType(Barline.type.NONE)
      // Rhythm alone is read on one line: keep the five-line geometry, show the middle line (songs show all five).
      stave.setConfigForLines([0, 1, 2, 3, 4].map((i) => ({ visible: pitched || i === 2 })))
      if (bar === bars - 1) stave.setEndBarType(Barline.type.END)
      stave.setStyle(ink)
      stave.setContext(ctx).draw()

      const inBar = events.filter((e) => Math.floor(e.beat / beatsPerBar) === bar)
      if (inBar.length === 0) continue
      const notes: StaveNoteType[] = inBar.map((e) => {
        const n = new StaveNote({
          keys: [e.midi != null ? vexKey(e.midi) : 'b/4'],
          duration: DURATION[e.value],
          stemDirection: 1,
        })
        if (e.value === 'qd' || e.value === 'hd') Dot.buildAndAttach([n], { all: true })
        if (e.judgement) {
          const color = JUDGEMENT_COLORS[e.judgement]
          n.setStyle({ fillStyle: color, strokeStyle: color })
        } else n.setStyle(ink)
        n.setStave(stave)
        return n
      })
      const voice = new Voice({ numBeats: beatsPerBar, beatValue: 4 }).setStrict(false).addTickables(notes)
      // Beams follow the beat: paired eighths share one, the eighth after a dotted quarter stays alone.
      const beams = Beam.generateBeams(notes)
      new Formatter().joinVoices([voice]).format([voice], beatsPerBar * BEAT_U - 10)
      // Spacing by time, not by the formatter: each note head sits exactly on its beat.
      inBar.forEach((e, i) => {
        const tick = notes[i].getTickContext()
        tick.setX(tick.getX() + xOf(e.beat) - 6 - notes[i].getAbsoluteX())
      })
      voice.draw(ctx, stave)
      beams.forEach((beam) => beam.setStyle(ink).setContext(ctx).draw())
    }
    crop(el, totalU)
    // `key` stands for `events`.
  }, [key, bars, beatsPerBar, totalU, fontsLoaded, theme, pitched])

  const pct = (v: number) => `${(v / WIDTH) * 100}%`
  const inStrip = (v: number) => `${(v / totalU) * 100}%`
  // The strip slides left as the beats pass; before the start (and in the count-in) the first beat waits at the playhead.
  const beat = Math.min(totalBeats, Math.max(0, playhead ?? 0))
  const shift = ((xOf(beat) - PLAYHEAD_U) / totalU) * 100
  // Hold bars under the notes: the note's length, filled as far as the key was held.
  const holds = events.flatMap((e, i) => {
    if (!e.hold) return []
    const from = xOf(e.beat) - 6
    const fill = Math.min(1, e.hold.share)
    return [
      <div
        key={i}
        className={`hold-bar ${e.hold.verdict ?? 'down'}`}
        data-verdict={e.hold.verdict ?? 'down'}
        style={{ left: inStrip(from), width: inStrip(VALUE_BEATS[e.value] * BEAT_U) }}
      >
        <span style={{ width: `${fill * 100}%` }} />
      </div>,
    ]
  })

  return (
    <div className="rhythm-staff" style={{ background: theme.paper }}>
      <div className="rhythm-canvas">
        <div ref={fixedRef} className="staff rhythm-fixed" />
        <div className="rhythm-strip" style={{ width: pct(totalU), transform: `translateX(${-shift}%)` }}>
          <div ref={stripRef} className="staff" />
          {holds}
        </div>
        {playhead !== null && <div className="playhead" style={{ left: pct(PLAYHEAD_U) }} />}
      </div>
    </div>
  )
}
