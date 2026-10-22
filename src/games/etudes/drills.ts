// Exercises written by rule instead of imported, in the import format
// (`ScoreSource`), so the score view and the engines read them like the
// imported pieces:
// - five-finger pieces in the spirit of Beyer's school (the app's own): the
//   hand stays on five neighbouring keys, the right hand's thumb on the tonic;
// - Hanon's "Le Pianiste virtuose" Nos. 1–10 (1873, Public Domain). The
//   figures below were read from the original (the eight notes of the first
//   group going up and coming down, with Hanon's fingers); every later group
//   is the same figure a step higher or lower, so one rule carries an
//   exercise into any key and over one octave or Hanon's two. Pure.

import type { Hand } from '../../music/notes'
import { parseTonic, type ScaleType, scaleOctave, type SpelledNote } from '../../music/scales'
import type { ScoreSource } from './score'

const ACC_TEXT: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' }

/** "F#4:3" */
const noteText = (n: SpelledNote, finger?: number) =>
  `${n.letter.toUpperCase()}${ACC_TEXT[n.acc]}${n.octave}${finger ? `:${finger}` : ''}`

/** "F#4:3/16" */
const token = (n: SpelledNote, length: string, finger?: number) => `${noteText(n, finger)}/${length}`

/** The scale around the tonic in `octave`: `at(0)` is the tonic, `at(-1)` the note below it, up to three octaves higher. */
function degrees(tonic: string, type: ScaleType, octave: number): (degree: number) => SpelledNote {
  const t = parseTonic(tonic)
  const notes = [-1, 0, 1, 2].flatMap((o) => scaleOctave(t, type, octave + o).slice(0, 7))
  return (degree) => notes[degree + 7]
}

/** The key signature name the score uses: "G", "Bb", "Am". */
const keyName = (tonic: string, type: ScaleType) => `${tonic}${type === 'major' ? '' : 'm'}`

/**
 * A staff's bars with the other clef where a bar lies mostly on the other side
 * of middle C (a left hand going up, a right hand going down), written only
 * where the clef changes.
 */
function withClefs(bars: string[][], pitches: number[][], staff: 'treble' | 'bass'): string[] {
  let clef = staff
  return bars.map((tokens, i) => {
    const mean = pitches[i].reduce((a, b) => a + b, 0) / pitches[i].length
    const other = staff === 'treble' ? mean < 60 : mean >= 60
    const want = other ? (staff === 'treble' ? 'bass' : 'treble') : staff
    const out = want === clef ? tokens : [`@${want}`, ...tokens]
    clef = want
    return out.join(' ')
  })
}

// ---- Hanon ------------------------------------------------------------------

interface Figure {
  /** Steps from the group's first note. */
  steps: number[]
  /** Hanon's fingers for the first group. */
  right: number[]
  left: number[]
}

interface HanonExercise {
  no: number
  up: Figure
  down: Figure
  /** Over two octaves: the degree the way down starts on, and how many groups it has. */
  downFrom: number
  downGroups: number
  /** Hanon changes the last group going up or down to lead into what follows. */
  lastUp?: number[]
  lastDown?: number[]
}

const fig = (steps: string, right: string, left: string): Figure => ({
  steps: steps.split(' ').map(Number),
  right: right.split('').map(Number),
  left: left.split('').map(Number),
})

/** Groups going up, over two octaves (from the tonic to the seventh an octave higher). */
const UP_GROUPS = 14

export const HANON: HanonExercise[] = [
  {
    no: 1,
    up: fig('0 2 3 4 5 4 3 2', '12345432', '54321234'),
    down: fig('0 -2 -3 -4 -5 -4 -3 -2', '54321234', '12345432'),
    downFrom: 18,
    downGroups: 15,
  },
  {
    no: 2,
    up: fig('0 2 5 4 3 4 3 2', '12543432', '53123234'),
    down: fig('0 -3 -5 -4 -3 -4 -3 -2', '52123234', '13543432'),
    downFrom: 18,
    downGroups: 14,
  },
  {
    no: 3,
    up: fig('0 2 5 4 3 2 3 4', '12543234', '53123432'),
    down: fig('0 -3 -5 -4 -3 -2 -3 -4', '52123432', '13543234'),
    downFrom: 18,
    downGroups: 14,
  },
  {
    no: 4,
    up: fig('0 1 0 2 5 4 3 2', '12125432', '54531234'),
    down: fig('0 -1 0 -3 -5 -4 -3 -2', '54521234', '12135432'),
    downFrom: 18,
    downGroups: 14,
  },
  {
    no: 5,
    up: fig('0 5 4 5 3 4 2 3', '15453423', '51213243'),
    down: fig('0 1 0 2 1 3 2 4', '12132435', '54534231'),
    downFrom: 14,
    downGroups: 14,
  },
  {
    no: 6,
    up: fig('0 5 4 5 3 5 2 5', '15453525', '51213141'),
    down: fig('0 -5 -4 -5 -3 -5 -2 -5', '51213141', '15453525'),
    downFrom: 18,
    downGroups: 14,
    lastUp: [0, 5, 4, 5, 3, 5, 2, 1],
    lastDown: [0, -5, -4, -5, -3, -5, -2, -3],
  },
  {
    no: 7,
    up: fig('0 2 1 3 2 4 3 2', '13243543', '53423134'),
    down: fig('0 -2 -1 -3 -2 -4 -3 -2', '53423134', '13243543'),
    downFrom: 18,
    downGroups: 14,
  },
  {
    no: 8,
    up: fig('0 2 4 5 3 4 2 3', '12453423', '54213243'),
    down: fig('0 -2 -4 -5 -3 -4 -2 -3', '54213243', '12453423'),
    downFrom: 18,
    downGroups: 14,
  },
  {
    no: 9,
    up: fig('0 2 3 2 4 3 5 4', '12324354', '54342312'),
    down: fig('0 -2 -3 -2 -4 -3 -5 -4', '54342312', '12324354'),
    downFrom: 18,
    downGroups: 14,
    lastDown: [0, -2, -3, -2, -4, -3, -4, -3],
  },
  {
    no: 10,
    up: fig('0 5 4 3 2 3 2 3', '15432323', '51234343'),
    down: fig('0 -5 -4 -3 -2 -3 -2 -3', '51234343', '15432323'),
    downFrom: 18,
    downGroups: 14,
  },
]

/**
 * Over one octave the right hand starts on the tonic between A3 and G4; over
 * two an octave lower, as Hanon wrote it. The left hand plays an octave below.
 */
const startOctave = (tonic: string, octaves: number) => ('AB'.includes(tonic[0]) ? 3 : 4) - (octaves - 1)

/**
 * Hanon's exercise `no` in a major key, over one octave (the groups up to the
 * seventh and back, as teachers often start) or two (as Hanon wrote it): one
 * group of sixteenths per 2/4 bar, both hands an octave apart, the tonic last.
 */
export function hanonScore(no: number, tonic = 'C', octaves: 1 | 2 = 1): ScoreSource {
  const ex = HANON.find((h) => h.no === no)
  if (!ex) throw new Error(`No Hanon exercise ${no}`)
  const less = (2 - octaves) * 7
  const up = UP_GROUPS - less
  const groups: { from: number; steps: number[]; fingers?: Figure }[] = []
  for (let i = 0; i < up; i++)
    groups.push({ from: i, steps: i === up - 1 && ex.lastUp ? ex.lastUp : ex.up.steps, fingers: i ? undefined : ex.up })
  const downs = ex.downGroups - less
  for (let i = 0; i < downs; i++)
    groups.push({
      from: ex.downFrom - less - i,
      steps: i === downs - 1 && ex.lastDown ? ex.lastDown : ex.down.steps,
      fingers: i ? undefined : ex.down,
    })
  const octave = startOctave(tonic, octaves)
  const hand = (h: Hand) => {
    const scale = degrees(tonic, 'major', h === 'right' ? octave : octave - 1)
    const notes = [...groups.map((g) => g.steps.map((s) => scale(g.from + s))), [scale(0)]]
    const bars = notes.map((ns, b) =>
      b < groups.length
        ? ns.map((n, i) => token(n, '16', groups[b].fingers?.[h][i]))
        : [token(ns[0], 'h', h === 'right' ? 1 : 5)],
    )
    return withClefs(
      bars,
      notes.map((ns) => ns.map((n) => n.midi)),
      h === 'right' ? 'treble' : 'bass',
    )
  }
  const right = hand('right')
  return {
    id: `hanon-${no}-${tonic.toLowerCase().replace('#', 's')}-${octaves}`,
    mutopia: null,
    title: `Le Pianiste virtuose, No. ${no}`,
    composer: 'Charles-Louis Hanon',
    opus: null,
    source: 'Hanon, Le Pianiste virtuose en 60 exercices (1873), kuralla her tona',
    typesetter: null,
    licence: 'Public Domain',
    time: [2, 4],
    key: keyName(tonic, 'major'),
    pickup: 0,
    bars: right.length,
    staves: [
      { clef: 'treble', voices: [right] },
      { clef: 'bass', voices: [hand('left')] },
    ],
  }
}

// ---- Five-finger pieces -------------------------------------------------------

/**
 * Bars of degrees in the five-finger position (0 the tonic … 4 the fifth):
 * "2" a quarter, "2/h" a half, "2/8" an eighth, "0+4/w" two keys, "r/q" a rest.
 */
export interface FivePiece {
  slug: string
  title: string
  time: [number, number]
  right: string
  /** How the left hand plays: the same notes an octave lower, mirrored (same fingers, the other way), or its own part. */
  left: 'parallel' | 'contrary' | string
}

export const FIVE_PIECES: FivePiece[] = [
  {
    slug: 'steps',
    title: 'Basamaklar',
    time: [4, 4],
    right: '0 1 2 3 | 4 3 2 1 | 0 1 2 3 | 4/h 4/h | 4 3 2 1 | 0 1 2 3 | 4 3 2 1 | 0/w',
    left: 'parallel',
  },
  {
    slug: 'thirds',
    title: 'Üçlü Atlamalar',
    time: [4, 4],
    right: '0 2 1 3 | 2 4 3/h | 4 2 3 1 | 2 0 1/h | 0 2 4/h | 3 1 2/h | 4 3 2 1 | 0/w',
    left: 'parallel',
  },
  {
    slug: 'mirror',
    title: 'Ayna',
    time: [4, 4],
    right: '0 1 2 3 | 4/h 2/h | 0 1 2 3 | 4/w | 4 3 2 1 | 0/h 2/h | 4 3 2 1 | 0/w',
    left: 'contrary',
  },
  {
    slug: 'eighths',
    title: 'Sekizlik Merdiven',
    time: [4, 4],
    right:
      '0/8 1/8 2/8 3/8 4/8 3/8 2/8 1/8 | 0/8 1/8 2/8 3/8 4/h | 4/8 3/8 2/8 1/8 0/8 1/8 2/8 3/8 | 4/8 3/8 2/8 1/8 0/h | ' +
      '0/8 2/8 1/8 3/8 2/8 4/8 3/8 1/8 | 0/h 4/h | 4/8 2/8 3/8 1/8 2/8 0/8 1/8 3/8 | 0/w',
    left: 'parallel',
  },
  {
    slug: 'song',
    title: 'Melodi ve Eşlik',
    time: [4, 4],
    right: '0 1 2 0 | 2 3 4/h | 4 3 2 1 | 0 1 2/h | 2 2 3 3 | 4 3 2/h | 3 2 1 2 | 0/w',
    left: '0+4/w | 0+4/w | 1+4/w | 0+4/w | 0+2/w | 1+4/w | 1+4/w | 0+4/w',
  },
  {
    slug: 'waltz',
    title: 'Küçük Vals',
    time: [3, 4],
    right: '0 2 4 | 4/h. | 3 1 3 | 3/h. | 2 0 2 | 2 3 4 | 3 2 1 | 0/h.',
    left: '0+4/h. | 0+4/h. | 1+4/h. | 1+4/h. | 0+4/h. | 0+4/h. | 1+4/h. | 0+4/h.',
  },
]

export interface FivePosition {
  tonic: string
  type: ScaleType
}

/** Five-finger position octaves: the right hand's thumb on the tonic from middle C up, the left hand's fifth finger an octave lower (two for G and A). */
const FIVE_OCTAVES: Record<string, [number, number]> = { C: [4, 3], D: [4, 3], F: [4, 3], G: [4, 2], A: [4, 2] }

/** The right hand's finger on a degree is degree + 1; the left hand's, 5 − degree. */
const fingerOf = (hand: Hand, degree: number) => (hand === 'right' ? degree + 1 : 5 - degree)

function fiveBars(text: string, scale: (degree: number) => SpelledNote, hand: Hand): string[] {
  return text.split('|').map((bar) =>
    bar
      .trim()
      .split(/\s+/)
      .map((t, i) => {
        const [body, length = 'q'] = t.split('/')
        if (body === 'r') return `r/${length}`
        const ds = body.split('+').map(Number)
        // Fingers on the first note of every bar.
        const keys = ds.map((d, k) => noteText(scale(d), i === 0 && k === 0 ? fingerOf(hand, d) : undefined))
        return `${keys.join('+')}/${length}`
      })
      .join(' '),
  )
}

const mirror = (text: string) =>
  text.replace(/(^|[\s+|])([0-4])(?=[/\s+|]|$)/g, (_, pre, d) => `${pre}${4 - Number(d)}`)

/** A five-finger piece in a position (C, G, F, D or A; major or natural minor). */
export function fiveScore(piece: FivePiece, pos: FivePosition): ScoreSource {
  const [rOct, lOct] = FIVE_OCTAVES[pos.tonic]
  const right = degrees(pos.tonic, pos.type, rOct)
  const left = degrees(pos.tonic, pos.type, lOct)
  const leftText =
    piece.left === 'parallel' ? piece.right : piece.left === 'contrary' ? mirror(piece.right) : piece.left
  const rightBars = fiveBars(piece.right, right, 'right')
  return {
    id: `five-${pos.tonic.toLowerCase()}${pos.type === 'major' ? '' : 'm'}-${piece.slug}`,
    mutopia: null,
    title: piece.title,
    composer: null,
    opus: null,
    source: 'Dijital Piyano Öğretmeni, beş parmak pozisyonu',
    typesetter: null,
    licence: 'Public Domain',
    time: piece.time,
    key: keyName(pos.tonic, pos.type),
    pickup: 0,
    bars: rightBars.length,
    staves: [
      { clef: 'treble', voices: [rightBars] },
      { clef: 'bass', voices: [fiveBars(leftText, left, 'left')] },
    ],
  }
}
