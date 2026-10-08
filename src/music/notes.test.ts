import { describe, expect, it } from 'vitest'
import {
  diatonicIndex,
  fitKeyboard,
  isBlackKey,
  parseNote,
  solfegeName,
  staffPlacement,
  vexKey,
  whiteKeysBetween,
} from './notes'

describe('notes', () => {
  it('parses note names', () => {
    expect(parseNote('C4')).toBe(60)
    expect(parseNote('a4')).toBe(69)
    expect(parseNote('F#3')).toBe(54)
    expect(parseNote('Bb5')).toBe(82)
  })

  it('names notes in Turkish solfège', () => {
    expect(solfegeName(60)).toBe('Do4')
    expect(solfegeName(67)).toBe('Sol4')
    expect(solfegeName(61)).toBe('Do#4')
    expect(solfegeName(71, false)).toBe('Si')
  })

  it('builds VexFlow keys', () => {
    expect(vexKey(60)).toBe('c/4')
    expect(vexKey(78)).toBe('f#/5')
  })

  it('knows black keys', () => {
    expect(isBlackKey(61)).toBe(true)
    expect(isBlackKey(64)).toBe(false)
  })

  it('counts diatonic steps', () => {
    expect(diatonicIndex(62) - diatonicIndex(60)).toBe(1)
    expect(diatonicIndex(72) - diatonicIndex(60)).toBe(7)
  })

  it('places notes on the treble staff', () => {
    expect(['E4', 'G4', 'B4', 'D5', 'F5'].map((n) => staffPlacement(parseNote(n), 'treble'))).toEqual(
      Array(5).fill('line'),
    )
    expect(['F4', 'A4', 'C5', 'E5'].map((n) => staffPlacement(parseNote(n), 'treble'))).toEqual(Array(4).fill('space'))
    expect(staffPlacement(parseNote('C4'), 'treble')).toBe('outside')
    expect(staffPlacement(parseNote('G5'), 'treble')).toBe('outside')
  })

  it('places notes on the bass staff', () => {
    expect(staffPlacement(parseNote('G2'), 'bass')).toBe('line')
    expect(staffPlacement(parseNote('A3'), 'bass')).toBe('line')
    expect(staffPlacement(parseNote('C4'), 'bass')).toBe('outside')
  })

  it('lists white keys', () => {
    expect(whiteKeysBetween(60, 67)).toEqual([60, 62, 64, 65, 67])
  })

  it('fits the on-screen keyboard to the notes', () => {
    const n = (...names: string[]) => names.map(parseNote)
    // Within one Do-to-Do octave: exactly that octave.
    expect(fitKeyboard(n('C4', 'G4'))).toEqual({ low: 60, high: 72 })
    expect(fitKeyboard(n('C4', 'C5'))).toEqual({ low: 60, high: 72 })
    expect(fitKeyboard(n('D4', 'F#4'))).toEqual({ low: 60, high: 72 })
    // Across a Do: from the lowest to the highest note, black keys rounded out.
    expect(fitKeyboard(n('G4', 'G5'))).toEqual({ low: 67, high: 79 })
    expect(fitKeyboard(n('E4', 'F5'))).toEqual({ low: 64, high: 77 })
    expect(fitKeyboard(n('Bb3', 'F#5'))).toEqual({ low: 57, high: 79 })
    // Never less than an octave of white keys: widened upwards.
    expect(fitKeyboard(n('F4', 'E5'))).toEqual({ low: 65, high: 77 })
    expect(fitKeyboard(n('A4', 'D5'))).toEqual({ low: 69, high: 81 })
    // fromDo: wider sets start on the Do at or below the lowest note.
    expect(fitKeyboard(n('F4', 'E5'), { fromDo: true })).toEqual({ low: 60, high: 76 })
    expect(fitKeyboard(n('G2', 'A3'), { fromDo: true })).toEqual({ low: 36, high: 57 })
    expect(fitKeyboard(n('C4', 'G4'), { fromDo: true })).toEqual({ low: 60, high: 72 })
  })
})
