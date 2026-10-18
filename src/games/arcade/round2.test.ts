import { describe, expect, it } from 'vitest'
import { parseNote, whiteKeysBetween } from '../../music/notes'
import { xpFor } from '../../progress/gamification'
import { COSTUMES, costumeOpen, newCostumes } from '../../progress/wardrobe'
import { duetReport, DuetSession, MIN_FREE_NOTES, onsetsOf } from '../duet/session'
import { firstTryOk } from '../noteHunter/session'
import { summarize } from '../noteHunter/summary'
import { BalloonGame } from './balloon/engine'
import { goldenStats, isGoldenIndex } from './bonus'
import { FrogGame, frogPath, jumpLabel, jumpTopics, stepSize } from './frog/engine'
import type { SkillProvider } from './skill'

const n = parseNote
const C4 = n('C4')

const fixed = (midis: number[]): SkillProvider => ({
  clef: 'treble',
  range: [...midis].sort((a, b) => a - b),
  targets: midis.map((midi) => ({ midi })),
  matches: (t, pressed) => t.midi === pressed,
})

function run(game: { update: (dt: number, now: number) => unknown[] }, ms: number, from = 0, step = 50) {
  const events: unknown[] = []
  for (let t = from; t < from + ms; t += step) events.push(...game.update(step, t))
  return events
}

describe('Altın balon', () => {
  it('makes the fifth target golden, then every seventh', () => {
    expect([0, 1, 2, 3, 4, 5, 11, 18].map(isGoldenIndex)).toEqual([false, false, false, false, true, false, true, true])
  })

  it('counts golden balloons caught at the first try and gives them XP', () => {
    const game = new BalloonGame(fixed(Array(6).fill(C4)), 3, () => 0)
    let now = 0
    while (!game.done && now < 60_000) {
      game.update(50, now)
      for (const b of game.flying) game.press(b.record.target, now)
      now += 50
    }
    expect(goldenStats(game.records)).toEqual({ shown: 1, caught: 1 })
    const base = { lessonId: 'treble-balloon-1', total: 6, firstTry: 6, accuracy: 1, avgReactionMs: null, stars: 3 }
    const lines = xpFor({ ...base, failed: false, golden: 1 })
    expect(lines.find((l) => l.label === 'Altın hedefler')?.xp).toBe(5)
  })
})

describe('İpucu parıltısı', () => {
  it('glows a balloon close to the top; that answer is not a first-try one', () => {
    const game = new BalloonGame(fixed([C4]), 3, () => 0)
    game.update(50, 0)
    expect(game.hint()).toBeNull()
    run(game, 6500, 50)
    const hinted = game.hint()
    expect(hinted?.target).toBe(C4)
    game.press(C4, 7000)
    expect(firstTryOk(game.records[0])).toBe(false)
    const summary = summarize(game.attempted, 'treble')
    expect(summary.firstTry).toBe(0)
    expect(summary.hinted).toEqual({ count: 1, notes: [C4] })
  })
})

describe('Kurbağa Atlayışı', () => {
  it('names jumps by their size on the staff', () => {
    expect(stepSize(n('E4'), n('G4'))).toBe(3)
    expect(stepSize(n('C4'), n('D4'))).toBe(2)
    expect(stepSize(n('C5'), n('C4'))).toBe(8)
    expect(jumpLabel(n('E4'), n('G4'))).toBe("↑ 3'lü")
    expect(jumpLabel(n('G4'), n('C4'))).toBe("↓ 5'li")
    expect(jumpLabel(n('C4'), n('C5'))).toBe("↑ 8'li (oktav)")
  })

  it('makes a path of the given jumps inside the range', () => {
    const low = C4
    const high = n('C5')
    const whites = whiteKeysBetween(low, high)
    let seed = 1
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const path = frogPath(n('E4'), [2, 3], low, high, 40, random)
    let from = n('E4')
    for (const to of path) {
      expect(whites).toContain(to)
      expect([2, 3]).toContain(stepSize(from, to))
      from = to
    }
  })

  it('jumps on the right key, waits on a wrong one and loses a heart when the pad sinks', () => {
    const game = new FrogGame(fixed([n('G4'), n('B4'), n('A4')]), n('E4'))
    run(game, 1000)
    expect(game.pad?.from).toBe(n('E4'))
    expect(game.press(n('F4'), 1000)[0].type).toBe('wrong')
    expect(game.hearts).toBe(3)
    expect(game.press(n('G4'), 1100)[0].type).toBe('jump')
    expect(game.at).toBe(n('G4'))
    const events = run(game, 20_000, 1200) as { type: string }[]
    expect(events.filter((e) => e.type === 'splash').length).toBe(2)
    expect(game.hearts).toBe(1)
    expect(game.done).toBe(true)
    const topics = jumpTopics(game.records, n('E4'))
    expect(topics.map((t) => t.label)).toEqual(["2'li aşağı", "3'lü yukarı"])
    expect(topics.find((t) => t.id === '3-up')).toMatchObject({ shown: 2, firstTry: 0 })
  })
})

describe('Çift Kişilik Davul', () => {
  const spec = { bpm: 60, beatsPerBar: 4, calls: 'q q h | q qr q q', turns: ['echo', 'free', 'free'] as const }

  it('finds the notes of a call', () => {
    expect(onsetsOf(['q', 'qr', 'q', 'q'])).toEqual([0, 2, 3])
  })

  it('judges a copied call, a free answer of one’s own and a too-short answer', () => {
    const s = new DuetSession({ ...spec, turns: [...spec.turns] }, 0)
    const [echo, free, quiet] = s.rounds
    // The call of round 1 is playing: pressing now is not an answer.
    expect(s.press(500)[0].type).toBe('stray')
    // Echo: "q q h" one bar later, a little late on the second note.
    for (const t of [4000, 5030, 6000]) expect(s.press(t)[0].type).toBe('tap')
    s.update(echo.answerEnd)
    expect(echo.result).toMatchObject({ ok: true, extra: 0 })
    expect(echo.result!.score).toBeGreaterThan(0.9)
    // Free answer: eighths and quarters of one's own, on the grid.
    for (const t of [12000, 12500, 13000, 14000, 14500]) s.press(free.answerStart - 12000 + t)
    s.update(free.answerEnd)
    expect(free.result).toMatchObject({ ok: true, own: true, onGrid: 5 })
    // Too few notes.
    for (let i = 0; i < MIN_FREE_NOTES - 1; i++) s.press(quiet.answerStart + i * 1000)
    s.update(quiet.answerEnd + 1000)
    expect(quiet.result).toMatchObject({ ok: false, quiet: true, score: 0 })
    expect(s.done).toBe(true)

    const report = duetReport(s)
    expect(report.total).toBe(3)
    expect(report.firstTry).toBe(2)
    expect(report.perCategory.map((c) => c.id)).toEqual(['echo', 'free'])
    expect(report.duet?.ownRhythms).toBe(1)
  })

  it('counts off-grid presses against a free answer', () => {
    const s = new DuetSession({ ...spec, turns: ['free'] }, 0)
    const r = s.rounds[0]
    for (const off of [0, 250, 1000, 1700]) s.press(r.answerStart + off)
    s.update(r.answerEnd)
    expect(r.result).toMatchObject({ onGrid: 2, extra: 2, ok: false })
  })
})

describe('Kostüm dolabı', () => {
  it('opens costumes by level and badge', () => {
    const party = COSTUMES.find((c) => c.id === 'party')!
    const crown = COSTUMES.find((c) => c.id === 'crown')!
    expect(costumeOpen(party, { level: 1, badges: [] })).toBe(false)
    expect(costumeOpen(party, { level: 2, badges: [] })).toBe(true)
    expect(costumeOpen(crown, { level: 20, badges: [] })).toBe(false)
    expect(costumeOpen(crown, { level: 1, badges: ['boss-hunter'] })).toBe(true)
    expect(
      newCostumes({ level: 1, badges: [] }, { level: 2, badges: ['streak-3'] })
        .map((c) => c.id)
        .sort(),
    ).toEqual(['flower', 'party'])
  })
})
