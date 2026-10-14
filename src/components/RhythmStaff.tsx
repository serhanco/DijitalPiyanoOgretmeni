// Rhythm notation (VexFlow) on a single visible line: two bars at a time,
// notes coloured by how they were played, and a playhead on the beat.

import { useEffect, useRef, useState } from 'react'
import {
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  type StaveNote as StaveNoteType,
  StaveNote,
  Voice,
} from 'vexflow/bravura'
import { VALUE_BEATS, type RhythmValue } from '../rhythm/rhythm'
import type { HoldVerdict } from '../rhythm/hold'
import type { Judgement } from '../rhythm/timing'

export interface StaffEvent {
  value: RhythmValue
  beat: number
  judgement: Judgement | null
  /** How long the note was held, as a share of its length; `verdict` is null while the key is down. */
  hold?: { share: number; verdict: HoldVerdict | null } | null
}

interface Props {
  /** Events of the bars shown, beats counted from the first bar of the piece. */
  events: StaffEvent[]
  firstBar: number
  barCount: number
  beatsPerBar: number
  /** Current beat, or null to hide the playhead. */
  playhead: number | null
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

const DURATION: Record<RhythmValue, string> = { h: 'h', q: 'q', e: '8', qr: 'qr', qd: 'qd', hd: 'hd' }

let fontsReady: Promise<unknown> | null = null
function waitForFonts() {
  fontsReady ??= document.fonts ? document.fonts.load('30px Bravura').catch(() => undefined) : Promise.resolve()
  return fontsReady
}

export function RhythmStaff({ events, firstBar, barCount, beatsPerBar, playhead }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  /** (beat, x) pairs to place the playhead between notes. */
  const [anchors, setAnchors] = useState<[number, number][]>([])
  // `events` is a new array every frame; redraw only when what it shows changes.
  const key = events.map((e) => `${e.beat}${e.value}${e.judgement ?? ''}`).join(',')
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

  useEffect(() => {
    const el = ref.current
    if (!el || !fontsLoaded) return
    const events = eventsRef.current
    el.innerHTML = ''
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(WIDTH, HEIGHT)
    const ctx = renderer.getContext()
    const points: [number, number][] = []
    const barWidth = (WIDTH - 20) / barCount
    for (let b = 0; b < barCount; b++) {
      const bar = firstBar + b
      const x = 10 + b * barWidth
      const stave = new Stave(x, STAVE_Y, barWidth)
      // Rhythm is read on one line: keep the five-line geometry, show the middle line.
      stave.setConfigForLines([0, 1, 2, 3, 4].map((i) => ({ visible: i === 2 })))
      if (b === 0) {
        stave.addClef('percussion')
        if (bar === 0) stave.addTimeSignature(`${beatsPerBar}/4`)
      }
      stave.setContext(ctx).draw()

      const inBar = events.filter((e) => Math.floor(e.beat / beatsPerBar) === bar)
      if (inBar.length === 0) continue
      const notes: StaveNoteType[] = inBar.map((e) => {
        const n = new StaveNote({ keys: ['b/4'], duration: DURATION[e.value], stemDirection: 1 })
        if (e.value === 'qd' || e.value === 'hd') Dot.buildAndAttach([n], { all: true })
        if (e.judgement) {
          const color = JUDGEMENT_COLORS[e.judgement]
          n.setStyle({ fillStyle: color, strokeStyle: color })
        }
        return n
      })
      const voice = new Voice({ numBeats: beatsPerBar, beatValue: 4 }).setStrict(false).addTickables(notes)
      // Beams follow the beat: paired eighths share one, the eighth after a dotted quarter stays alone.
      const beams = Beam.generateBeams(notes)
      new Formatter().joinVoices([voice]).format([voice], stave.getNoteEndX() - stave.getNoteStartX() - 10)
      voice.draw(ctx, stave)
      beams.forEach((beam) => beam.setContext(ctx).draw())
      if (points.length === 0) points.push([bar * beatsPerBar - 0.5, stave.getNoteStartX()])
      inBar.forEach((e, i) => points.push([e.beat, notes[i].getAbsoluteX() + 6]))
      const last = inBar[inBar.length - 1]
      points.push([last.beat + VALUE_BEATS[last.value], stave.getNoteEndX()])
    }
    setAnchors(points)

    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('viewBox', `0 ${VIEW_Y} ${WIDTH} ${VIEW_H}`)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.removeProperty('width')
      svg.style.removeProperty('height')
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', 'Ritim')
    }
    // `key` stands for `events`.
  }, [key, firstBar, barCount, beatsPerBar, fontsLoaded])

  /** x of a beat, between the anchors around it. */
  const xAt = (beat: number): number | null => {
    if (anchors.length < 2) return null
    const i = anchors.findIndex(([b]) => b > beat)
    if (i > 0) {
      const [b0, x0] = anchors[i - 1]
      const [b1, x1] = anchors[i]
      return x0 + ((beat - b0) / (b1 - b0)) * (x1 - x0)
    }
    return i === -1 ? anchors[anchors.length - 1][1] : null
  }
  const x = playhead === null ? null : xAt(playhead)
  const pct = (v: number) => `${(v / WIDTH) * 100}%`
  // Hold bars under the notes: the note's length, filled as far as the key was held.
  const holds = events.flatMap((e, i) => {
    if (!e.hold) return []
    const len = VALUE_BEATS[e.value]
    const from = xAt(e.beat)
    const to = xAt(e.beat + len)
    if (from === null || to === null || to <= from) return []
    const fill = Math.min(1, e.hold.share)
    return [
      <div
        key={i}
        className={`hold-bar ${e.hold.verdict ?? 'down'}`}
        data-verdict={e.hold.verdict ?? 'down'}
        style={{ left: pct(from - 4), width: pct(to - from) }}
      >
        <span style={{ width: `${fill * 100}%` }} />
      </div>,
    ]
  })

  return (
    <div className="rhythm-staff">
      <div className="rhythm-canvas">
        <div ref={ref} className="staff" />
        {holds}
        {x !== null && <div className="playhead" style={{ left: pct(x) }} />}
      </div>
    </div>
  )
}
