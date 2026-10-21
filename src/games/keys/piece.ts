// A well-known song carried into another key, degree by degree: the tune is
// written in C major, so each note's letter is its scale degree, and the same
// degree of the new key is spelled with that key's letters (B♭, never A♯).
// Pure.

import { LETTERS, type Letter } from '../../music/notes'
import {
  keyAccidentals,
  keySignature,
  parseTonic,
  type SpelledNote,
  scaleOctave,
  type Tonic,
  tonicName,
} from '../../music/scales'
import type { Tune } from '../../rhythm/plan'
import type { Step } from '../melody/session'

export interface PiecePart {
  tune: Tune
  /** The major key the tune is played in ("Bb"). */
  key: string
}

/** The tune's pitches, in order ("E4/q" → E4): rests left out. */
function tuneLetters(tune: Tune): { letter: Letter; octave: number }[] {
  return [...tune.notes.matchAll(/\b([A-G])(\d)\/\w+/g)].map((m) => ({
    letter: m[1].toLowerCase() as Letter,
    octave: Number(m[2]),
  }))
}

/** Semitones a note lies outside the treble staff (E4 to F5). */
const outsideTreble = (midi: number) => Math.max(0, 64 - midi, midi - 77)

/** The tune in `key` with the tonic in `octave`: C4 of the tune becomes the tonic. */
function inKey(tune: Tune, tonic: Tonic, octave: number): SpelledNote[] {
  return tuneLetters(tune).map(({ letter, octave: o }) => {
    const degree = LETTERS.indexOf(letter) + 7 * (o - 4)
    const shift = Math.floor(degree / 7)
    return scaleOctave(tonic, 'major', octave + shift)[degree - 7 * shift]
  })
}

/** The tune in the key, in the octave (3 or 4) that keeps it closest to the treble staff. */
export function transposeTune(tune: Tune, key: string): SpelledNote[] {
  const tonic = parseTonic(key)
  const cost = (notes: SpelledNote[]) => Math.max(...notes.map((n) => outsideTreble(n.midi)))
  const [low, high] = [inKey(tune, tonic, 3), inKey(tune, tonic, 4)]
  return cost(low) < cost(high) ? low : high
}

/** The steps of a piece, one note each, with the key signature of its key. */
export function pieceSteps(piece: PiecePart): Step[] {
  const tonic = parseTonic(piece.key)
  const keySig = keySignature(tonic, 'major')
  const keyAcc = keyAccidentals(tonic, 'major')
  return transposeTune(piece.tune, piece.key).map((n) => ({
    melody: 0,
    keySig,
    keyAcc,
    notes: [{ midi: n.midi, clef: 'treble', spelled: n }],
  }))
}

/** "Neşeye Övgü · Sol Majör". */
export const pieceTitle = (piece: PiecePart) => `${piece.tune.title} · ${tonicName(parseTonic(piece.key))} Majör`
