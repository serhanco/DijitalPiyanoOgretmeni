import { describe, expect, it } from 'vitest'
import { parseNote } from '../../music/notes'
import { HANDS_LESSONS } from '../noteHunter/handsLessons'
import { BASS_LESSONS } from '../noteHunter/bassLessons'
import { summarize } from '../noteHunter/summary'
import { MelodySession, parseMelodies, parseMelody, syncSummary } from './session'

const C3 = parseNote('C3')
const C4 = parseNote('C4')
const E4 = parseNote('E4')

describe('parseMelody', () => {
  it('reads steps, chords and forced staves', () => {
    expect(parseMelody('C3 C3+E4 C4L C4')).toEqual([
      { melody: 0, notes: [{ midi: C3, clef: 'bass' }] },
      {
        melody: 0,
        notes: [
          { midi: C3, clef: 'bass' },
          { midi: E4, clef: 'treble' },
        ],
      },
      { melody: 0, notes: [{ midi: C4, clef: 'bass' }] },
      { melody: 0, notes: [{ midi: C4, clef: 'treble' }] },
    ])
  })

  it('puts every note on the lesson staff when it has one', () => {
    expect(parseMelody('C4 E4', 'bass').every((s) => s.notes[0].clef === 'bass')).toBe(true)
  })

  it('parses every melody lesson and keeps it inside its keyboard', () => {
    for (const lesson of [...BASS_LESSONS, ...HANDS_LESSONS].filter((l) => l.kind === 'melody')) {
      const steps = parseMelodies(lesson.melodies!, lesson.grand ? undefined : lesson.clef)
      expect(steps.length).toBeGreaterThan(8)
      for (const n of steps.flatMap((s) => s.notes)) {
        expect(n.midi).toBeGreaterThanOrEqual(lesson.keyboard.low)
        expect(n.midi).toBeLessThanOrEqual(lesson.keyboard.high)
      }
    }
  })
})

describe('MelodySession', () => {
  it('advances step by step and waits for both hands', () => {
    const s = new MelodySession({ steps: parseMelody('C3 C3+E4 C4') })
    expect(s.press(C3, 0)).toBe('ignored') // not shown yet
    s.markShown(0)
    expect(s.press(C3, 500)).toBe('step')
    s.markShown(600)
    expect(s.pending).toEqual([C3, E4])
    expect(s.press(E4, 1000)).toBe('partial')
    expect(s.press(E4, 1010)).toBe('ignored') // the same key again is no mistake
    expect(s.press(C3, 1040)).toBe('step')
    s.markShown(1100)
    expect(s.press(C4, 1500)).toBe('step')
    expect(s.done).toBe(true)
    expect(s.attempted).toHaveLength(4)
  })

  it('blames a wrong key on the hand that pressed it and spends hearts', () => {
    const s = new MelodySession({ steps: parseMelody('C3+E4 C4'), hearts: 2 })
    s.markShown(0)
    s.press(parseNote('D3'), 100)
    const [left, right] = s.stepRecords[0]
    expect(left.wrongPresses).toEqual([parseNote('D3')])
    expect(right.wrongPresses).toEqual([])
    s.press(parseNote('G4'), 200)
    expect(right.wrongPresses).toEqual([parseNote('G4')])
    expect(s.failed).toBe(true)
    expect(s.done).toBe(true)
  })

  it('reports each hand and how close together they played', () => {
    const s = new MelodySession({ steps: parseMelody('C3+C4 D3+D4 E3+E4 F4') })
    let t = 0
    const play = (...keys: [number, number][]) => {
      s.markShown(t)
      for (const [k, dt] of keys) s.press(k, t + dt)
      t += 1000
    }
    play([C3, 300], [C4, 330]) // together, left 30 ms first
    play([parseNote('D4'), 400], [parseNote('D3'), 600]) // right 200 ms first
    play([parseNote('A3'), 100], [parseNote('E3'), 300], [E4, 310]) // left hand mistake
    play([parseNote('F4'), 250])
    const sync = syncSummary(s.stepRecords)!
    expect(sync.pairs).toBe(3)
    expect(sync.together).toBe(2)
    expect(sync.meanGapMs).toBeCloseTo((30 + 200 + 10) / 3)
    expect(sync.meanLeadMs).toBeCloseTo((-30 + 200 - 10) / 3)

    const summary = summarize(s.attempted, 'treble')
    const [right, left] = summary.hands!
    expect(right).toMatchObject({ hand: 'right', shown: 4, firstTry: 4, accuracy: 1 })
    expect(left).toMatchObject({ hand: 'left', shown: 3, firstTry: 2 })
    expect(summary.weakest[0]).toMatchObject({ midi: parseNote('E3'), clef: 'bass' })
  })

  it('ignores the octave when asked', () => {
    const s = new MelodySession({ steps: parseMelody('C3'), ignoreOctave: true })
    s.markShown(0)
    expect(s.press(parseNote('C5'), 10)).toBe('step')
  })
})

describe('summarize on the grand staff', () => {
  it('keeps middle C on each staff apart and places notes on their own staff', () => {
    const rec = (target: number, clef: 'treble' | 'bass', wrong: number[] = []) => ({
      target,
      clef,
      shownAt: 0,
      answeredAt: 1000,
      wrongPresses: wrong,
    })
    const s = summarize([rec(C4, 'treble'), rec(C4, 'bass', [parseNote('E4')]), rec(parseNote('G2'), 'bass')], 'treble')
    expect(s.perNote.map((n) => `${n.clef}:${n.midi}`)).toEqual([
      `bass:${parseNote('G2')}`,
      `bass:${C4}`,
      `treble:${C4}`,
    ])
    // G2 is the bottom line of the bass staff; middle C is a ledger note on both.
    expect(s.perCategory.map((c) => [c.id, c.shown])).toEqual([
      ['line', 1],
      ['outside', 2],
    ])
    expect(s.hands!.map((h) => h.accuracy)).toEqual([1, 0.5])
  })

  it('has no hand report on a single staff', () => {
    expect(summarize([{ target: C4, shownAt: 0, answeredAt: 1, wrongPresses: [] }], 'treble').hands).toBeUndefined()
  })
})
