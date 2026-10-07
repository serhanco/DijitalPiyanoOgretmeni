import { describe, expect, it } from 'vitest'
import {
  crossingBetween,
  keyAccidentals,
  keySignature,
  parseTonic,
  scaleOctave,
  scaleRun,
  scaleTitle,
  spelledName,
  vexSpelled,
} from './scales'

const names = (tonic: string, type: Parameters<typeof scaleOctave>[1], octave = 4, form: 'up' | 'down' = 'up') =>
  scaleOctave(parseTonic(tonic), type, octave, form).map((n) => spelledName(n, false))

describe('scale spelling', () => {
  it('spells the major scales with one letter per step', () => {
    expect(names('C', 'major')).toEqual(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'])
    expect(names('G', 'major')).toEqual(['Sol', 'La', 'Si', 'Do', 'Re', 'Mi', 'Fa#', 'Sol'])
    expect(names('F', 'major')).toEqual(['Fa', 'Sol', 'La', 'Si♭', 'Do', 'Re', 'Mi', 'Fa'])
    expect(names('Bb', 'major')).toEqual(['Si♭', 'Do', 'Re', 'Mi♭', 'Fa', 'Sol', 'La', 'Si♭'])
    expect(names('E', 'major')).toEqual(['Mi', 'Fa#', 'Sol#', 'La', 'Si', 'Do#', 'Re#', 'Mi'])
  })

  it('spells the three minors', () => {
    expect(names('A', 'natural')).toEqual(['La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La'])
    expect(names('A', 'harmonic')).toEqual(['La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol#', 'La'])
    expect(names('A', 'melodic')).toEqual(['La', 'Si', 'Do', 'Re', 'Mi', 'Fa#', 'Sol#', 'La'])
    // Coming down the melodic minor is the natural minor.
    expect(names('A', 'melodic', 4, 'down')).toEqual(names('A', 'natural'))
    expect(names('D', 'harmonic')).toEqual(['Re', 'Mi', 'Fa', 'Sol', 'La', 'Si♭', 'Do#', 'Re'])
  })

  it('keeps MIDI numbers and octaves right across the octave break', () => {
    const a = scaleOctave(parseTonic('A'), 'major', 4)
    expect(a.map((n) => n.midi)).toEqual([69, 71, 73, 74, 76, 78, 80, 81])
    expect(a.map(vexSpelled)).toEqual(['a/4', 'b/4', 'c#/5', 'd/5', 'e/5', 'f#/5', 'g#/5', 'a/5'])
    expect(vexSpelled(scaleOctave(parseTonic('Bb'), 'major', 3)[0])).toBe('bb/3')
  })

  it('names key signatures and their accidentals', () => {
    expect(keySignature(parseTonic('Bb'), 'major')).toBe('Bb')
    expect(keySignature(parseTonic('A'), 'harmonic')).toBe('Am')
    expect(keyAccidentals(parseTonic('D'), 'major')).toMatchObject({ f: 1, c: 1, g: 0 })
    // The harmonic minor's raised seventh is not in the key signature.
    expect(keyAccidentals(parseTonic('A'), 'harmonic').g).toBe(0)
    expect(scaleTitle(parseTonic('Bb'), 'major')).toBe('Si♭ Majör')
  })
})

describe('fingering and crossings', () => {
  it('passes the right thumb under going up and the third finger over coming down', () => {
    const run = scaleRun(parseTonic('C'), 'major', 'right', 4)
    expect(run).toHaveLength(15)
    expect(run.map((n) => n.finger)).toEqual([1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1])
    expect(run.map((n, i) => (n.cross ? `${i}${n.cross}` : null)).filter(Boolean)).toEqual(['3under', '12over'])
  })

  it('crosses the left hand the other way round', () => {
    const run = scaleRun(parseTonic('C'), 'major', 'left', 3)
    expect(run.map((n) => n.finger)).toEqual([5, 4, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 4, 5])
    expect(run[5].cross).toBe('over')
    expect(run[10].cross).toBe('under')
  })

  it('uses the special fingerings of F and B flat', () => {
    expect(
      scaleRun(parseTonic('F'), 'major', 'right', 4)
        .slice(0, 8)
        .map((n) => n.finger),
    ).toEqual([1, 2, 3, 4, 1, 2, 3, 4])
    const bb = scaleRun(parseTonic('Bb'), 'major', 'left', 2)
    expect(bb.slice(0, 8).map((n) => n.finger)).toEqual([3, 2, 1, 4, 3, 2, 1, 3])
  })

  it('goes down first for the left hand in contrary motion', () => {
    const run = scaleRun(parseTonic('C'), 'major', 'left', 4, true)
    expect(run.map((n) => n.midi).slice(0, 3)).toEqual([60, 59, 57])
    expect(run[7].midi).toBe(48)
    expect(run[14].midi).toBe(60)
    expect(run.map((n) => n.finger).slice(0, 8)).toEqual([1, 2, 3, 1, 2, 3, 4, 5])
    expect(run[3].cross).toBe('under')
  })

  it('finds no crossing when the fingers follow the pitch', () => {
    expect(crossingBetween(60, 1, 62, 2, 'right')).toBeNull()
    expect(crossingBetween(64, 3, 65, 1, 'right')).toBe('under')
    expect(crossingBetween(48, 5, 50, 4, 'left')).toBeNull()
  })
})
