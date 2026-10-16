import { describe, expect, it } from 'vitest'
import { TWINKLE, ODE_SIMPLE } from '../../rhythm/tunes'
import { MemoryGame, memoryReport, songMemory } from './engine'

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
  const last = schedule[schedule.length - 1]
  let t = last.at + Math.max(g.noteMs, last.durationMs / 0.85)
  expect(g.update(t - 1)).toEqual([])
  expect(g.update(t)).toEqual([{ type: 'play' }])
  g.answer.forEach((midi, i) => {
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

  it('plays runs back to front in reverse mode', () => {
    const g = new MemoryGame({ pool: POOL, random: seeded(5), maxLength: 4, reverse: true })
    g.startRound(0)
    g.update(10_000)
    const seq = g.sequence
    expect(g.expected).toBe(seq[seq.length - 1])
    expect(g.press(seq[0], 10_100)[0].type).toBe(seq[0] === seq[seq.length - 1] ? 'hit' : 'wrong')
    const r = new MemoryGame({ pool: POOL, random: seeded(5), maxLength: 4, reverse: true })
    let t = playRound(r, 0)
    playRound(r, t)
    expect(r.done).toBe(true)
    expect(memoryReport(r).perCategory.find((c) => c.id === 'reverse')).toMatchObject({ shown: 7, firstTry: 7 })
  })
})

describe('songMemory', () => {
  it('cuts a song into two-bar phrases, learns them in pairs and ends with the whole song', () => {
    const song = songMemory(TWINKLE)
    expect(song.notes).toHaveLength(14)
    expect(song.segments.map((g) => g.label)).toEqual(['1. cümle', '2. cümle', '1. ve 2. cümle birlikte'])
    expect(song.segments.map((g) => g.end - g.start)).toEqual([7, 7, 14])

    const ode = songMemory(ODE_SIMPLE)
    expect(ode.segments.map((g) => g.label)).toEqual([
      '1. cümle',
      '2. cümle',
      '1. ve 2. cümle birlikte',
      '3. cümle',
      '4. cümle',
      '3. ve 4. cümle birlikte',
      'Şarkının tamamı',
    ])
  })

  it('plays a phrase in its rhythm and moves on to the next run', () => {
    const g = new MemoryGame({ pool: [], song: songMemory(TWINKLE), noteMs: 500 })
    expect(g.totalRounds).toBe(3)
    const schedule = new MemoryGame({ pool: [], song: songMemory(TWINKLE), noteMs: 500 }).startRound(0)
    // C C G G A A G(half): the half note starts on beat 6 and is held two beats.
    expect(schedule.map((n) => n.at - schedule[0].at)).toEqual([0, 500, 1000, 1500, 2000, 2500, 3000])
    expect(schedule[6].durationMs).toBe(850)
    let t = playRound(g, 10_000)
    expect(g.segmentLabel).toBe('2. cümle')
    t = playRound(g, t)
    expect(g.length).toBe(14)
    playRound(g, t, 3)
    expect(g.done).toBe(true)
    const { perCategory, memory } = memoryReport(g)
    expect(memory.song).toEqual({
      title: 'Küçük Yıldız',
      clean: 2,
      runs: 3,
      lastClean: false,
      lastLabel: '1. ve 2. cümle birlikte',
    })
    expect(perCategory.find((c) => c.id === 'seg:2. cümle')).toMatchObject({ shown: 7, firstTry: 7 })
  })
})
