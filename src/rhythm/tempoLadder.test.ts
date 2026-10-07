import { describe, expect, it } from 'vitest'
import { rhythmSkill } from '../games/arcade/skill'
import {
  ladderTempos,
  maxBase,
  nextRound,
  raisedBase,
  scoreRound,
  tempoLadderSummary,
  tempoTopics,
} from './tempoLadder'
import { BeatTrack } from './track'

const SPEC = { rounds: 3, stepBpm: 12 }
const skill = rhythmSkill({ clef: 'treble', bars: [['q', 'q', 'q', 'q']], notes: [60], anyKey: true, beatsPerBar: 4 })

/** A finished round at `bpm`: `late` notes 60 ms late (early/late = 0.4), the rest perfect. */
function round(bpm: number, late = 0): BeatTrack {
  const t = new BeatTrack(skill, { bpm, startAt: 0 })
  t.records.forEach((r, i) => t.press(60, r.dueAt + (i < late ? 120 : 0)))
  t.update(100_000)
  return t
}

describe('tempo ladder', () => {
  it('climbs from the starting tempo and never past the top', () => {
    expect(ladderTempos(60, SPEC)).toEqual([60, 72, 84])
    expect(maxBase(SPEC)).toBe(136)
    expect(ladderTempos(150, SPEC)).toEqual([136, 148, 160])
  })

  it('passes a round with a good timing score', () => {
    expect(scoreRound(round(60))).toMatchObject({ bpm: 60, score: 1, passed: true })
    // Two of four notes late: (1 + 1 + 0.4 + 0.4) / 4 = 0.7.
    const r = scoreRound(round(72, 2))
    expect(r.score).toBeCloseTo(0.7)
    expect(r.passed).toBe(false)
  })

  it('counts notes never reached as missed', () => {
    const t = new BeatTrack(skill, { bpm: 60, startAt: 0, hearts: 1 })
    t.update(100_000)
    expect(t.failed).toBe(true)
    expect(scoreRound(t)).toMatchObject({ score: 0, passed: false })
  })

  it('goes on to the next tempo only after a passed round', () => {
    const tempos = [60, 72, 84]
    expect(nextRound([], tempos)).toBeNull()
    expect(nextRound([scoreRound(round(60))], tempos)).toBe(72)
    expect(nextRound([scoreRound(round(60, 3))], tempos)).toBeNull()
    expect(
      nextRound(
        [60, 72, 84].map((b) => scoreRound(round(b))),
        tempos,
      ),
    ).toBeNull()
  })

  it('raises the starting tempo for good once every round is passed', () => {
    const tempos = [60, 72, 84]
    const all = tempos.map((b) => round(b))
    expect(tempoLadderSummary(all, tempos, SPEC).raisedTo).toBe(72)
    const stopped = [round(60), round(72, 4)]
    expect(tempoLadderSummary(stopped, tempos, SPEC).raisedTo).toBeNull()
    const top = ladderTempos(136, SPEC)
    expect(
      raisedBase(
        top,
        top.map((b) => scoreRound(round(b))),
        SPEC,
      ),
    ).toBeNull()
  })

  it('reports one topic per tempo', () => {
    const topics = tempoTopics([round(60), round(72, 2)])
    expect(topics.map((t) => [t.label, t.shown, t.firstTry])).toEqual([
      ['60 BPM', 4, 4],
      ['72 BPM', 4, 2],
    ])
    expect(topics[1].accuracy).toBeCloseTo(0.7)
  })
})
