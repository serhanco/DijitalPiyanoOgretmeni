// Written scores for the études: two staves of bars, each staff one or two
// voices (lanes), every note with its spelling, finger, tie and slur. The
// data comes from scripts/etudes/import.mjs (Mutopia, Public Domain); this
// file reads it into events for the score view and into `SongNote`s for the
// shared Nota Şelalesi engines (WaitSession, tempo mode). Pure.

import { type Clef, type Hand, LETTER_SEMITONES, type Letter } from '../../music/notes'
import type { Accidental, SpelledNote } from '../../music/scales'
import type { RhythmValue } from '../../rhythm/rhythm'
import type { SongNote } from '../songs/song'

/** What the import script writes for a piece. */
export interface ScoreSource {
  id: string
  /** The Mutopia folder it came from; null for an exercise written by rule (drills.ts). */
  mutopia: string | null
  title: string | null
  composer: string | null
  opus: string | null
  /** The printed edition the typesetter copied. */
  source: string | null
  typesetter: string | null
  licence: 'Public Domain'
  /** Time signature, e.g. [3, 4]. */
  time: [number, number]
  /** Key signature: "G", "Bb", "Gm". */
  key: string
  /** Length of an upbeat bar in quarter beats (0 when the piece starts on the downbeat). */
  pickup: number
  bars: number
  /** The tempo written in the source, quarter notes per minute. */
  bpm?: number
  /** Upper staff first; each voice is a list of bar strings. */
  staves: { clef: Clef; voices: string[][] }[]
}

export type NoteLength = 'w' | 'h' | 'q' | '8' | '16' | '32'

const LENGTH_BEATS: Record<NoteLength, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125 }

export interface ScoreNote extends SpelledNote {
  /** Unique in the piece; a tied note keeps the id of the note it continues (`head`). */
  id: number
  head: number
  finger: number | null
  /** Tied to the same key in the lane's next event. */
  tie: boolean
  /** The note this one is tied to, and the one tied to it. */
  tieTo: number | null
  tiedFrom: number | null
}

export interface ScoreEvent {
  /** From the first beat of the piece, in quarter beats. */
  beat: number
  beats: number
  length: NoteLength
  dots: number
  /** Empty for rests and spacers. */
  notes: ScoreNote[]
  kind: 'notes' | 'rest' | 'bar-rest' | 'spacer'
  staccato: boolean
  slurStart: boolean
  slurEnd: boolean
  /** A clef change written just before this event. */
  clefChange: Clef | null
  /** The clef in force for this event. */
  clef: Clef
}

export interface ScoreBar {
  index: number
  /** Every bar takes a full bar of time (an upbeat bar starts late), so bar i starts at i × beatsPerBar. */
  beat: number
  beats: number
  /** Where the written notes start: later than `beat` in an upbeat bar. */
  from: number
}

export interface ParsedScore {
  source: ScoreSource
  /** Quarter beats in a full bar. */
  beatsPerBar: number
  bars: ScoreBar[]
  /** Per staff: the clef at the start of each bar, and lanes (voices), each a list of bars of events. */
  staves: { clefs: Clef[]; lanes: ScoreEvent[][][] }[]
}

const NOTE_RE = /^([A-G])(##|#|bb|b)?(-?\d)(?::(\d))?(~)?$/
const LENGTH_RE = /^(w|h|q|8|16|32)(\.*)([*()]*)$/

const ACC: Record<string, Accidental> = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 }

function spell(text: string): Omit<ScoreNote, 'id' | 'head' | 'tieTo' | 'tiedFrom'> {
  const m = NOTE_RE.exec(text)
  if (!m) throw new Error(`bad note ${text}`)
  const letter = m[1].toLowerCase() as Letter
  const acc = ACC[m[2] ?? '']
  const octave = Number(m[3])
  return {
    letter,
    acc,
    octave,
    midi: (octave + 1) * 12 + LETTER_SEMITONES[letter] + acc,
    finger: m[4] ? Number(m[4]) : null,
    tie: !!m[5],
  }
}

const lengthBeats = (length: NoteLength, dots: number) => LENGTH_BEATS[length] * (2 - 2 ** -dots)

const REST = { notes: [], staccato: false, slurStart: false, slurEnd: false }

/** Reads a score; throws when a bar of a voice does not add up. */
export function parseScore(source: ScoreSource): ParsedScore {
  const [num, den] = source.time
  const beatsPerBar = (num * 4) / den
  const bars: ScoreBar[] = []
  for (let i = 0; i < source.bars; i++) {
    const beat = i * beatsPerBar
    bars.push({
      index: i,
      beat,
      beats: beatsPerBar,
      from: i === 0 && source.pickup ? beat + beatsPerBar - source.pickup : beat,
    })
  }
  let nextId = 0
  const staves = source.staves.map((staff, s) => {
    // The upper lane carries the clef changes; the other lanes follow them by time.
    const changes: { beat: number; clef: Clef }[] = [{ beat: -1, clef: staff.clef }]
    const clefAt = (beat: number) => changes.findLast((c) => c.beat <= beat)!.clef
    const clefs: Clef[] = []
    const lanes = staff.voices.map((voice, v) => {
      if (voice.length !== source.bars)
        throw new Error(`${source.id}: staff ${s + 1} voice ${v + 1} has ${voice.length} bars`)
      return voice.map((text, b) => {
        const bar = bars[b]
        const what = `${source.id}: staff ${s + 1} voice ${v + 1} bar ${b + 1}`
        let at = bar.from
        let clefChange: Clef | null = null
        const events: ScoreEvent[] = []
        const push = (e: Omit<ScoreEvent, 'clefChange' | 'clef' | 'beat'>) => {
          events.push({ ...e, beat: at, clefChange, clef: clefAt(at) })
          clefChange = null
          at += e.beats
        }
        const tokens = text.split(/\s+/).filter(Boolean)
        tokens.forEach((token, i) => {
          if (token.startsWith('@')) {
            if (v > 0) return
            const clef = token.slice(1) as Clef
            changes.push({ beat: at, clef })
            // A clef before the bar's first note is the bar's own clef, not a change inside it.
            if (i > 0) clefChange = clef
            return
          }
          if (token === 'R') {
            push({ ...REST, beats: bar.beat + bar.beats - at, length: 'w', dots: 0, kind: 'bar-rest' })
            return
          }
          const slash = token.lastIndexOf('/')
          const m = LENGTH_RE.exec(token.slice(slash + 1))
          if (slash < 0 || !m) throw new Error(`${what}: bad token ${token}`)
          const body = token.slice(0, slash)
          const length = m[1] as NoteLength
          const dots = m[2].length
          const kind = body === 's' ? 'spacer' : body === 'r' ? 'rest' : 'notes'
          push({
            beats: lengthBeats(length, dots),
            length,
            dots,
            notes:
              kind === 'notes'
                ? body.split('+').map((n) => {
                    const id = nextId++
                    return { ...spell(n), id, head: id, tieTo: null, tiedFrom: null }
                  })
                : [],
            kind,
            staccato: m[3].includes('*'),
            slurStart: m[3].includes('('),
            slurEnd: m[3].includes(')'),
          })
        })
        if (v === 0) clefs.push(clefAt(bar.from))
        // The last bar of a piece with an upbeat is short.
        if (Math.abs(at - bar.beat - bar.beats) > 1e-9 && (b < source.bars - 1 || !source.pickup))
          throw new Error(`${what} has ${at - bar.from} beats`)
        return events
      })
    })
    // A tied note keeps the id of the note it continues: the same key where it ends (in any lane of the staff,
    // since a voice can change lanes at a bar line).
    const starts = new Map<number, ScoreEvent[]>()
    for (const e of lanes.flat(2)) if (e.kind === 'notes') starts.set(e.beat, [...(starts.get(e.beat) ?? []), e])
    for (const e of lanes.flat(2))
      for (const n of e.notes) {
        if (!n.tie) continue
        const into = (starts.get(e.beat + e.beats) ?? []).flatMap((x) => x.notes).find((x) => x.midi === n.midi)
        if (!into) continue
        into.tiedFrom = n.id
        n.tieTo = into.id
      }
    const byId = new Map(lanes.flat(2).flatMap((e) => e.notes.map((n) => [n.id, n] as const)))
    for (const n of byId.values()) {
      let head = n
      while (head.tiedFrom !== null) head = byId.get(head.tiedFrom)!
      n.head = head.id
    }
    return { clefs, lanes }
  })
  return { source, beatsPerBar, bars, staves }
}

/** The written value closest to (not longer than) a played length, for the rhythm engine. */
const VALUES: [number, RhythmValue][] = [
  [4, 'w'],
  [3, 'hd'],
  [2, 'h'],
  [1.5, 'qd'],
  [1, 'q'],
  [0.75, 'ed'],
  [0.5, 'e'],
  [0.25, 's'],
]
export const valueOf = (beats: number): RhythmValue => VALUES.find(([b]) => b <= beats + 1e-9)?.[1] ?? 's'

const HAND_OF_STAFF: Hand[] = ['right', 'left']

/** The notes to play: tied notes joined into one, staff 1 the right hand, staff 2 the left. */
export function scoreNotes(score: ParsedScore): SongNote[] {
  const out: SongNote[] = []
  const byHead = new Map<number, SongNote>()
  score.staves.forEach((staff, s) => {
    const events = staff.lanes
      .flatMap((lane) => lane.flatMap((bar, b) => bar.map((e) => ({ e, b }))))
      .sort((x, y) => x.e.beat - y.e.beat)
    for (const { e, b } of events)
      for (const n of e.notes) {
        const head = byHead.get(n.head)
        if (head) {
          head.beats += e.beats
          head.value = valueOf(head.beats)
          continue
        }
        const note: SongNote = {
          midi: n.midi,
          beat: e.beat,
          value: valueOf(e.beats),
          beats: e.beats,
          hand: HAND_OF_STAFF[s],
          clef: e.clef,
          bar: b,
          ref: n.id,
        }
        byHead.set(n.id, note)
        out.push(note)
      }
  })
  return out.sort((a, b) => a.beat - b.beat || a.midi - b.midi)
}
