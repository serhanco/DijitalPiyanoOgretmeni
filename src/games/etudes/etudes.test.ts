import { describe, expect, it } from 'vitest'
import { BeatTrack } from '../../rhythm/track'
import { lessonPart } from '../songs/song'
import { tempoPlan } from '../songs/tempo'
import { WaitSession } from '../songs/wait'
import { ETUDE_PIECES } from './catalog'
import { FIVE_PIECES, fiveScore, HANON, hanonScore } from './drills'
import { ETUDE_LESSONS, ETUDE_LEVELS, etudeOpen } from './lessons'
import { parseScore, type ScoreSource, scoreNotes, valueOf } from './score'

const TINY: ScoreSource = {
  id: 'tiny',
  mutopia: 'Test/tiny',
  title: 'Tiny',
  composer: null,
  opus: null,
  source: null,
  typesetter: null,
  licence: 'Public Domain',
  time: [2, 4],
  key: 'F',
  pickup: 0,
  bars: 2,
  staves: [
    {
      clef: 'treble',
      voices: [
        ['C5:5/8( Bb4/16 A4/16) G4~/q', 'G4/8 F4/8* r/q'],
        ['s/h', 'E4/q s/q'],
      ],
    },
    { clef: 'bass', voices: [['F3+A3/h', '@treble C4/h']] },
  ],
}

describe('score', () => {
  it('reads spelling, fingers, slurs, staccato, ties and clef changes', () => {
    const s = parseScore(TINY)
    expect(s.beatsPerBar).toBe(2)
    const [upper] = s.staves[0].lanes
    const first = upper[0][0]
    expect(first.notes[0]).toMatchObject({ letter: 'c', acc: 0, octave: 5, midi: 72, finger: 5 })
    expect(first.slurStart).toBe(true)
    expect(upper[0][1].notes[0]).toMatchObject({ letter: 'b', acc: -1, midi: 70 })
    expect(upper[0][1].beats).toBe(0.25)
    expect(upper[0][2].slurEnd).toBe(true)
    // G4 tied over the bar line: the second note keeps the first one's head.
    const tied = upper[0][3].notes[0]
    const into = upper[1][0].notes[0]
    expect(tied.tieTo).toBe(into.id)
    expect(into.head).toBe(tied.id)
    expect(upper[1][1].staccato).toBe(true)
    expect(upper[1][2].kind).toBe('rest')
    // The bass staff's clef changes at the start of bar 2: the bar's own clef, not a change inside it.
    expect(s.staves[1].clefs).toEqual(['bass', 'treble'])
    expect(s.staves[1].lanes[0][1][0]).toMatchObject({ clef: 'treble', clefChange: null })
  })

  it('throws when a bar does not add up', () => {
    const bad = { ...TINY, staves: [{ clef: 'treble' as const, voices: [['C5/q', 'C5/h']] }] }
    expect(() => parseScore(bad)).toThrow(/bar 1 has 1 beats/)
  })

  it('joins tied notes for the engines, staff 1 the right hand', () => {
    const notes = scoreNotes(parseScore(TINY))
    const g = notes.find((x) => x.midi === 67)!
    expect(g).toMatchObject({ beat: 1, beats: 1.5, value: 'qd', hand: 'right', bar: 0 })
    expect(notes.filter((x) => x.midi === 67)).toHaveLength(1)
    expect(notes.filter((x) => x.hand === 'left').map((x) => x.midi)).toEqual([53, 57, 60])
    expect(valueOf(0.75)).toBe('ed')
    expect(valueOf(0.25)).toBe('s')
  })
})

describe('Etüt Kitaplığı', () => {
  it('has only Public Domain pieces from Mutopia, each named in Turkish and in the original', () => {
    for (const p of ETUDE_PIECES) {
      expect(p.score?.licence).toBe('Public Domain')
      expect(p.score?.mutopia).toBeTruthy()
      expect(p.title && p.original && p.origin && p.fact).toBeTruthy()
      // Every piece reads without an error.
      expect(parseScore(p.score!).bars.length).toBe(p.score!.bars)
    }
  })

  it('every lesson plays notes in both engines', () => {
    const ids = new Set<string>()
    for (const l of ETUDE_LESSONS) {
      expect(ids.has(l.id)).toBe(false)
      ids.add(l.id)
      if (l.kind === 'theory') continue
      expect(l.kind).toBe('etude')
      const part = lessonPart(l.song!)
      expect(part.notes.length, l.id).toBeGreaterThan(0)
      const hands = l.song!.hands
      if (hands !== 'both') expect(part.notes.every((x) => x.hand === hands)).toBe(true)
      if (l.song!.mode === 'wait')
        expect(new WaitSession(part, { bpm: 60, startAt: 0 }).steps.length).toBeGreaterThan(0)
      else expect(new BeatTrack(tempoPlan(part).skill, { bpm: 60, startAt: 0 }).total).toBeGreaterThan(0)
    }
  })

  it('opens levels one after another and lessons in order', () => {
    const none = () => 0
    const [one, two, three] = ETUDE_LEVELS.map((l) => l.lessons)
    expect(etudeOpen(one[0].id, none)).toBe(true)
    expect(etudeOpen(one[1].id, none)).toBe(false)
    expect(etudeOpen(two[0].id, none)).toBe(false)
    const starred = (ids: string[]) => (id: string) => (ids.includes(id) ? 2 : 0)
    expect(etudeOpen(one[1].id, starred([one[0].id]))).toBe(true)
    expect(etudeOpen(two[0].id, starred([one[0].id]))).toBe(true)
    expect(etudeOpen(three[0].id, starred([one[0].id]))).toBe(false)
    // A lesson before a starred one stays open.
    expect(etudeOpen(one[3].id, starred([one[4].id]))).toBe(true)
  })
})

describe('exercises written by rule', () => {
  const notesOf = (bar: string) => bar.split(' ').filter((t) => !t.startsWith('@'))

  it('writes Hanon 1 as in the original: the figure a step higher each bar, the hands an octave apart', () => {
    const s = hanonScore(1)
    const [right] = s.staves[0].voices
    const [left] = s.staves[1].voices
    expect(right[0]).toBe('C4:1/16 E4:2/16 F4:3/16 G4:4/16 A4:5/16 G4:4/16 F4:3/16 E4:2/16')
    expect(right[1]).toBe('D4/16 F4/16 G4/16 A4/16 B4/16 A4/16 G4/16 F4/16')
    expect(left[0]).toBe('C3:5/16 E3:4/16 F3:3/16 G3:2/16 A3:1/16 G3:2/16 F3:3/16 E3:4/16')
    // Up to the group on the seventh, down from its top note, the tonic last.
    expect(right[6]).toMatch(/^B4\/16 D5/)
    expect(right[7]).toMatch(/^G5:5\/16 E5:4/)
    expect(right.at(-1)).toBe('C4:1/h')
    const notes = scoreNotes(parseScore(s))
    const r = notes.filter((n) => n.hand === 'right').map((n) => n.midi)
    const l = notes.filter((n) => n.hand === 'left').map((n) => n.midi)
    expect(l).toEqual(r.map((m) => m - 12))
  })

  it('carries every Hanon exercise into any key over one or two octaves', () => {
    for (const h of HANON)
      for (const key of ['C', 'G', 'F#', 'Bb', 'Db', 'B'])
        for (const octaves of [1, 2] as const) {
          const s = hanonScore(h.no, key, octaves)
          const parsed = parseScore(s)
          expect(parsed.bars.length).toBe(s.bars)
          // Every group but the last bar is eight sixteenths, with Hanon's fingers on the first group up.
          expect(s.staves[0].voices[0].slice(0, -1).every((b) => notesOf(b).length === 8)).toBe(true)
          expect(notesOf(s.staves[0].voices[0][0]).every((t) => /:\d\//.test(t))).toBe(true)
        }
    // In G the F is sharp; over two octaves the right hand starts on the bass staff, as Hanon wrote it.
    expect(hanonScore(1, 'G').staves[0].voices[0][3]).toContain('F#5')
    expect(hanonScore(1, 'C', 2).staves[0].voices[0][0]).toMatch(/^@bass C3:1/)
  })

  it('writes five-finger pieces in a position, the mirror with the same fingers', () => {
    for (const p of FIVE_PIECES) parseScore(fiveScore(p, { tonic: 'D', type: 'major' }))
    const mirror = fiveScore(
      FIVE_PIECES.find((p) => p.slug === 'mirror')!,
      { tonic: 'C', type: 'major' },
    )
    expect(mirror.staves[0].voices[0][0]).toBe('C4:1/q D4/q E4/q F4/q')
    expect(mirror.staves[1].voices[0][0]).toBe('G3:1/q F3/q E3/q D3/q')
    const minor = fiveScore(FIVE_PIECES[0], { tonic: 'A', type: 'natural' })
    expect(minor.key).toBe('Am')
    expect(minor.staves[1].voices[0][0]).toBe('A2:5/q B2/q C3/q D3/q')
  })
})
