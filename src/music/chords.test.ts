import { describe, expect, it } from 'vitest'
import {
  arpeggioFingering,
  arpeggioRun,
  chordFingers,
  chordName,
  chordSymbol,
  chordTarget,
  chordTones,
  fingerText,
  identifyChord,
  invert,
  movement,
  progression,
} from './chords'
import { parseNote } from './notes'
import { parseTonic, spelledName } from './scales'

const names = (notes: { letter: string; acc: number; octave: number; midi: number }[]) =>
  notes.map((n) => spelledName(n as Parameters<typeof spelledName>[0]))
const midis = (...ns: string[]) => ns.map(parseNote)

describe('chord spelling', () => {
  it('spells triads and sevenths by thirds', () => {
    expect(names(chordTones(parseTonic('C'), 'major', 4))).toEqual(['Do4', 'Mi4', 'Sol4'])
    expect(names(chordTones(parseTonic('A'), 'minor', 4))).toEqual(['La4', 'Do5', 'Mi5'])
    expect(names(chordTones(parseTonic('Bb'), 'major', 3))).toEqual(['Si♭3', 'Re4', 'Fa4'])
    expect(names(chordTones(parseTonic('D'), 'major', 4))).toEqual(['Re4', 'Fa#4', 'La4'])
    expect(names(chordTones(parseTonic('B'), 'dim', 4))).toEqual(['Si4', 'Re5', 'Fa5'])
    expect(names(chordTones(parseTonic('G'), 'dom7', 4))).toEqual(['Sol4', 'Si4', 'Re5', 'Fa5'])
    expect(names(chordTones(parseTonic('C'), 'maj7', 4))).toEqual(['Do4', 'Mi4', 'Sol4', 'Si4'])
  })

  it('inverts by moving the lowest notes up an octave', () => {
    const c = chordTones(parseTonic('C'), 'major', 4)
    expect(names(invert(c, 1))).toEqual(['Mi4', 'Sol4', 'Do5'])
    expect(names(invert(c, 2))).toEqual(['Sol4', 'Do5', 'Mi5'])
  })

  it('names chords in Turkish', () => {
    expect(chordName(parseTonic('C'), 'major')).toBe('Do Majör')
    expect(chordName(parseTonic('A'), 'minor')).toBe('La Minör')
    expect(chordName(parseTonic('G'), 'dom7')).toBe('Sol7')
    expect(chordSymbol(parseTonic('A'), 'minor')).toBe('Lam')
    expect(chordSymbol(parseTonic('B'), 'dim')).toBe('Si°')
  })
})

describe('chord targets', () => {
  it('keeps right-hand chords at or below G5 and left-hand chords at or below middle C', () => {
    expect(chordTarget('F', 'major', 2).notes.map((n) => n.midi)).toEqual(midis('C4', 'F4', 'A4'))
    expect(chordTarget('G', 'major', 2).notes.map((n) => n.midi)).toEqual(midis('D4', 'G4', 'B4'))
    expect(chordTarget('A', 'minor', 0, 'left').notes.map((n) => n.midi)).toEqual(midis('A2', 'C3', 'E3'))
    expect(chordTarget('C', 'major', 0, 'left').notes.every((n) => n.clef === 'bass')).toBe(true)
  })

  it('gives the standard block fingers', () => {
    expect(chordFingers(3, 0, 'right')).toEqual([1, 3, 5])
    expect(chordFingers(3, 1, 'right')).toEqual([1, 2, 5])
    expect(chordFingers(3, 2, 'left')).toEqual([5, 2, 1])
    expect(fingerText(chordTarget('C', 'major', 1))).toBe('1-2-5')
  })

  it('puts the root in the left hand under a two-hand chord', () => {
    const t = chordTarget('A', 'minor', 0, 'both')
    expect(t.notes[0]).toMatchObject({ midi: parseNote('A2'), clef: 'bass', hand: 'left', finger: 5 })
    expect(t.notes.slice(1).every((n) => n.clef === 'treble')).toBe(true)
    expect(fingerText(t)).toBe('sol el 5 · sağ el 1-3-5')
  })
})

describe('identifyChord', () => {
  it('recognises chords and inversions in any octave, with doublings', () => {
    expect(identifyChord(midis('C4', 'E4', 'G4'))).toEqual({ root: 0, quality: 'major', inversion: 0 })
    expect(identifyChord(midis('E3', 'G4', 'C5', 'E5'))).toEqual({ root: 0, quality: 'major', inversion: 1 })
    expect(identifyChord(midis('E4', 'A4', 'C5'))).toEqual({ root: 9, quality: 'minor', inversion: 2 })
    expect(identifyChord(midis('B3', 'D4', 'F4', 'G4'))).toEqual({ root: 7, quality: 'dom7', inversion: 1 })
    expect(identifyChord(midis('C4', 'D4', 'E4'))).toBeNull()
  })
})

describe('progressions', () => {
  it('voice-leads I – IV – V – I in C to the closest inversions', () => {
    const p = progression('C', ['I', 'IV', 'V', 'I'])
    expect(p.map((c) => c.notes.map((n) => n.midi))).toEqual([
      midis('C4', 'E4', 'G4'),
      midis('C4', 'F4', 'A4'),
      midis('B3', 'D4', 'G4'),
      midis('C4', 'E4', 'G4'),
    ])
    expect(p.map((c) => c.inversion)).toEqual([0, 2, 1, 0])
    expect(p.map((c) => c.numeral)).toEqual(['I', 'IV', 'V', 'I'])
  })

  it('moves less with voice leading than in root position', () => {
    const led = progression('C', ['I', 'V', 'vi', 'IV'])
    const root = progression('C', ['I', 'V', 'vi', 'IV'], { voiceLead: false })
    const total = (p: typeof led) =>
      p.slice(1).reduce(
        (n, c, i) =>
          n +
          movement(
            p[i].notes.map((x) => x.midi),
            c.notes.map((x) => x.midi),
          ),
        0,
      )
    expect(total(led)).toBeLessThan(total(root))
    expect(root.every((c) => c.inversion === 0)).toBe(true)
  })

  it('spells the degrees of other keys and resolves V7', () => {
    const g = progression('G', ['I', 'IV', 'V', 'I'])
    expect(names(g[2].notes)).toContain('Fa#4')
    const v7 = progression('C', ['I', 'IV', 'V7', 'I'], { hands: 'both' })
    expect(v7[2].quality).toBe('dom7')
    expect(v7[2].notes[0]).toMatchObject({ midi: parseNote('G3'), hand: 'left' })
    expect(v7[2].notes.slice(1).map((n) => n.midi)).toEqual(midis('B3', 'D4', 'F4', 'G4'))
  })
})

describe('arpeggios', () => {
  it('fingers one and two octaves in each hand', () => {
    expect(arpeggioFingering('right', 1)).toEqual([1, 2, 3, 5])
    expect(arpeggioFingering('right', 2)).toEqual([1, 2, 3, 1, 2, 3, 5])
    expect(arpeggioFingering('left', 1)).toEqual([5, 4, 2, 1])
    expect(arpeggioFingering('left', 2)).toEqual([5, 4, 2, 1, 4, 2, 1])
  })

  it('goes up and back down with the crossings it needs', () => {
    const one = arpeggioRun(parseTonic('C'), 'major', 'right', 4)
    expect(one.map((n) => n.midi)).toEqual(midis('C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4'))
    expect(one.every((n) => n.cross === null)).toBe(true)
    const two = arpeggioRun(parseTonic('C'), 'major', 'right', 4, 2)
    expect(two).toHaveLength(13)
    expect(two[3]).toMatchObject({ midi: parseNote('C5'), finger: 1, cross: 'under' })
    // Coming down, finger 3 crosses over the thumb.
    expect(two[10]).toMatchObject({ midi: parseNote('G4'), finger: 3, cross: 'over' })
    const left = arpeggioRun(parseTonic('A'), 'minor', 'left', 2, 2)
    expect(left[4]).toMatchObject({ finger: 4, cross: 'over' })
  })
})
