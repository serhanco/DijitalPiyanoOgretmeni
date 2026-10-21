import { describe, expect, it } from 'vitest'
import { BeatTrack } from '../../rhythm/track'
import { lessonPart } from '../songs/song'
import { tempoPlan } from '../songs/tempo'
import { WaitSession } from '../songs/wait'
import { ETUDE_PIECES } from './catalog'
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
