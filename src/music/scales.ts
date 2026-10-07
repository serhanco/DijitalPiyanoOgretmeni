// Scales: spelling (letters and accidentals), key signatures, the standard
// one-octave fingerings and the thumb crossings they need. Pure data.

import { type Hand, LETTER_SEMITONES, LETTERS, type Letter, midiFrom, SOLFEGE } from './notes'

export type ScaleType = 'major' | 'natural' | 'harmonic' | 'melodic'
export type Accidental = -1 | 0 | 1

export interface Tonic {
  letter: Letter
  acc: Accidental
}

/** A note with its written name: B♭4 and A#4 are the same key but different notes on the staff. */
export interface SpelledNote {
  midi: number
  letter: Letter
  acc: Accidental
  octave: number
}

/** Semitones between the eight notes of one octave, going up. */
const STEPS: Record<ScaleType, number[]> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  natural: [2, 1, 2, 2, 1, 2, 2],
  harmonic: [2, 1, 2, 2, 1, 3, 1],
  // Raised sixth and seventh going up; going down it is the natural minor.
  melodic: [2, 1, 2, 2, 2, 2, 1],
}

export const SCALE_TYPE_LABELS: Record<ScaleType, string> = {
  major: 'Majör',
  natural: 'Doğal Minör',
  harmonic: 'Armonik Minör',
  melodic: 'Melodik Minör',
}

/** "C", "Bb", "F#". */
export function parseTonic(name: string): Tonic {
  const m = /^([A-Ga-g])([#b]?)$/.exec(name.trim())
  if (!m) throw new Error(`Invalid tonic: ${name}`)
  return { letter: m[1].toLowerCase() as Letter, acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 }
}

const accText = (acc: Accidental, flat: string) => (acc === 1 ? '#' : acc === -1 ? flat : '')

/** "Si♭4", "Fa#3", "Do4". */
export function spelledName(n: SpelledNote, withOctave = true): string {
  return `${SOLFEGE[n.letter]}${accText(n.acc, '♭')}${withOctave ? n.octave : ''}`
}

/** VexFlow key: "bb/4". */
export function vexSpelled(n: SpelledNote): string {
  return `${n.letter}${accText(n.acc, 'b')}/${n.octave}`
}

export function tonicName(t: Tonic): string {
  return `${SOLFEGE[t.letter]}${accText(t.acc, '♭')}`
}

/** "Si♭ Majör", "La Armonik Minör". */
export function scaleTitle(tonic: Tonic, type: ScaleType): string {
  return `${tonicName(tonic)} ${SCALE_TYPE_LABELS[type]}`
}

/**
 * One octave from the tonic in `octave` (eight notes, low to high). The
 * melodic minor's `down` form is the natural minor, as it is played coming down.
 */
export function scaleOctave(tonic: Tonic, type: ScaleType, octave: number, form: 'up' | 'down' = 'up'): SpelledNote[] {
  const steps = STEPS[type === 'melodic' && form === 'down' ? 'natural' : type]
  const first = LETTERS.indexOf(tonic.letter)
  let midi = midiFrom(tonic.letter, octave) + tonic.acc
  return Array.from({ length: 8 }, (_, i) => {
    if (i > 0) midi += steps[i - 1]
    const letter = LETTERS[(first + i) % 7]
    const oct = octave + Math.floor((first + i) / 7)
    const acc = midi - ((oct + 1) * 12 + LETTER_SEMITONES[letter])
    if (acc < -1 || acc > 1) throw new Error(`Scale needs a double accidental: ${tonic.letter} ${type}`)
    return { midi, letter, acc: acc as Accidental, octave: oct }
  })
}

/** VexFlow key signature name: "Bb", "Am". */
export function keySignature(tonic: Tonic, type: ScaleType): string {
  return `${tonic.letter.toUpperCase()}${accText(tonic.acc, 'b')}${type === 'major' ? '' : 'm'}`
}

/** The accidental the key signature gives each letter. */
export function keyAccidentals(tonic: Tonic, type: ScaleType): Record<Letter, Accidental> {
  const out = Object.fromEntries(LETTERS.map((l) => [l, 0])) as Record<Letter, Accidental>
  for (const n of scaleOctave(tonic, type === 'major' ? 'major' : 'natural', 4)) out[n.letter] = n.acc
  return out
}

const RIGHT = [1, 2, 3, 1, 2, 3, 4, 5]
const LEFT = [5, 4, 3, 2, 1, 3, 2, 1]
/** Scales whose fingering differs from the C major pattern (major and minor alike). */
const SPECIAL: Partial<Record<string, Partial<Record<Hand, number[]>>>> = {
  f: { right: [1, 2, 3, 4, 1, 2, 3, 4] },
  bb: { right: [2, 1, 2, 3, 1, 2, 3, 4], left: [3, 2, 1, 4, 3, 2, 1, 3] },
}

/** Standard fingering of one octave going up, one finger per note (1 = thumb). */
export function scaleFingering(tonic: Tonic, hand: Hand): number[] {
  const special = SPECIAL[`${tonic.letter}${accText(tonic.acc, 'b')}`]?.[hand]
  return special ?? (hand === 'right' ? RIGHT : LEFT)
}

/** The thumb passes under the hand, or a finger crosses over the thumb. */
export type Crossing = 'under' | 'over'

export const CROSSING_TIPS: Record<Crossing, string> = {
  under: 'Başparmağı altından geçir',
  over: 'Parmağı başparmağın üstünden geçir',
}

/**
 * The crossing needed to play `finger` after `prevFinger`. Without one the
 * finger numbers follow the pitch (the right hand's grow going up, the left
 * hand's shrink).
 */
export function crossingBetween(
  prevMidi: number,
  prevFinger: number,
  midi: number,
  finger: number,
  hand: Hand,
): Crossing | null {
  if (midi === prevMidi || finger === prevFinger) return null
  const expected = Math.sign(midi - prevMidi) * (hand === 'right' ? 1 : -1)
  if (Math.sign(finger - prevFinger) === expected) return null
  return finger === 1 ? 'under' : 'over'
}

export interface RunNote extends SpelledNote {
  finger: number
  /** The crossing needed to reach this note from the previous one. */
  cross: Crossing | null
}

/**
 * A scale up an octave and back (15 notes) from the tonic in `octave`.
 * `downFirst` starts on the tonic of `octave`, goes down an octave and back
 * up: the left hand's part in contrary motion.
 */
export function scaleRun(tonic: Tonic, type: ScaleType, hand: Hand, octave: number, downFirst = false): RunNote[] {
  const fingers = scaleFingering(tonic, hand)
  const reversed = [...fingers].reverse()
  let notes: SpelledNote[]
  let fs: number[]
  if (downFirst) {
    notes = [
      ...scaleOctave(tonic, type, octave - 1, 'down').reverse(),
      ...scaleOctave(tonic, type, octave - 1).slice(1),
    ]
    fs = [...reversed, ...fingers.slice(1)]
  } else {
    notes = [...scaleOctave(tonic, type, octave), ...scaleOctave(tonic, type, octave, 'down').reverse().slice(1)]
    fs = [...fingers, ...reversed.slice(1)]
  }
  return notes.map((n, i) => ({
    ...n,
    finger: fs[i],
    cross: i === 0 ? null : crossingBetween(notes[i - 1].midi, fs[i - 1], n.midi, fs[i], hand),
  }))
}
