import { describe, expect, it } from 'vitest'
import { MemoryGame, memoryReport } from './engine'

const POOL = [60, 62, 64, 65, 67, 69, 71, 72]

/** A repeatable random source. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Listen to the run, then repeat it; returns the time after the round. */
function playRound(g: MemoryGame, now: number, wrongAt = -1): number {
  const schedule = g.startRound(now)
  expect(schedule).toHaveLength(g.length)
  let t = schedule[schedule.length - 1].at + g.noteMs
  expect(g.update(t - 1)).toEqual([])
  expect(g.update(t)).toEqual([{ type: 'play' }])
  g.sequence.forEach((midi, i) => {
    t += 300
    if (i === wrongAt) g.press(midi === 60 ? 62 : 60, t - 100)
    g.press(midi, t)
  })
  return t + 1000
}

describe('MemoryGame', () => {
  it('can start every run on a fixed note (the tonic, by ear)', () => {
    for (const seed of [1, 7, 42]) {
      const g = new MemoryGame({ pool: POOL, firstPosition: 0, random: seeded(seed) })
      expect(g.sequence[0]).toBe(60)
    }
  })

  it('builds runs of scale steps that grow by one note every round', () => {
    const g = new MemoryGame({ pool: POOL, random: seeded(3), maxLength: 5 })
    expect(g.length).toBe(3)
    for (let i = 1; i < g.positions.length; i++) expect(Math.abs(g.positions[i] - g.positions[i - 1])).toBeLessThan(3)
    const first = g.sequence
    let t = playRound(g, 0)
    expect(g.phase).toBe('ready')
    expect(g.sequence.slice(0, 3)).toEqual(first)
    t = playRound(g, t)
    playRound(g, t)
    expect(g.done).toBe(true)
    expect(g.rounds.map((r) => r.length)).toEqual([3, 4, 5])
  })

  it('ignores keys while the run plays and counts wrong keys while repeating', () => {
    const g = new MemoryGame({ pool: POOL, random: seeded(7), hearts: 2 })
    g.startRound(0)
    expect(g.press(60, 10)).toEqual([])
    g.update(10_000)
    const wrong = g.expected === 60 ? 62 : 60
    expect(g.press(wrong, 10_100)[0]).toMatchObject({ type: 'wrong', expected: g.expected })
    expect(g.heartsLeft).toBe(1)
    expect(g.press(wrong, 10_200).map((e) => e.type)).toEqual(['wrong', 'failed'])
    expect(g.done && g.failed).toBe(true)
  })

  it('reports moves, run lengths and the longest run remembered', () => {
    const g = new MemoryGame({ pool: POOL, random: seeded(11), maxLength: 6 })
    let t = playRound(g, 0)
    t = playRound(g, t)
    t = playRound(g, t, 2)
    playRound(g, t)
    const { perCategory, memory } = memoryReport(g)
    expect(memory).toEqual({ longest: 6, longestClean: 6, maxLength: 6 })
    const total = perCategory.filter((c) => ['short', 'mid', 'long'].includes(c.id)).reduce((n, c) => n + c.shown, 0)
    expect(total).toBe(3 + 4 + 5 + 6)
    expect(perCategory.find((c) => c.id === 'mid')).toMatchObject({ shown: 11, firstTry: 10 })
  })
})
