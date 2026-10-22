// Songs for Nota Şelalesi: a right-hand and an optional left-hand part, bar
// by bar, split into sections the learner can practise on their own. Pure.

import { type Clef, type Hand, parseNote } from '../../music/notes'
import { parseScore, type ScoreSource, scoreNotes } from '../etudes/score'
import type { Tune } from '../../rhythm/plan'
import { VALUE_BEATS, type RhythmValue } from '../../rhythm/rhythm'

/** A song: a `Tune` (title, original, origin, fact; `notes` is the right hand) with its left hand and sections. */
export interface Song extends Tune {
  id: string
  beatsPerBar: number
  /** Suggested tempo for the rhythm mode. */
  bpm: number
  /** Left hand, the same bar notation; "C3+G3/h" plays two keys together. */
  left?: string
  /** Bars per section, in order; the whole song is one section when left out. */
  sections?: number[]
  /** Études: the written score (both hands); `notes` and `left` are then unused. */
  score?: ScoreSource
}

/** Played notes are any value; rests (`qr`, `hr`, `wr`, `er`) only keep time. */
const REST_BEATS: Record<string, number> = { er: 0.5, qr: 1, hr: 2, wr: 4 }

export interface SongNote {
  midi: number
  /** From the first beat of the song (or of the part played). */
  beat: number
  value: RhythmValue
  beats: number
  hand: Hand
  clef: Clef
  /** Bar index from 0. */
  bar: number
  /** Études: the id of the written note (`ScoreNote.id`), to colour it in the score. */
  ref?: number
}

export interface Section {
  index: number
  /** First and last bar, from 0, inclusive. */
  from: number
  to: number
  label: string
}

export interface ParsedSong {
  notes: SongNote[]
  bars: number
  beatsPerBar: number
  sections: Section[]
}

export const clefOfHand = (hand: Hand): Clef => (hand === 'right' ? 'treble' : 'bass')

/** One hand's bars → notes, every bar checked to be full. */
export function parsePart(
  text: string,
  hand: Hand,
  beatsPerBar: number,
  what = '',
): { notes: SongNote[]; bars: number } {
  const notes: SongNote[] = []
  const bars = text
    .split('|')
    .map((b) => b.trim())
    .filter(Boolean)
  bars.forEach((bar, i) => {
    let beat = 0
    for (const token of bar.split(/\s+/)) {
      if (token in REST_BEATS) {
        beat += REST_BEATS[token]
        continue
      }
      const [pitches, value] = token.split('/') as [string, RhythmValue]
      if (!(value in VALUE_BEATS) || value === 'qr') throw new Error(`${what}: bad token ${token}`)
      for (const p of pitches.split('+'))
        notes.push({
          midi: parseNote(p),
          beat: i * beatsPerBar + beat,
          value,
          beats: VALUE_BEATS[value],
          hand,
          clef: clefOfHand(hand),
          bar: i,
        })
      beat += VALUE_BEATS[value]
    }
    if (Math.abs(beat - beatsPerBar) > 1e-9) throw new Error(`${what} (${hand}): bar ${i + 1} has ${beat} beats`)
  })
  return { notes, bars: bars.length }
}

export const sectionLabel = (index: number, from: number, to: number) =>
  `${index + 1}. bölüm (ölçü ${from + 1}–${to + 1})`

/** Both hands, sorted by time (left hand first on the same beat), and the sections. */
export function parseSong(song: Song): ParsedSong {
  const { notes, bars } = song.score ? scoreTimeline(song.score) : songTimeline(song)
  const sizes = song.sections ?? [bars]
  if (sizes.reduce((a, b) => a + b, 0) !== bars) throw new Error(`${song.title}: sections do not add up`)
  let from = 0
  const sections = sizes.map((size, index) => {
    const s = { index, from, to: from + size - 1, label: sectionLabel(index, from, from + size - 1) }
    from += size
    return s
  })
  return { notes, bars, beatsPerBar: song.beatsPerBar, sections }
}

function songTimeline(song: Song): { notes: SongNote[]; bars: number } {
  const right = parsePart(song.notes, 'right', song.beatsPerBar, song.title)
  const left = song.left ? parsePart(song.left, 'left', song.beatsPerBar, song.title) : null
  if (left && left.bars !== right.bars)
    throw new Error(`${song.title}: ${right.bars} bars in the right hand, ${left.bars} in the left`)
  const notes = [...(left?.notes ?? []), ...right.notes].sort((a, b) => a.beat - b.beat || a.midi - b.midi)
  return { notes, bars: right.bars }
}

function scoreTimeline(source: ScoreSource): { notes: SongNote[]; bars: number } {
  const score = parseScore(source)
  return { notes: scoreNotes(score), bars: score.bars.length }
}

export type SongHands = Hand | 'both'

export interface PartOptions {
  hands: SongHands
  /** Only these bars (from 0, inclusive); the part then starts at beat 0. */
  bars?: [number, number]
}

/** The notes a lesson plays: one hand or both, the whole song or some of its bars. */
export function songPart(parsed: ParsedSong, { hands, bars }: PartOptions): ParsedSong {
  const [from, to] = bars ?? [0, parsed.bars - 1]
  const shift = from * parsed.beatsPerBar
  const notes = parsed.notes
    .filter((x) => (hands === 'both' || x.hand === hands) && x.bar >= from && x.bar <= to)
    .map((x) => ({ ...x, beat: x.beat - shift, bar: x.bar - from }))
  const sections = parsed.sections
    .filter((s) => s.to >= from && s.from <= to)
    .map((s, index) => {
      const a = Math.max(s.from, from) - from
      const b = Math.min(s.to, to) - from
      // Labels keep the song's own bar numbers.
      return { index, from: a, to: b, label: sectionLabel(s.index, a + from, b + from) }
    })
  return { notes, bars: to - from + 1, beatsPerBar: parsed.beatsPerBar, sections }
}

/** Several songs one after another (Konser), each one a section. */
export function concatSongs(parts: { parsed: ParsedSong; title: string }[]): ParsedSong {
  const beatsPerBar = parts[0].parsed.beatsPerBar
  const notes: SongNote[] = []
  const sections: Section[] = []
  let bars = 0
  parts.forEach(({ parsed, title }, index) => {
    if (parsed.beatsPerBar !== beatsPerBar) throw new Error('Konser: songs in different metres')
    for (const x of parsed.notes) notes.push({ ...x, beat: x.beat + bars * beatsPerBar, bar: x.bar + bars })
    sections.push({ index, from: bars, to: bars + parsed.bars - 1, label: title })
    bars += parsed.bars
  })
  return { notes, bars, beatsPerBar, sections }
}

export const sectionOf = (sections: Section[], bar: number): number =>
  Math.max(
    0,
    sections.findIndex((s) => bar >= s.from && bar <= s.to),
  )

/** Every key the part uses, low to high. */
export const partKeys = (parsed: ParsedSong): number[] =>
  [...new Set(parsed.notes.map((x) => x.midi))].sort((a, b) => a - b)

/** What a Nota Şelalesi lesson plays. */
export interface SongSpec {
  /** One song, or several in a row (Konser). */
  songs: Song[]
  hands: SongHands
  /** Bekleyen mod (the notes wait for the keys) or ritimli mod (metronome). */
  mode: 'wait' | 'tempo'
  /** Only these bars of a single song (from 0, inclusive). */
  bars?: [number, number]
}

/** The notes and sections of a lesson. */
export function lessonPart(spec: SongSpec): ParsedSong {
  const part = (song: Song, bars?: [number, number]) => songPart(parseSong(song), { hands: spec.hands, bars })
  if (spec.songs.length === 1) return part(spec.songs[0], spec.bars)
  return concatSongs(spec.songs.map((s) => ({ parsed: part(s), title: s.title })))
}

/** The title shown in the report and on the start card. */
export const specTitle = (spec: SongSpec) => spec.songs.map((s) => s.title).join(' · ')
