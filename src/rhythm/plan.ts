// What a rhythm lesson plays: random bars, a fixed pattern repeated, a Yankı
// (the app plays a bar, the learner plays it back) or a song with its notes.

import { parseNote } from '../music/notes'
import { generateBars, parseRhythm, type RhythmValue, VALUE_BEATS } from './rhythm'

/** A well-known, copyright-free song, simplified to the five-finger position. */
export interface Tune {
  /** Turkish title. */
  title: string
  /** The title it is known by in its own language. */
  original: string
  /** Who wrote it or where it comes from, and when. */
  origin: string
  /** A sentence of general culture shown before playing. */
  fact: string
  /** Bars of "pitch/value" tokens: "E4/q D4/q C4/h | …"; a rest is just "qr". */
  notes: string
}

export interface RhythmPlan {
  bars: RhythmValue[][]
  /** Yankı: the bars the app plays and the learner only listens to. */
  listen: boolean[]
  /** A song: the note of each event in order, null for rests. */
  pitches?: (number | null)[]
}

const barBeats = (bar: RhythmValue[]) => bar.reduce((n, v) => n + VALUE_BEATS[v], 0)

function checkBars(bars: RhythmValue[][], beatsPerBar: number, what: string) {
  bars.forEach((bar, i) => {
    if (barBeats(bar) !== beatsPerBar) throw new Error(`${what}: bar ${i + 1} has ${barBeats(bar)} beats`)
  })
}

/** "q q h | e e q qr q" → bars, every one checked to fill the bar. */
export function parsePattern(text: string, beatsPerBar = 4): RhythmValue[][] {
  const bars = parseRhythm(text)
  checkBars(bars, beatsPerBar, text)
  return bars
}

/** A song's bars and notes. */
export function parseTune(tune: Tune, beatsPerBar = 4): { bars: RhythmValue[][]; pitches: (number | null)[] } {
  const pitches: (number | null)[] = []
  const bars = tune.notes
    .split('|')
    .map((bar) =>
      bar
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => {
          const [pitch, value] = token.includes('/') ? token.split('/') : [null, token]
          pitches.push(pitch ? parseNote(pitch) : null)
          return value as RhythmValue
        }),
    )
    .filter((bar) => bar.length > 0)
  checkBars(bars, beatsPerBar, tune.title)
  return { bars, pitches }
}

/** The fixed bars of `pattern` in turn until `count` bars are filled. */
export function cycleBars(pattern: RhythmValue[][], count: number): RhythmValue[][] {
  return Array.from({ length: count }, (_, i) => pattern[i % pattern.length])
}

export interface PlanSpec {
  beatsPerBar: number
  bars: number
  values: RhythmValue[]
  pattern?: string
  echo?: boolean
  tune?: Tune
}

/**
 * The bars of a lesson. A song plays as written (twice or more when `bars`
 * asks for it); a pattern repeats its bars
 * until `bars` is filled; Yankı plays each of them twice, first by the app
 * (listen) then by the learner, so `bars` counts the learner's bars.
 */
export function rhythmPlan(spec: PlanSpec, random: () => number = Math.random): RhythmPlan {
  if (spec.tune) {
    // A short song is sung again until `bars` is filled.
    const tune = parseTune(spec.tune, spec.beatsPerBar)
    const times = Math.max(1, Math.round(spec.bars / tune.bars.length))
    const bars = Array.from({ length: times }, () => tune.bars).flat()
    const pitches = Array.from({ length: times }, () => tune.pitches).flat()
    return { bars, pitches, listen: bars.map(() => false) }
  }
  if (spec.pattern) {
    const bars = cycleBars(parsePattern(spec.pattern, spec.beatsPerBar), spec.bars)
    if (!spec.echo) return { bars, listen: bars.map(() => false) }
    return { bars: bars.flatMap((b) => [b, b]), listen: bars.flatMap(() => [true, false]) }
  }
  const bars = generateBars({ values: spec.values, bars: spec.bars, beatsPerBar: spec.beatsPerBar, random })
  return { bars, listen: bars.map(() => false) }
}
