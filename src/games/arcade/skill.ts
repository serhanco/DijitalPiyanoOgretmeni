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
  /** Yankı: the app plays this note for the learner to hear; it is not judged. */
  demo?: boolean
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
  /** A song: the note of each event, in order (rests get null). Otherwise the notes are drawn from `notes`. */
  pitches?: (number | null)[]
  /** Yankı: bars the app plays for the learner to hear (`listen[bar]`). */
  listen?: boolean[]
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
  pitches,
  listen,
}: RhythmSkillOptions): SkillProvider {
  const events = layoutRhythm(bars, beatsPerBar)
  const played = events.filter((e) => !isRest(e.value)).length
  const drawn = anyKey || pitches ? [] : buildSequence(notes, Math.max(1, played), random)
  let i = 0
  const targets = events.map((e, k) => ({
    midi: pitches ? (pitches[k] ?? notes[0]) : anyKey || isRest(e.value) ? notes[0] : drawn[i++],
    beat: e.beat,
    value: e.value,
    ...(listen?.[e.bar] && { demo: true }),
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
