import { describe, expect, it } from 'vitest'
import type { TimingRecord } from '../rhythm/track'
import { beatGhost, beatPoints, beatsGhost, type Ghost, ghostAt, lead } from './ghost'

const rec = (dueAt: number, judgement: TimingRecord['judgement'], demo = false): TimingRecord => ({
  target: 60,
  beat: dueAt / 500,
  value: 'q',
  rest: false,
  demo,
  dueAt,
  offsetMs: judgement && judgement !== 'miss' ? 0 : null,
  judgement,
  settledAt: judgement ? dueAt : null,
  wrongPresses: [],
  heldKey: null,
  holdShare: null,
  hold: null,
  holdVerdict: null,
})

describe('Hayalet', () => {
  const ghost: Ghost = { by: 'second', points: [2, 5, 9], score: 9 }

  it('gives the ghost’s score at a moment of its run', () => {
    expect(ghostAt(ghost, 0)).toBe(0)
    expect(ghostAt(ghost, 1)).toBe(2)
    expect(ghostAt(ghost, 3)).toBe(9)
    // After its run ended the ghost keeps its final score.
    expect(ghostAt(ghost, 40)).toBe(9)
    expect(lead(ghost, 2, 7)).toBe(2)
    expect(lead(ghost, 2, 3)).toBe(-2)
  })

  it('keeps only a better run', () => {
    expect(beatsGhost(undefined, ghost)).toBe(true)
    expect(beatsGhost(ghost, { ...ghost, score: 9 })).toBe(false)
    expect(beatsGhost(ghost, { ...ghost, score: 10 })).toBe(true)
    expect(beatsGhost(undefined, { by: 'second', points: [], score: 0 })).toBe(false)
  })

  it('scores a beat round note by note, in percent of the whole round', () => {
    // Four notes: perfect, good, miss, and one not settled yet. The app's own notes do not count.
    const records = [rec(0, 'perfect'), rec(500, 'good'), rec(1000, 'miss'), rec(1500, null), rec(200, 'perfect', true)]
    expect(beatPoints(records)).toEqual([25, 46, 46])
    const all = beatGhost([records.map((r) => (r.judgement === null ? { ...r, judgement: 'perfect' as const } : r))])
    expect(all.by).toBe('note')
    expect(all.points).toEqual([25, 46, 46, 71])
    expect(all.score).toBe(71)
  })

  it('joins the rounds of a tempo ladder', () => {
    const round = [rec(0, 'perfect'), rec(500, 'perfect')]
    const g = beatGhost([round, round])
    expect(g.points).toEqual([25, 50, 75, 100])
    expect(g.score).toBe(100)
  })
})
