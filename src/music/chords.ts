// Chords: spelling by thirds, inversions, the standard block fingerings,
// names, recognising a chord from the keys played, progressions with smooth
// voice leading, and arpeggios with their fingers and crossings. Pure data.

import { type Clef, type Hand, LETTER_SEMITONES, LETTERS, midiFrom, pitchClass } from './notes'
import {
  type Accidental,
  crossingBetween,
  parseTonic,
  type RunNote,
  scaleOctave,
  type SpelledNote,
  type Tonic,
  tonicName,
} from './scales'

export type ChordQuality = 'major' | 'minor' | 'dim' | 'dom7' | 'maj7' | 'min7'
/** 0 = root position; 1, 2 (and 3 for seventh chords) = inversions. */
export type Inversion = 0 | 1 | 2 | 3

/** Semitones of each chord tone above the root. */
const INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
}

export const QUALITY_LABELS: Record<ChordQuality, string> = {
  major: 'Majör',
  minor: 'Minör',
  dim: 'Eksik',
  dom7: '7',
  maj7: 'Majör 7',
  min7: 'Minör 7',
}

/** Report topics: chord families. */
export type QualityGroup = 'major' | 'minor' | 'dim' | 'seventh'
export const QUALITY_GROUP: Record<ChordQuality, QualityGroup> = {
  major: 'major',
  minor: 'minor',
  dim: 'dim',
  dom7: 'seventh',
  maj7: 'seventh',
  min7: 'seventh',
}
export const GROUP_LABELS: Record<QualityGroup, string> = {
  major: 'Majör akorlar',
  minor: 'Minör akorlar',
  dim: 'Eksik akorlar',
  seventh: 'Yedili akorlar',
}

export const INVERSION_LABELS = ['Kök durum', '1. çevrim', '2. çevrim', '3. çevrim'] as const

export const chordSize = (q: ChordQuality) => INTERVALS[q].length

/** "Do Majör", "La Minör", "Sol7", "Re Minör 7", "Si Eksik". */
export function chordName(root: Tonic, quality: ChordQuality): string {
  return quality === 'dom7' ? `${tonicName(root)}7` : `${tonicName(root)} ${QUALITY_LABELS[quality]}`
}

/** Short symbol for small labels: "Do", "Lam", "Sol7", "Domaj7", "Rem7", "Si°". */
export function chordSymbol(root: Tonic, quality: ChordQuality): string {
  const suffix = { major: '', minor: 'm', dim: '°', dom7: '7', maj7: 'maj7', min7: 'm7' }[quality]
  return `${tonicName(root)}${suffix}`
}

/** The chord in root position, the root in `octave`, spelled by thirds (B♭ D F, never A# D F). */
export function chordTones(root: Tonic, quality: ChordQuality, octave: number): SpelledNote[] {
  const first = LETTERS.indexOf(root.letter)
  const rootMidi = midiFrom(root.letter, octave) + root.acc
  return INTERVALS[quality].map((semis, i) => {
    const index = first + 2 * i
    const letter = LETTERS[index % 7]
    const oct = octave + Math.floor(index / 7)
    const midi = rootMidi + semis
    const acc = midi - ((oct + 1) * 12 + LETTER_SEMITONES[letter])
    if (acc < -2 || acc > 2) throw new Error(`Chord needs a triple accidental: ${root.letter} ${quality}`)
    return { midi, letter, acc: acc as Accidental, octave: oct }
  })
}

const up = (n: SpelledNote, octaves = 1): SpelledNote => ({
  ...n,
  midi: n.midi + 12 * octaves,
  octave: n.octave + octaves,
})

/** The chord with its lowest `inversion` tones moved up an octave, low to high. */
export function invert(tones: SpelledNote[], inversion: Inversion): SpelledNote[] {
  return [...tones.slice(inversion), ...tones.slice(0, inversion).map((n) => up(n))]
}

/**
 * Block-chord fingers, low to high (1 = thumb). Right hand 1-3-5, 1-2-5 for
 * the first inversion; left hand 5-3-1, 5-2-1 for the second inversion;
 * seventh chords 1-2-3-5 and 5-3-2-1.
 */
export function chordFingers(size: number, inversion: Inversion, hand: Hand): number[] {
  // Seventh chords: an inversion with a second at the top (or, in the left hand, at the bottom) uses 4.
  if (size === 4)
    return hand === 'right'
      ? inversion === 1
        ? [1, 2, 4, 5]
        : [1, 2, 3, 5]
      : inversion === 3
        ? [5, 4, 2, 1]
        : [5, 3, 2, 1]
  if (hand === 'right') return inversion === 1 ? [1, 2, 5] : [1, 3, 5]
  return inversion === 2 ? [5, 2, 1] : [5, 3, 1]
}

/** Who plays a chord: one hand, or the left hand's bass (the root) under the right hand's chord. */
export type ChordHands = 'right' | 'left' | 'both'

export interface ChordTone extends SpelledNote {
  clef: Clef
  hand: Hand
  finger: number
}

export interface ChordTarget {
  root: Tonic
  quality: ChordQuality
  inversion: Inversion
  hands: ChordHands
  /** Low to high; with both hands the first note is the left hand's bass. */
  notes: ChordTone[]
  /** Progressions: the chord's degree in the key ("IV", "V7"). */
  numeral?: string
}

/** Highest note a right-hand chord may reach, and a left-hand one. */
const RIGHT_TOP = 79 // G5
const LEFT_TOP = 60 // C4
/** Lowest note of a right-hand chord. */
const RIGHT_BOTTOM = 55 // G3

function handTones(tones: SpelledNote[], hand: Hand, inversion: Inversion): ChordTone[] {
  const fingers = chordFingers(tones.length, inversion, hand)
  return tones.map((n, i) => ({ ...n, clef: hand === 'right' ? 'treble' : 'bass', hand, finger: fingers[i] }))
}

/** The left hand's bass note under a two-hand chord: the root, in the octave below middle C (G3 at most). */
function bassNote(root: Tonic): ChordTone {
  const [tone] = chordTones(root, 'major', 3)
  const n = tone.midi > 55 ? up(tone, -1) : tone
  return { ...n, clef: 'bass', hand: 'left', finger: 5 }
}

/** The chord's notes for its hands: `tones` in one hand, or under the right hand with the left hand's bass. */
function withBass(target: Omit<ChordTarget, 'notes'>, tones: SpelledNote[]): ChordTarget {
  if (target.hands === 'left') return { ...target, notes: handTones(tones, 'left', target.inversion) }
  const right = handTones(tones, 'right', target.inversion)
  return { ...target, notes: target.hands === 'both' ? [bassNote(target.root), ...right] : right }
}

/**
 * A chord where it reads well: the right hand around the treble staff
 * (never above G5), the left hand around the bass staff (never above
 * middle C).
 */
export function chordTarget(
  root: string | Tonic,
  quality: ChordQuality,
  inversion: Inversion = 0,
  hands: ChordHands = 'right',
  numeral?: string,
): ChordTarget {
  const tonic = typeof root === 'string' ? parseTonic(root) : root
  const left = hands === 'left'
  let tones = invert(chordTones(tonic, quality, left ? 3 : 4), inversion)
  const top = left ? LEFT_TOP : RIGHT_TOP
  while (tones[tones.length - 1].midi > top) tones = tones.map((n) => up(n, -1))
  return withBass({ root: tonic, quality, inversion, hands, ...(numeral && { numeral }) }, tones)
}

/** "Do Majör · 1. çevrim". */
export function chordTitle(t: ChordTarget, withInversion = true): string {
  const name = chordName(t.root, t.quality)
  return withInversion ? `${name} · ${INVERSION_LABELS[t.inversion].toLowerCase()}` : name
}

/** The note that must be lowest: the bass with both hands, else the chord's lowest note. */
export const bassOf = (t: ChordTarget) => t.notes[0]

/** Notes of the chord played by the right (or only) hand, low to high. */
export const upperNotes = (t: ChordTarget) => (t.hands === 'both' ? t.notes.slice(1) : t.notes)

/** Fingers as written above a chord: "1-3-5". With both hands, "sol el 5 · sağ el 1-3-5". */
export function fingerText(t: ChordTarget): string {
  const upper = upperNotes(t)
    .map((n) => n.finger)
    .join('-')
  return t.hands === 'both' ? `sol el 5 · sağ el ${upper}` : upper
}

// --- Recognising a chord from keys ---

export interface ChordGuess {
  root: number
  quality: ChordQuality
  inversion: Inversion
}

/**
 * The chord a set of keys makes (any octave, doublings allowed), with the
 * inversion from the lowest key. Null when the keys make no known chord.
 */
export function identifyChord(midis: number[]): ChordGuess | null {
  if (midis.length < 3) return null
  const pcs = [...new Set(midis.map(pitchClass))]
  const lowest = pitchClass(Math.min(...midis))
  for (const root of pcs)
    for (const quality of Object.keys(INTERVALS) as ChordQuality[]) {
      const want = INTERVALS[quality].map((s) => (root + s) % 12)
      if (want.length !== pcs.length || !want.every((pc) => pcs.includes(pc))) continue
      const inversion = want.indexOf(lowest) as Inversion
      return { root, quality, inversion }
    }
  return null
}

// --- Progressions ---

/** Degree (0 = tonic) and quality of each Roman numeral in a major key. */
const NUMERALS: Record<string, { degree: number; quality: ChordQuality }> = {
  I: { degree: 0, quality: 'major' },
  ii: { degree: 1, quality: 'minor' },
  iii: { degree: 2, quality: 'minor' },
  IV: { degree: 3, quality: 'major' },
  V: { degree: 4, quality: 'major' },
  V7: { degree: 4, quality: 'dom7' },
  vi: { degree: 5, quality: 'minor' },
  'vii°': { degree: 6, quality: 'dim' },
}

/**
 * The same in a minor key, on the natural minor's degrees; V, V7 and vii°
 * come from the harmonic minor (the raised seventh degree, `raise`).
 */
const MINOR_NUMERALS: Record<string, { degree: number; quality: ChordQuality; raise?: boolean }> = {
  i: { degree: 0, quality: 'minor' },
  'ii°': { degree: 1, quality: 'dim' },
  III: { degree: 2, quality: 'major' },
  iv: { degree: 3, quality: 'minor' },
  V: { degree: 4, quality: 'major' },
  V7: { degree: 4, quality: 'dom7' },
  VI: { degree: 5, quality: 'major' },
  VII: { degree: 6, quality: 'major' },
  'vii°': { degree: 6, quality: 'dim', raise: true },
}

/** The triads on the seven degrees of a key, I to vii° (major) or i to vii° (minor, with the harmonic V). */
export const MAJOR_DEGREES = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] as const
export const MINOR_DEGREES = ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°'] as const

/** The root and quality of a numeral in a key ("G", "V7"); `minor` reads it in the minor key on that tonic. */
export function degreeChord(key: string, numeral: string, minor = false): { root: Tonic; quality: ChordQuality } {
  const n = (minor ? MINOR_NUMERALS : NUMERALS)[numeral]
  if (!n) throw new Error(`Unknown numeral: ${numeral}`)
  const { letter, acc } = scaleOctave(parseTonic(key), minor ? 'natural' : 'major', 4)[n.degree]
  const raise = 'raise' in n && n.raise ? 1 : 0
  return { root: { letter, acc: (acc + raise) as Accidental }, quality: n.quality }
}

/** How far a chord's notes move from the previous chord's: each note to its nearest neighbour. */
export function movement(from: number[], to: number[]): number {
  return to.reduce((n, m) => n + Math.min(...from.map((f) => Math.abs(f - m))), 0)
}

/** Every inversion of a chord, in every octave where it fits the right hand's range. */
function candidates(root: Tonic, quality: ChordQuality): { inversion: Inversion; tones: SpelledNote[] }[] {
  const out: { inversion: Inversion; tones: SpelledNote[] }[] = []
  for (let inv = 0; inv < chordSize(quality); inv++)
    for (const octave of [3, 4, 5]) {
      const tones = invert(chordTones(root, quality, octave), inv as Inversion)
      if (tones[0].midi >= RIGHT_BOTTOM && tones[tones.length - 1].midi <= RIGHT_TOP)
        out.push({ inversion: inv as Inversion, tones })
    }
  return out
}

export interface ProgressionOptions {
  hands?: 'right' | 'both'
  /** Pick each chord's inversion so the hand moves as little as possible (the default). */
  voiceLead?: boolean
  /** The key is minor: numerals i, ii°, III, iv, V, V7, VI, VII, vii°. */
  minor?: boolean
}

/**
 * A progression in a key, e.g. ("C", ["I", "IV", "V", "I"]), or with `minor`
 * ("A", ["i", "iv", "V7", "i"]). With voice leading the first chord is in root
 * position and every next chord takes the inversion nearest to the one
 * before: in C, I – IV – V – I is C-E-G, C-F-A, B-D-G, C-E-G.
 */
export function progression(
  key: string,
  numerals: string[],
  { hands = 'right', voiceLead = true, minor = false }: ProgressionOptions = {},
): ChordTarget[] {
  let prev: number[] | null = null
  return numerals.map((numeral) => {
    const { root, quality } = degreeChord(key, numeral, minor)
    let pick: { inversion: Inversion; tones: SpelledNote[] }
    if (!voiceLead || prev === null) {
      pick = { inversion: 0, tones: chordTarget(root, quality).notes }
    } else {
      const from = prev
      const cost = (c: { tones: SpelledNote[] }) =>
        movement(
          from,
          c.tones.map((x) => x.midi),
        )
      pick = candidates(root, quality).sort((a, b) => cost(a) - cost(b) || a.inversion - b.inversion)[0]
    }
    prev = pick.tones.map((x) => x.midi)
    return withBass({ root, quality, inversion: pick.inversion, hands, numeral }, pick.tones)
  })
}

// --- Exercises in a key ---

/** Semitones a note lies outside the treble staff (E4 to F5): what makes it hard to read. */
const outsideTreble = (midi: number) => Math.max(0, 64 - midi, midi - 77)

/** Of the octaves 3 and 4, the one where the notes `span` semitones up from the root sit best on the treble staff. */
function trebleOctave(root: Tonic, span: number): number {
  const cost = (o: number) => {
    const low = midiFrom(root.letter, o) + root.acc
    return Math.max(outsideTreble(low), outsideTreble(low + span))
  }
  return cost(3) < cost(4) ? 3 : 4
}

/**
 * Gamın akorları: the triad on every degree of the key in root position,
 * going up from the tonic to the tonic an octave higher and back down
 * (15 chords), right hand 1-3-5, numerals on each.
 */
export function scaleChords(key: string, minor = false): ChordTarget[] {
  const tonic = parseTonic(key)
  const octave = trebleOctave(tonic, 19)
  const scale = scaleOctave(tonic, minor ? 'natural' : 'major', octave)
  const degrees = minor ? MINOR_DEGREES : MAJOR_DEGREES
  const rising = [...degrees, degrees[0]].map((numeral, i) => {
    const { root, quality } = degreeChord(key, numeral, minor)
    const tones = chordTones(root, quality, scale[i].octave)
    return withBass({ root, quality, inversion: 0, hands: 'right', numeral }, tones)
  })
  return [...rising, ...rising.slice(0, -1).reverse()]
}

/**
 * Çevrim merdiveni: one triad climbing through its inversions (root position,
 * 1st, 2nd, root position an octave up) and back down: seven chords, right hand.
 */
export function inversionLadder(root: string | Tonic, quality: ChordQuality, numeral?: string): ChordTarget[] {
  const tonic = typeof root === 'string' ? parseTonic(root) : root
  const octave = trebleOctave(tonic, 19)
  const at = (inversion: Inversion, o: number) =>
    withBass(
      { root: tonic, quality, inversion, hands: 'right', ...(numeral && { numeral }) },
      invert(chordTones(tonic, quality, o), inversion),
    )
  const rising = [at(0, octave), at(1, octave), at(2, octave), at(0, octave + 1)]
  return [...rising, ...rising.slice(0, -1).reverse()]
}

/** The key's triads (each degree once), placed for reading like `chordTarget`: chord games draw from them. */
export function keyTriads(key: string, minor = false, inversions: Inversion[] = [0]): ChordTarget[] {
  return (minor ? MINOR_DEGREES : MAJOR_DEGREES).flatMap((numeral) => {
    const { root, quality } = degreeChord(key, numeral, minor)
    return inversions.map((inv) => chordTarget(root, quality, inv, 'right', numeral))
  })
}

// --- Arpeggios ---

/** Right hand: 1-2-3-5 for one octave, 1-2-3-1-2-3-5 for two; left hand 5-4-2-1 and 5-4-2-1-4-2-1. */
export function arpeggioFingering(hand: Hand, octaves: number): number[] {
  const cycle = hand === 'right' ? [1, 2, 3] : [5, 4, 2]
  const tail = hand === 'right' ? [5] : [1]
  if (hand === 'right') return [...Array.from({ length: octaves }, () => cycle).flat(), ...tail]
  // The left hand crosses 4 over the thumb into the next octave: 5 4 2 1 4 2 1.
  return [5, 4, 2, ...Array.from({ length: octaves - 1 }, () => [1, 4, 2]).flat(), 1]
}

/**
 * A triad's arpeggio up `octaves` octaves and back (7 notes for one, 13 for
 * two) from the root in `octave`, with fingers and the crossings they need.
 */
export function arpeggioRun(root: Tonic, quality: ChordQuality, hand: Hand, octave: number, octaves = 1): RunNote[] {
  const upNotes = [
    ...Array.from({ length: octaves }, (_, k) => chordTones(root, quality, octave + k)).flat(),
    chordTones(root, quality, octave + octaves)[0],
  ]
  const notes = [...upNotes, ...upNotes.slice(0, -1).reverse()]
  const upFingers = arpeggioFingering(hand, octaves)
  const fingers = [...upFingers, ...upFingers.slice(0, -1).reverse()]
  return notes.map((n, i) => ({
    ...n,
    finger: fingers[i],
    cross: i === 0 ? null : crossingBetween(notes[i - 1].midi, fingers[i - 1], n.midi, fingers[i], hand),
  }))
}

/** The VexFlow key signature of the chord's key: the major key, or the relative minor's. */
export function chordKeySignature(root: Tonic, quality: ChordQuality): string {
  const letter = `${root.letter.toUpperCase()}${root.acc === -1 ? 'b' : root.acc === 1 ? '#' : ''}`
  return quality === 'minor' ? `${letter}m` : letter
}
