// The études' score (VexFlow): one line of bars on the grand staff, or on the
// staff of the hand that plays. Bar lines, stems and beams, dots, ties and
// slurs, finger numbers, staccato dots, clef changes, the key signature and
// accidentals as printed (an accidental lasts to the bar line). Played notes
// turn green, the notes due now blue, a wrong press red. The line turns on
// the last bar it shows, which then opens the next line, so the next notes
// are always in sight.

import { useEffect, useRef, useState } from 'react'
import {
  Accidental,
  Annotation,
  AnnotationVerticalJustify,
  Articulation,
  Beam,
  ClefNote,
  Curve,
  Dot,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  type StemmableNote,
  type Tickable,
  Voice,
} from 'vexflow/bravura'
import type { ParsedScore, ScoreEvent, ScoreNote } from '../games/etudes/score'
import type { Clef, Letter } from '../music/notes'
import { type Accidental as Acc, keyAccidentals, parseTonic, vexSpelled } from '../music/scales'
import { setStaffViewBox } from './staffCrop'

export type ScoreNoteState = 'todo' | 'current' | 'done' | 'off' | 'wrong'

interface Props {
  score: ParsedScore
  /** The bars of the lesson, from 0, inclusive. */
  bars: [number, number]
  /** Staves to draw: 0 the right hand, 1 the left. */
  staves: number[]
  /** The bar being played (in the score's numbering). */
  current: number
  /** The state of a written note, by `ScoreNote.head`. */
  stateOf: (head: number) => ScoreNoteState
  /** Changes whenever a state changes, so the drawing is redone. */
  version: string
}

const COLORS: Record<ScoreNoteState, string> = {
  todo: '#2b2f3a',
  current: '#1cb0f6',
  done: '#22a559',
  off: '#ff9600',
  wrong: '#ff4b4b',
}
const FINGER_COLOR = '#6b7280'
const CURRENT_BAR = 'rgba(28, 176, 246, 0.10)'

/** The drawing's own width; the SVG scales to the screen. A line is never narrower than its bars need. */
const MIN_WIDTH = 360
const MAX_WIDTH = 1100
const STAFF_GAP = 100
const TOP = 24
/** At most this many bars on a line. */
const MAX_BARS = 4

const VEX_LENGTH = { w: 'w', h: 'h', q: 'q', '8': '8', '16': '16', '32': '32' } as const
const REST_KEY: Record<Clef, string> = { treble: 'b/4', bass: 'd/3' }
const accSign = (acc: number) => (acc < 0 ? 'b'.repeat(-acc) : acc > 0 ? '#'.repeat(acc) : 'n')

let fontsReady: Promise<unknown> | null = null
function waitForFonts() {
  fontsReady ??= document.fonts ? document.fonts.load('30px Bravura').catch(() => undefined) : Promise.resolve()
  return fontsReady
}

function keyLetters(key: string): Record<Letter, Acc> {
  const minor = key.endsWith('m')
  return keyAccidentals(parseTonic(minor ? key.slice(0, -1) : key), minor ? 'natural' : 'major')
}

/** Rough room a bar needs: notes of its busiest lane. */
function barWeight(score: ParsedScore, bar: number, staves: number[]): number {
  const counts = staves.flatMap((s) =>
    score.staves[s].lanes.map((lane) => lane[bar].filter((e) => e.kind !== 'spacer').length),
  )
  return 40 + 26 * Math.max(1, ...counts)
}

/** Bars of the line that starts at `start`: as many as fit, at most MAX_BARS. */
function lineFrom(score: ParsedScore, start: number, last: number, width: number, staves: number[]): number[] {
  const out = [start]
  let used = barWeight(score, start, staves) + 90
  for (let b = start + 1; b <= last && out.length < MAX_BARS; b++) {
    used += barWeight(score, b, staves)
    if (used > width) break
    out.push(b)
  }
  return out
}

interface Drawn {
  note: StaveNote
  event: ScoreEvent
  /** Staff and lane: slurs stay inside a voice. */
  lane: string
}

export function ScoreView({ score, bars, staves, current, stateOf, version }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [boxWidth, setWidth] = useState(MIN_WIDTH)
  const start = useRef(bars[0])

  useEffect(() => {
    let alive = true
    waitForFonts().then(() => alive && setFontsLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // As large as the box allows: the drawing is scaled to the box's width, and must not be taller than it.
    const measure = () => {
      const height = TOP + staves.length * STAFF_GAP + 20
      const fit = el.clientHeight > 0 ? (height * el.clientWidth) / el.clientHeight : 0
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(Math.max(el.clientWidth * 0.9, fit)))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [staves.length])

  // The line: kept while the current bar is on it and not its last bar; a jump (a repeat) starts a line there.
  const at = Math.max(bars[0], Math.min(bars[1], current))
  let line = lineFrom(score, start.current, bars[1], boxWidth, staves)
  const end = line[line.length - 1]
  if (at < line[0] || at > end || (at === end && at < bars[1] && line.length > 1)) {
    start.current = at
    line = lineFrom(score, at, bars[1], boxWidth, staves)
  }
  const lineKey = line.join(',')

  useEffect(() => {
    const el = ref.current
    if (!el || !fontsLoaded) return
    el.innerHTML = ''
    const height = TOP + staves.length * STAFF_GAP + 20
    const source = score.source
    const grand = staves.length === 2
    const left = grand ? 28 : 8
    const keyAcc = keyLetters(source.key)
    const weights = line.map((b) => barWeight(score, b, staves))
    const total = weights.reduce((a, b) => a + b, 0)
    // Staves: the first bar of the line carries the clef, key and (at the start) the time signature.
    const header = 90 + (line[0] === 0 ? 30 : 0)
    // A busy bar alone on a narrow screen is drawn wider and scaled down rather than squeezed.
    const width = Math.max(boxWidth, left + 8 + header + total)
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const ctx = renderer.getContext()
    const room = width - left - 8 - header
    let x = left
    const barStaves = line.map((b, i) => {
      const w = (room * weights[i]) / total + (i === 0 ? header : 0)
      const row = staves.map((s, k) => {
        const st = new Stave(x, TOP + k * STAFF_GAP, w)
        if (i === 0) {
          st.addClef(score.staves[s].clefs[b])
          st.addKeySignature(source.key)
          if (b === 0) st.addTimeSignature(source.time[0] === 2 && source.time[1] === 2 ? 'C|' : source.time.join('/'))
        }
        if (b === bars[1]) st.setEndBarType(b === score.bars.length - 1 ? 3 : 1)
        st.setContext(ctx).draw()
        return st
      })
      x += w
      return row
    })
    if (grand) {
      const first = barStaves[0]
      for (const type of [StaveConnector.type.BRACE, StaveConnector.type.SINGLE_LEFT])
        new StaveConnector(first[0], first[1]).setType(type).setContext(ctx).draw()
      const last = barStaves[barStaves.length - 1]
      new StaveConnector(last[0], last[1]).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw()
    }

    // The bar being played, shaded behind the notes (none when `current` is outside the bars).
    const ci = current >= bars[0] && current <= bars[1] ? line.indexOf(at) : -1
    if (ci >= 0) {
      const st = barStaves[ci]
      const x0 = ci === 0 ? st[0].getNoteStartX() - 6 : st[0].getX()
      const top = st[0].getYForLine(0) - 14
      const bottom = st[st.length - 1].getYForLine(4) + 14
      ctx.save()
      ctx.setFillStyle(CURRENT_BAR)
      ctx.fillRect(x0, top, st[0].getX() + st[0].getWidth() - x0, bottom - top)
      ctx.restore()
    }

    const drawn: Drawn[] = []
    line.forEach((b, i) => {
      const voices: Voice[] = []
      const voiceStaves: Stave[] = []
      const beams: Beam[] = []
      const bar = score.bars[b]
      staves.forEach((s, k) => {
        const staff = score.staves[s]
        const lanes = staff.lanes.map((lane) => lane[b])
        const split = lanes.length > 1 && lanes[1].some((e) => e.kind !== 'spacer')
        // Accidentals as printed: from the key signature, changed by an accidental until the bar line.
        const inForce = new Map<string, number>()
        const marks = new Map<ScoreNote, boolean>()
        const all = lanes.flatMap((l) => l.filter((e) => e.kind === 'notes')).sort((p, q) => p.beat - q.beat)
        for (const e of all)
          for (const n of e.notes) {
            const id = `${n.letter}${n.octave}`
            const now = inForce.get(id) ?? keyAcc[n.letter]
            const continued = n.head !== n.id && e.beat === bar.from
            marks.set(n, !continued && now !== n.acc)
            inForce.set(id, n.acc)
          }
        lanes.forEach((events, li) => {
          const tickables: Tickable[] = []
          const notes: StaveNote[] = []
          for (const e of events) {
            if (e.clefChange && e.beat > bar.from) tickables.push(new ClefNote(e.clefChange, 'small'))
            const duration = VEX_LENGTH[e.length]
            if (e.kind === 'spacer') {
              tickables.push(new GhostNote({ duration, dots: e.dots }))
              continue
            }
            const stemDirection = split ? (li === 0 ? 1 : -1) : undefined
            const sn =
              e.kind === 'notes'
                ? new StaveNote({
                    keys: e.notes.map(vexSpelled),
                    duration,
                    dots: e.dots,
                    clef: e.clef,
                    ...(stemDirection ? { stemDirection } : { autoStem: true }),
                  })
                : new StaveNote({
                    keys: [
                      split
                        ? li === 0
                          ? e.clef === 'treble'
                            ? 'e/5'
                            : 'g/3'
                          : e.clef === 'treble'
                            ? 'f/4'
                            : 'b/2'
                        : REST_KEY[e.clef],
                    ],
                    duration: e.kind === 'bar-rest' ? 'wr' : `${duration}r`,
                    dots: e.kind === 'bar-rest' ? 0 : e.dots,
                    clef: e.clef,
                    ...(e.kind === 'bar-rest' && { alignCenter: true }),
                  })
            if (e.dots && e.kind !== 'bar-rest') Dot.buildAndAttach([sn], { all: true })
            e.notes.forEach((n, j) => {
              if (marks.get(n)) sn.addModifier(new Accidental(accSign(n.acc)), j)
            })
            const fingers = e.notes.filter((n) => n.finger !== null && n.head === n.id)
            if (fingers.length) {
              const below = split ? li === 1 : s === 1
              const text = (below ? fingers : [...fingers].reverse()).map((n) => n.finger).join('\n')
              const a = new Annotation(text)
                .setVerticalJustification(below ? AnnotationVerticalJustify.BOTTOM : AnnotationVerticalJustify.TOP)
                .setFont('Nunito Variable, Nunito, sans-serif', 11, 'bold')
              a.setStyle({ fillStyle: FINGER_COLOR, strokeStyle: FINGER_COLOR })
              sn.addModifier(a, 0)
            }
            if (e.staccato) sn.addModifier(new Articulation('a.').setPosition(sn.getStemDirection() === 1 ? 4 : 3), 0)
            if (e.kind === 'notes') {
              // A chord takes the colour of its notes; a note still due inside a played chord stays blue.
              const states = e.notes.map((n) => stateOf(n.head))
              const main = states.includes('wrong')
                ? 'wrong'
                : states.includes('current')
                  ? 'current'
                  : states.every((st) => st === 'done')
                    ? 'done'
                    : states.includes('off')
                      ? 'off'
                      : 'todo'
              sn.setStyle({ fillStyle: COLORS[main], strokeStyle: COLORS[main] })
              states.forEach((st, j) => {
                if (st !== main) sn.setKeyStyle(j, { fillStyle: COLORS[st], strokeStyle: COLORS[st] })
              })
              drawn.push({ note: sn, event: e, lane: `${s}/${li}` })
              notes.push(sn)
            }
            tickables.push(sn)
          }
          const voice = new Voice({ numBeats: source.time[0], beatValue: source.time[1] })
            .setStrict(false)
            .addTickables(tickables)
          voices.push(voice)
          voiceStaves.push(barStaves[i][k])
          beams.push(
            ...Beam.generateBeams(notes as StemmableNote[], {
              groups: Beam.getDefaultBeamGroups(source.time.join('/')),
              ...(split && { maintainStemDirections: true }),
            }),
          )
        })
      })
      // One formatter for the bar keeps both staves' notes in line.
      const st = barStaves[i][0]
      const formatter = new Formatter()
      for (const row of barStaves[i]) formatter.joinVoices(voices.filter((_, v) => voiceStaves[v] === row))
      formatter.format(voices, Math.max(40, st.getNoteEndX() - st.getNoteStartX() - 14))
      voices.forEach((v, n) => v.draw(ctx, voiceStaves[n]))
      for (const beam of beams) beam.setContext(ctx).draw()
    })

    // Ties and slurs between the notes on this line; ones that leave the line run to its edge.
    const byNote = new Map<number, { d: Drawn; index: number }>()
    for (const d of drawn) d.event.notes.forEach((n, index) => byNote.set(n.id, { d, index }))
    for (const d of drawn)
      d.event.notes.forEach((n, j) => {
        const to = n.tieTo === null ? undefined : byNote.get(n.tieTo)
        if (n.tieTo !== null)
          new StaveTie({
            firstNote: d.note,
            firstIndexes: [j],
            ...(to && { lastNote: to.d.note, lastIndexes: [to.index] }),
          })
            .setContext(ctx)
            .draw()
        // Tied from the line before.
        if (n.tiedFrom !== null && !byNote.has(n.tiedFrom))
          new StaveTie({ lastNote: d.note, lastIndexes: [j] }).setContext(ctx).draw()
      })
    const lanes = new Map<string, Drawn[]>()
    for (const d of drawn) lanes.set(d.lane, [...(lanes.get(d.lane) ?? []), d])
    for (const lane of lanes.values()) {
      lane.sort((p, q) => p.event.beat - q.event.beat)
      let from: Drawn | null = null
      for (const d of lane) {
        if (d.event.slurStart) from = d
        if (d.event.slurEnd && from && from !== d) {
          new Curve(from.note, d.note, { thickness: 2 }).setContext(ctx).draw()
          from = null
        }
      }
      const last = lane[lane.length - 1]
      if (from && from !== last) new Curve(from.note, last.note, { thickness: 2 }).setContext(ctx).draw()
    }

    const svg = el.querySelector('svg')
    if (svg) {
      setStaffViewBox(svg, width, height)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.removeProperty('width')
      svg.style.removeProperty('height')
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', `Nota: ölçü ${line[0] + 1}–${line[line.length - 1] + 1}`)
    }
    // `version` stands for the states `stateOf` reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, lineKey, staves.join(','), at, version, fontsLoaded, boxWidth, bars[1]])

  return <div className="staff score-view" ref={ref} data-bars={lineKey} data-current={at} />
}
