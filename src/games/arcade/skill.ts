// A skill provider feeds arcade games with targets, so any game can be
// played with any skill (treble notes today; bass notes, chords and scale
// steps later).

import { buildSequence } from '../noteHunter/session'
import { type Clef, pitchClass } from '../../music/notes'

export interface SkillTarget {
  /** The note to show and to play. */
  midi: number
}

export interface SkillProvider {
  clef: Clef
  /** Every note the game may ask for, to size the playfield. */
  range: number[]
  /** Planned targets, in order. */
  targets: SkillTarget[]
  matches: (target: SkillTarget, pressed: number) => boolean
}

export interface NoteSkillOptions {
  clef: Clef
  notes: number[]
  length: number
  ignoreOctave?: boolean
  random?: () => number
}

export function noteSkill({ clef, notes, length, ignoreOctave = false, random }: NoteSkillOptions): SkillProvider {
  return {
    clef,
    range: [...notes].sort((a, b) => a - b),
    targets: buildSequence(notes, length, random).map((midi) => ({ midi })),
    matches: (t, pressed) => (ignoreOctave ? pitchClass(t.midi) === pitchClass(pressed) : t.midi === pressed),
  }
}
