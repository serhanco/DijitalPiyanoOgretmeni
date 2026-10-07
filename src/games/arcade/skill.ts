// A skill provider feeds arcade games with targets, so any game can be
// played with any skill (treble or bass notes, both staves, timed rhythm
// notes; chords and scale steps later).

import { buildSequence } from '../noteHunter/session'
import { type Clef, pitchClass } from '../../music/notes'
import { isRest, layoutRhythm, type RhythmValue } from '../../rhythm/rhythm'

export interface SkillTarget {
  /** The note to show and to play. */
  midi: number
  /** Rhythm skills: when to play it, in beats from the first beat. */
  beat?: number
  /** Rhythm skills: the written value; a rest means "do not play". */
  value?: RhythmValue
  /** Grand-staff skills: the staff the note is written on (otherwise the provider's clef). */
  clef?: Clef
}

export interface SkillProvider {
  clef: Clef
  /** Every note the game may ask for, to size the playfield. */
  range: number[]
  /** Planned targets, in order. */
  targets: SkillTarget[]
  matches: (target: SkillTarget, pressed: number) => boolean
  /** Rhythm skills: any key counts, only the timing matters. */
  anyKey?: boolean
}

export interface NoteSkillOptions {
  clef: Clef
  notes: number[]
  length: number
  ignoreOctave?: boolean
  random?: () => number
  /** Grand-staff games: the staff each target is written on. */
  clefOf?: (midi: number) => Clef
}

const matcher = (ignoreOctave: boolean) => (t: SkillTarget, pressed: number) =>
  ignoreOctave ? pitchClass(t.midi) === pitchClass(pressed) : t.midi === pressed

export function noteSkill({
  clef,
  notes,
  length,
  ignoreOctave = false,
  random,
  clefOf,
}: NoteSkillOptions): SkillProvider {
  return {
    clef,
    range: [...notes].sort((a, b) => a - b),
    targets: buildSequence(notes, length, random).map((midi) => ({ midi, ...(clefOf && { clef: clefOf(midi) }) })),
    matches: matcher(ignoreOctave),
  }
}

export interface RhythmSkillOptions {
  clef: Clef
  bars: RhythmValue[][]
  /** Notes to play on the beats. One note with `anyKey` means "tap any key". */
  notes: number[]
  anyKey?: boolean
  ignoreOctave?: boolean
  beatsPerBar?: number
  random?: () => number
}

/** Timed targets: every note and rest of the bars gets a beat. */
export function rhythmSkill({
  clef,
  bars,
  notes,
  anyKey = false,
  ignoreOctave = false,
  beatsPerBar = 4,
  random = Math.random,
}: RhythmSkillOptions): SkillProvider {
  const events = layoutRhythm(bars, beatsPerBar)
  const played = events.filter((e) => !isRest(e.value)).length
  const pitches = anyKey ? [] : buildSequence(notes, Math.max(1, played), random)
  let i = 0
  const targets = events.map((e) => ({
    midi: anyKey || isRest(e.value) ? notes[0] : pitches[i++],
    beat: e.beat,
    value: e.value,
  }))
  const match = matcher(ignoreOctave)
  return {
    clef,
    range: [...notes].sort((a, b) => a - b),
    targets,
    matches: (t, pressed) => anyKey || match(t, pressed),
    anyKey,
  }
}
