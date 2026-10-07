import { describe, expect, it } from 'vitest'
import { parseNote } from '../../music/notes'
import { summarize } from '../noteHunter/summary'
import { BalloonGame } from './balloon/engine'
import { BIRD_X, BirdGame } from './bird/engine'
import { noteSkill } from './skill'
import { fitStaff, ledgerSteps, staffStep, stepY } from './staffGeometry'

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const C4 = parseNote('C4')
const E4 = parseNote('E4')
const G4 = parseNote('G4')

describe('staff geometry', () => {
  it('counts steps from the bottom line', () => {
    expect(staffStep(E4, 'treble')).toBe(0)
    expect(staffStep(parseNote('F5'), 'treble')).toBe(8)
    expect(staffStep(C4, 'treble')).toBe(-2)
    expect(staffStep(parseNote('G2'), 'bass')).toBe(0)
  })

  it('lists ledger lines', () => {
    expect(ledgerSteps(-2)).toEqual([-2])
    expect(ledgerSteps(-1)).toEqual([])
    expect(ledgerSteps(-4)).toEqual([-2, -4])
    expect(ledgerSteps(11)).toEqual([10])
    expect(ledgerSteps(4)).toEqual([])
  })

  it('fits the staff into a height', () => {
    const layout = fitStaff(200, -2, 10, 1)
    expect(stepY(-3, layout)).toBeCloseTo(200)
    expect(stepY(11, layout)).toBeCloseTo(0)
  })
})

/** Run the game until `until` is true, feeding a fixed frame time. */
function run(game: { update: (dt: number, now: number) => unknown }, until: () => boolean, clock = { now: 0 }) {
  for (let i = 0; i < 20000 && !until(); i++) {
    clock.now += 16
    game.update(16, clock.now)
  }
  return clock
}

describe('BirdGame', () => {
  const skill = () => noteSkill({ clef: 'treble', notes: [C4, E4, G4], length: 4, random: seeded(3) })

  it('passes every pipe when the right note is played', () => {
    const game = new BirdGame(skill())
    const clock = { now: 0 }
    while (!game.done) {
      run(game, () => game.current !== null || game.done, clock)
      const cur = game.current
      if (cur) {
        game.press(cur.record.target, clock.now + 300)
        run(game, () => cur.state !== 'flying', clock)
      }
    }
    expect(game.score).toBe(4)
    expect(game.failed).toBe(false)
    const s = summarize(game.attempted, 'treble')
    expect(s.accuracy).toBe(1)
    expect(s.total).toBe(4)
  })

  it('crashes, loses hearts and fails on wrong notes', () => {
    const game = new BirdGame(skill(), 2)
    const clock = { now: 0 }
    while (!game.done) {
      run(game, () => game.current !== null || game.done, clock)
      const cur = game.current
      if (cur) {
        const wrong = [C4, E4, G4].find((n) => n !== cur.record.target)!
        game.press(wrong, clock.now)
        run(game, () => cur.state !== 'flying', clock)
        expect(cur.state).toBe('crashed')
      }
    }
    expect(game.failed).toBe(true)
    expect(game.hearts).toBe(0)
    const s = summarize(game.attempted, 'treble', true)
    expect(s.total).toBe(2)
    expect(s.accuracy).toBe(0)
    expect(s.totalMistakes).toBe(2)
  })

  it('pipes move left towards the bird', () => {
    const game = new BirdGame(skill())
    game.update(16, 16)
    const x0 = game.pipes[0].x
    game.update(500, 516)
    expect(game.pipes[0].x).toBeLessThan(x0)
    expect(BIRD_X).toBeLessThan(x0)
  })
})

describe('BalloonGame', () => {
  const skill = () => noteSkill({ clef: 'treble', notes: [C4, E4, G4], length: 5, random: seeded(5) })

  it('pops balloons with the right note and reports wrong presses', () => {
    const game = new BalloonGame(skill(), 3, seeded(2))
    const clock = { now: 0 }
    let wrongOnce = false
    while (!game.done) {
      run(game, () => game.flying.length > 0 || game.done, clock)
      const b = game.flying.sort((a, c) => a.y - c.y)[0]
      if (!b) continue
      if (!wrongOnce) {
        const wrong = [C4, E4, G4].find((n) => !game.flying.some((f) => f.record.target === n))
        if (wrong !== undefined) {
          expect(game.press(wrong, clock.now)[0].type).toBe('wrong')
          wrongOnce = true
        }
      }
      expect(game.press(b.record.target, clock.now + 100)[0].type).toBe('pop')
    }
    expect(game.score).toBe(5)
    const s = summarize(game.attempted, 'treble')
    expect(s.total).toBe(5)
    expect(s.firstTry).toBe(wrongOnce ? 4 : 5)
  })

  it('loses a heart for every escaped balloon', () => {
    const game = new BalloonGame(skill(), 2, seeded(2))
    run(game, () => game.done)
    expect(game.failed).toBe(true)
    expect(game.attempted.every((r) => r.missed)).toBe(true)
    expect(summarize(game.attempted, 'treble', true).accuracy).toBe(0)
  })
})
