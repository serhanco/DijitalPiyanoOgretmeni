// Note helpers. A note is identified by its MIDI number (C4 = 60).

export type Clef = 'treble' | 'bass'

const LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'] as const
export type Letter = (typeof LETTERS)[number]

/** Turkish solfège names, indexed by letter. */
const SOLFEGE: Record<Letter, string> = {
  c: 'Do',
  d: 'Re',
  e: 'Mi',
  f: 'Fa',
  g: 'Sol',
  a: 'La',
  b: 'Si',
}

/** Semitone offset of each pitch class (sharp spelling) from C. */
const PITCH_CLASSES: { letter: Letter; sharp: boolean }[] = [
  { letter: 'c', sharp: false },
  { letter: 'c', sharp: true },
  { letter: 'd', sharp: false },
  { letter: 'd', sharp: true },
  { letter: 'e', sharp: false },
  { letter: 'f', sharp: false },
  { letter: 'f', sharp: true },
  { letter: 'g', sharp: false },
  { letter: 'g', sharp: true },
  { letter: 'a', sharp: false },
  { letter: 'a', sharp: true },
  { letter: 'b', sharp: false },
]

const LETTER_SEMITONES: Record<Letter, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }

export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

export function isBlackKey(midi: number): boolean {
  return PITCH_CLASSES[pitchClass(midi)].sharp
}

export function letterOf(midi: number): Letter {
  return PITCH_CLASSES[pitchClass(midi)].letter
}

/** Build a MIDI number from a letter and an octave, e.g. ('c', 4) → 60. */
export function midiFrom(letter: Letter, octave: number, sharp = false): number {
  return (octave + 1) * 12 + LETTER_SEMITONES[letter] + (sharp ? 1 : 0)
}

/** Parse "C4", "f#3", "Bb5". */
export function parseNote(name: string): number {
  const m = /^([a-gA-G])([#b]?)(-?\d)$/.exec(name.trim())
  if (!m) throw new Error(`Invalid note name: ${name}`)
  const letter = m[1].toLowerCase() as Letter
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return midiFrom(letter, Number(m[3])) + accidental
}

/** Solfège name with octave, e.g. 60 → "Do4", 61 → "Do#4". */
export function solfegeName(midi: number, withOctave = true): string {
  const pc = PITCH_CLASSES[pitchClass(midi)]
  const base = SOLFEGE[pc.letter] + (pc.sharp ? '#' : '')
  return withOctave ? `${base}${octaveOf(midi)}` : base
}

/** VexFlow key string, e.g. 60 → "c/4", 61 → "c#/4". */
export function vexKey(midi: number): string {
  const pc = PITCH_CLASSES[pitchClass(midi)]
  return `${pc.letter}${pc.sharp ? '#' : ''}/${octaveOf(midi)}`
}

/** Diatonic step count from C-1, so each staff line/space is one step. */
export function diatonicIndex(midi: number): number {
  return (octaveOf(midi) + 1) * 7 + LETTERS.indexOf(letterOf(midi))
}

/** Bottom and top staff lines (E4/F5 for treble, G2/A3 for bass). */
const STAFF_LINES: Record<Clef, { bottom: number; top: number }> = {
  treble: { bottom: diatonicIndex(64), top: diatonicIndex(77) },
  bass: { bottom: diatonicIndex(43), top: diatonicIndex(57) },
}

export type StaffPlacement = 'line' | 'space' | 'outside'

/** Where a note sits on the staff: on one of the five lines, in a space, or outside. */
export function staffPlacement(midi: number, clef: Clef): StaffPlacement {
  const d = diatonicIndex(midi)
  const { bottom, top } = STAFF_LINES[clef]
  if (d < bottom || d > top) return 'outside'
  return (d - bottom) % 2 === 0 ? 'line' : 'space'
}

export const PLACEMENT_LABELS: Record<StaffPlacement, string> = {
  line: 'Çizgi üzerindeki notalar',
  space: 'Aradaki notalar',
  outside: 'Porte dışı ve ek çizgi notaları',
}

/** All white keys between two MIDI numbers, inclusive. */
export function whiteKeysBetween(low: number, high: number): number[] {
  const out: number[] = []
  for (let n = low; n <= high; n++) if (!isBlackKey(n)) out.push(n)
  return out
}
