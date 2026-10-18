import { describe, expect, it } from 'vitest'
import { parseNote } from '../../music/notes'
import { parseTune } from '../../rhythm/plan'
import { summarize } from '../noteHunter/summary'
import { ChirpGame } from './chirp/engine'
import { ENDLESS_RAMP, rampAt, Surprise, SURPRISE_BOOST, SURPRISE_FIRST_S, SURPRISE_FOR_S } from './ramp'
import { noteSkill, type SkillProvider } from './skill'
import { SIGNAL_X, TrainGame, WAGON_GAP } from './train/engine'
import * as TUNES from './train/tunes'
import { tunePitches } from './train/tunes'

const C4 = parseNote('C4')
const E4 = parseNote('E4')
const G4 = parseNote('G4')

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

describe('speed ramp and surprises', () => {
  it('ramps over the whole list, or over a fixed count in an endless game', () => {
    expect(rampAt(0, 10, null)).toBe(0)
    expect(rampAt(9, 10, null)).toBe(1)
    expect(rampAt(15, 400, ENDLESS_RAMP)).toBeCloseTo(0.5)
    expect(rampAt(200, 400, ENDLESS_RAMP)).toBe(ENDLESS_RAMP.max)
  })

  it('switches a surprise on after a while and off again', () => {
    const s = new Surprise()
    expect(s.tick(SURPRISE_FIRST_S - 0.1)).toBeNull()
    expect(s.boost).toBe(1)
    expect(s.tick(0.2)).toBe('start')
    expect(s.boost).toBe(SURPRISE_BOOST)
    expect(s.points).toBe(2)
    expect(s.leftS).toBeGreaterThan(SURPRISE_FOR_S - 0.2)
    expect(s.tick(SURPRISE_FOR_S)).toBe('end')
    expect(s.points).toBe(1)
    expect(s.count).toBe(1)
  })

  it('never starts when turned off', () => {
    const s = new Surprise()
    s.enabled = false
    expect(s.tick(1000)).toBeNull()
    expect(s.active).toBe(false)
  })
})

describe('Nota Treni', () => {
  it('sends the wagons in order and couples the front one', () => {
    const game = new TrainGame(fixed([C4, E4, G4]))
    game.update(50, 0)
    expect(game.front?.record.target).toBe(C4)
    // Reading ahead: the next wagons come in a row behind the first.
    run(game, 3000, 50)
    expect(game.wagons.length).toBe(3)
    const xs = game.wagons.map((w) => w.x)
    expect(xs[1] - xs[0]).toBeCloseTo(WAGON_GAP, 1)
    expect(game.press(E4, 3100)[0].type).toBe('wrong')
    expect(game.hearts).toBe(3)
    expect(game.press(C4, 3200)[0].type).toBe('couple')
    expect(game.front?.record.target).toBe(E4)
    expect(game.coupled).toBe(1)
  })

  it('derails a wagon that reaches the signal and costs a heart', () => {
    const game = new TrainGame(fixed([C4, E4]))
    game.surprise.enabled = false
    const events = run(game, 12000) as { type: string }[]
    expect(events.filter((e) => e.type === 'derail').length).toBe(2)
    expect(game.hearts).toBe(1)
    expect(game.done).toBe(true)
    expect(game.records.every((r) => r.missed)).toBe(true)
    expect(game.wagons.every((w) => w.x > SIGNAL_X - 0.2)).toBe(true)
  })

  it('reports like the drill', () => {
    const game = new TrainGame(fixed([C4, E4]))
    game.update(50, 0)
    game.press(C4, 800)
    run(game, 2500, 100)
    game.press(G4, 2700)
    game.press(E4, 2900)
    const s = summarize(game.attempted, 'treble', game.failed)
    expect(s.total).toBe(2)
    expect(s.firstTry).toBe(1)
  })

  it('counts double during a surprise', () => {
    const game = new TrainGame(noteSkill({ clef: 'treble', notes: [C4], length: 50 }))
    // Keep playing the front wagon as the game runs.
    for (let t = 0; t < (SURPRISE_FIRST_S + 0.5) * 1000; t += 100) {
      game.update(100, t)
      if (game.front && game.front.x < 0.5) game.press(C4, t)
    }
    expect(game.surprise.active).toBe(true)
    const before = game.score
    game.press(C4, 99999)
    expect(game.score - before).toBe(2)
  })
})

describe('Kayıp Kuş Sesi', () => {
  it('flies a bird in, sings its note and sends it home on the right key', () => {
    const game = new ChirpGame(fixed([E4, G4]), 3, () => 0.5)
    const events = run(game, 2000) as { type: string; again?: boolean }[]
    expect(events.find((e) => e.type === 'sing')).toMatchObject({ again: false })
    expect(game.waiting?.record.target).toBe(E4)
    expect(game.press(C4, 2100)[0].type).toBe('wrong')
    expect(game.hearts).toBe(3)
    expect(game.replay()[0]).toMatchObject({ type: 'sing', again: true })
    expect(game.replays).toBe(1)
    expect(game.press(E4, 2300)[0].type).toBe('home')
    expect(game.nests.get(E4)).toBe(1)
  })

  it('loses a bird that waits too long', () => {
    const game = new ChirpGame(fixed([G4]))
    const events = run(game, 15000) as { type: string }[]
    expect(events.some((e) => e.type === 'lost')).toBe(true)
    expect(game.hearts).toBe(2)
    expect(game.records[0].missed).toBe(true)
  })

  it('stays calm: no surprises', () => {
    const game = new ChirpGame(fixed([C4, E4, G4]))
    run(game, 60000, 0, 200)
    expect(game.surprise.count).toBe(0)
  })
})

describe('Nota Treni songs', () => {
  const tunes = Object.entries(TUNES).filter(([, v]) => typeof v === 'object') as [string, TUNES_T][]
  type TUNES_T = typeof TUNES.ROW_BOAT

  it('every song has full bars, its original title and where it comes from', () => {
    expect(tunes.length).toBe(7)
    for (const [name, tune] of tunes) {
      expect(() => parseTune(tune, name === 'BRAHMS_LULLABY' ? 3 : 4)).not.toThrow()
      expect(tune.original).toBeTruthy()
      expect(tune.origin).toMatch(/\d{4}|yüzyıl/)
      expect(tunePitches(tune).length).toBeGreaterThan(8)
    }
  })

  it('keeps the songs in the treble clef around middle C', () => {
    for (const [, tune] of tunes)
      for (const p of tunePitches(tune)) {
        expect(p).toBeGreaterThanOrEqual(C4)
        expect(p).toBeLessThanOrEqual(parseNote('C5'))
      }
  })
})
