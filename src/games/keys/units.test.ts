import { describe, expect, it } from 'vitest'
import { degreeChord, inversionLadder, progression, scaleChords } from '../../music/chords'
import { isBlackKey } from '../../music/notes'
import { parseTonic, scaleOctave, spelledName } from '../../music/scales'
import { ALL_LESSONS, isUnlocked, KEY_UNITS, UNITS } from '../../progress/curriculum'
import { ODE_SIMPLE } from '../../rhythm/tunes'
import { arpeggioSteps } from '../chords/arpeggio'
import { scaleSteps } from '../scales/steps'
import { pieceSteps, transposeTune } from './piece'
import { KEYS, signatureOf } from './units'

const names = (notes: { letter: string; acc: number; octave: number; midi: number }[]) =>
  notes.map((n) => spelledName(n as Parameters<typeof spelledName>[0]))

describe('key units', () => {
  it('walks the circle of fifths, each unit opened by the one before', () => {
    expect(KEYS.map((k) => k.major)).toEqual(['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab', 'B', 'Db', 'F#'])
    expect(KEYS.map((k) => signatureOf(k.major).count)).toEqual([0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6])
    expect(KEY_UNITS.map((u) => u.requires)).toEqual(['chords', ...KEY_UNITS.slice(0, -1).map((u) => u.id)])
    expect(KEY_UNITS[0].title).toBe('Ünite 10: Do Majör ve La Minör')
    expect(KEY_UNITS[11].title).toBe('Ünite 21: Fa# Majör ve Re# Minör')
  })

  it('names the key signature in the order it is written', () => {
    expect(signatureOf('F#').notes).toEqual(['Fa#', 'Do#', 'Sol#', 'Re#', 'La#', 'Mi#'])
    expect(signatureOf('Db').notes).toEqual(['Si♭', 'Mi♭', 'La♭', 'Re♭', 'Sol♭'])
    expect(signatureOf('C')).toEqual({ count: 0, notes: [] })
  })

  it('gives every lesson a title of its own, so the map and the scripts can find it', () => {
    const titles = ALL_LESSONS.map((l) => l.title)
    const keyTitles = KEY_UNITS.flatMap((u) => u.lessons.map((l) => l.title))
    for (const t of keyTitles)
      expect(
        titles.filter((x) => x === t),
        t,
      ).toHaveLength(1)
    expect(new Set(ALL_LESSONS.map((l) => l.id)).size).toBe(ALL_LESSONS.length)
  })

  it('has seventeen lessons per unit, the boss last', () => {
    for (const u of KEY_UNITS) {
      expect(u.lessons).toHaveLength(18)
      expect(u.lessons.at(-1)!.kind).toBe('boss')
      expect(u.lessons[0].kind).toBe('theory')
    }
  })

  it('never puts a thumb on a black key in the scales and arpeggios of the key units', () => {
    for (const u of KEY_UNITS)
      for (const l of u.lessons) {
        const steps = l.scales ? scaleSteps(l.scales) : l.arpeggios ? arpeggioSteps(l.arpeggios) : []
        for (const s of steps)
          for (const n of s.notes) expect(n.finger === 1 && isBlackKey(n.midi), `${l.id} ${n.midi}`).toBe(false)
      }
  })

  it('opens the first key unit after the chords unit and each next one after the one before', () => {
    const chordIds = UNITS.find((u) => u.id === 'chords')!.lessons.map((l) => l.id)
    const basics = UNITS.find((u) => u.id === 'basics')!.lessons.map((l) => l.id)
    const first = KEY_UNITS[0].lessons
    const starred = new Set<string>(basics)
    const stars = (id: string) => (starred.has(id) ? 1 : 0)
    expect(isUnlocked(first[0].id, stars)).toBe(false)
    chordIds.forEach((id) => starred.add(id))
    expect(isUnlocked(first[0].id, stars)).toBe(true)
    expect(isUnlocked(KEY_UNITS[1].lessons[0].id, stars)).toBe(false)
    first.filter((l) => l.kind !== 'boss').forEach((l) => starred.add(l.id))
    expect(isUnlocked(KEY_UNITS[1].lessons[0].id, stars)).toBe(true)
  })

  it('answers its own intro questions right', () => {
    const g = KEY_UNITS[1].lessons[0].theory!
    const choice = (i: number) => {
      const q = g.questions[i]
      return q.type === 'choice' ? q.options[q.answer] : null
    }
    expect(choice(0)).toBe('1')
    expect(g.questions[1]).toMatchObject({ type: 'key', pitchClass: 0 }) // IV of G = C
    expect(g.questions[2]).toMatchObject({ type: 'key', pitchClass: 2 }) // V of G = D
    expect(choice(3)).toBe('La Minör')
    expect(choice(4)).toBe('Mi Minör')
    expect(g.questions[5]).toMatchObject({ type: 'key', pitchClass: 3 }) // D# in E harmonic minor
    const c = KEY_UNITS[0].lessons[0].theory!.questions[0]
    expect(c.type === 'choice' && c.options[c.answer]).toBe('Hiç yok')
  })
})

describe('chords of a key', () => {
  it('builds the triads on every degree, up and back', () => {
    const c = scaleChords('C')
    expect(c).toHaveLength(15)
    expect(c.map((t) => t.numeral)).toEqual([
      'I',
      'ii',
      'iii',
      'IV',
      'V',
      'vi',
      'vii°',
      'I',
      'vii°',
      'vi',
      'V',
      'IV',
      'iii',
      'ii',
      'I',
    ])
    const roots = c.slice(0, 8).map((t) => t.notes[0].midi)
    expect(roots).toEqual([...roots].sort((a, b) => a - b))
    expect(c[6].quality).toBe('dim')
    expect(names(scaleChords('F#')[6].notes)).toEqual(['Mi#5', 'Sol#5', 'Si5'])
  })

  it('reads minor numerals with the raised seventh', () => {
    expect(names(progression('A', ['i', 'iv', 'V7', 'i'], { minor: true })[2].notes)).toEqual([
      'Sol#4',
      'Si4',
      'Re5',
      'Mi5',
    ])
    const vii = degreeChord('A', 'vii°', true)
    expect(vii.root).toEqual(parseTonic('G#'))
    expect(vii.quality).toBe('dim')
  })

  it('spells the double sharps of G♯ and D♯ minor', () => {
    expect(names(scaleOctave(parseTonic('G#'), 'harmonic', 4))[6]).toBe('Fa##5')
    const v = progression('D#', ['V'], { minor: true })[0]
    expect(names(v.notes)).toEqual(['La#4', 'Do##5', 'Mi#5'])
  })

  it('climbs a triad through its inversions', () => {
    const ladder = inversionLadder('C', 'major')
    expect(ladder.map((t) => names(t.notes).join(' '))).toEqual([
      'Do4 Mi4 Sol4',
      'Mi4 Sol4 Do5',
      'Sol4 Do5 Mi5',
      'Do5 Mi5 Sol5',
      'Sol4 Do5 Mi5',
      'Mi4 Sol4 Do5',
      'Do4 Mi4 Sol4',
    ])
    expect(ladder[1].notes.map((n) => n.finger)).toEqual([1, 2, 5])
  })
})

describe('songs in a key', () => {
  it('carries a tune degree by degree with the key’s letters', () => {
    expect(names(transposeTune(ODE_SIMPLE, 'Bb')).slice(0, 7)).toEqual([
      'Re5',
      'Re5',
      'Mi♭5',
      'Fa5',
      'Fa5',
      'Mi♭5',
      'Re5',
    ])
    const steps = pieceSteps({ tune: ODE_SIMPLE, key: 'D' })
    expect(steps[0]).toMatchObject({ keySig: 'D' })
    expect(steps[0].notes[0]).toMatchObject({ midi: 66, spelled: { letter: 'f', acc: 1 } }) // F#4
  })
})
