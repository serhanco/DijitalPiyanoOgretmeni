// Nota Şelalesi, rhythm mode: the song's notes as timed targets for the shared
// `BeatTrack` (metronome, count-in, judgements and holds come from BeatFrame).

import { pitchClass } from '../../music/notes'
import type { RhythmValue } from '../../rhythm/rhythm'
import type { SkillProvider } from '../arcade/skill'
import { type ParsedSong, partKeys } from './song'

/** A whole bar as one value: BeatFrame only counts the bars and their beats. */
const BAR_VALUE: Record<number, RhythmValue> = { 3: 'hd', 4: 'w' }

export function tempoPlan(song: ParsedSong, ignoreOctave = false): { bars: RhythmValue[][]; skill: SkillProvider } {
  const value = BAR_VALUE[song.beatsPerBar]
  if (!value) throw new Error(`No bar value for ${song.beatsPerBar}/4`)
  return {
    bars: Array.from({ length: song.bars }, () => [value]),
    skill: {
      clef: song.notes.some((x) => x.hand === 'right') ? 'treble' : 'bass',
      range: partKeys(song),
      targets: song.notes.map((x) => ({ midi: x.midi, beat: x.beat, value: x.value, clef: x.clef })),
      matches: (t, pressed) => (ignoreOctave ? pitchClass(t.midi) === pitchClass(pressed) : t.midi === pressed),
    },
  }
}
