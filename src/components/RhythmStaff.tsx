// Rhythm notation (VexFlow) on a single visible line: two bars at a time,
// notes coloured by how they were played, and a playhead on the beat.

import { useEffect, useRef, useState } from 'react'
import { Beam, Formatter, Renderer, Stave, type StaveNote as StaveNoteType, StaveNote, Voice } from 'vexflow/bravura'
import { VALUE_BEATS, type RhythmValue } from '../rhythm/rhythm'
import type { Judgement } from '../rhythm/timing'

export interface StaffEvent {
  value: RhythmValue
  beat: number
  judgement: Judgement | null
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

const JUDGEMENT_COLORS: Record<Judgement, string> = {
  perfect: '#22a559',
  good: '#1cb0f6',
  early: '#ff9600',
  late: '#ff9600',
  miss: '#ff4b4b',
}

const DURATION: Record<RhythmValue, string> = { h: 'h', q: 'q', e: '8', qr: 'qr' }

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
        if (e.judgement) {
          const color = JUDGEMENT_COLORS[e.judgement]
          n.setStyle({ fillStyle: color, strokeStyle: color })
        }
        return n
      })
      const voice = new Voice({ numBeats: beatsPerBar, beatValue: 4 }).setStrict(false).addTickables(notes)
      const beams = Beam.generateBeams(notes.filter((_, i) => inBar[i].value === 'e'))
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
      svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.removeProperty('width')
      svg.style.removeProperty('height')
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', 'Ritim')
    }
    // `key` stands for `events`.
  }, [key, firstBar, barCount, beatsPerBar, fontsLoaded])

  let x: number | null = null
  if (playhead !== null && anchors.length > 1) {
    const i = anchors.findIndex(([beat]) => beat > playhead)
    if (i > 0) {
      const [b0, x0] = anchors[i - 1]
      const [b1, x1] = anchors[i]
      x = x0 + ((playhead - b0) / (b1 - b0)) * (x1 - x0)
    } else if (i === -1) {
      x = anchors[anchors.length - 1][1]
    }
  }

  return (
    <div className="rhythm-staff">
      <div ref={ref} className="staff" />
      {x !== null && <div className="playhead" style={{ left: `${(x / WIDTH) * 100}%` }} />}
    </div>
  )
}
