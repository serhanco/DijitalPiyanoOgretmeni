import { describe, expect, it } from 'vitest'
import { chordTarget } from '../../music/chords'
import { parseNote } from '../../music/notes'
import { summarizeChords } from '../chords/report'
import { ChordBarGame, chordBarRows } from './bar/chordEngine'
import { ChefGame, NEXT_ORDER_S } from './chef/engine'
import { BASE_Y, SpaceGame } from './space/engine'

const C = chordTarget('C', 'major')
const F = chordTarget('F', 'major')
const G1 = chordTarget('G', 'major', 1)

/** Run a game's clock in 50 ms frames. */
function run(game: { update: (dt: number, now: number) => unknown[] }, from: number, ms: number) {
  const events: unknown[] = []
  for (let t = from; t < from + ms; t += 50) events.push(...game.update(50, t))
  return events
}

const play = (game: { press: (m: number, t: number) => unknown[] }, target: { notes: { midi: number }[] }, t: number) =>
  target.notes.flatMap((n, i) => game.press(n.midi, t + i * 15))

describe('Uzay Savunması', () => {
  it('shoots the invader whose chord is played, whichever lane it is in', () => {
    const game = new SpaceGame([C, F, G1], { mode: 'voicing', random: () => 0.5 })
    run(game, 0, 9000)
    expect(game.flying.length).toBeGreaterThanOrEqual(2)
    const second = game.flying.find((i) => i.record.chord === F)!
    const events = play(game, F, 9000)
    expect(events[events.length - 1]).toMatchObject({ type: 'shoot', together: true })
    expect(second.state).toBe('hit')
    expect(game.score).toBe(1)
  })

  it('accepts the chord in another octave but not in another inversion', () => {
    const game = new SpaceGame([C], { mode: 'voicing' })
    run(game, 0, 1000)
    const wrong = ['E3', 'G3', 'C4'].flatMap((n, i) => game.press(parseNote(n), 1000 + i * 10))
    expect(wrong.at(-1)).toMatchObject({ type: 'inversion' })
    const right = ['C3', 'E3', 'G3'].flatMap((n, i) => game.press(parseNote(n), 1500 + i * 10))
    expect(right.at(-1)).toMatchObject({ type: 'shoot' })
    expect(game.done).toBe(true)
    expect(summarizeChords(game.attempted).chords?.inversionMistakes).toBe(1)
  })

  it('loses a heart when an invader lands, and none for a wrong key', () => {
    const game = new SpaceGame([C, C], { mode: 'voicing', hearts: 3 })
    run(game, 0, 1000)
    expect(game.press(parseNote('D4'), 1000)).toMatchObject([{ type: 'wrong' }])
    expect(game.hearts).toBe(3)
    const events = run(game, 1000, 16000)
    expect(events).toContainEqual(expect.objectContaining({ type: 'land' }))
    expect(game.hearts).toBeLessThan(3)
    expect(game.invaders.every((i) => i.y <= BASE_Y + 0.01)).toBe(true)
  })

  it('starts a new chord when a key fits another invader', () => {
    const game = new SpaceGame([C, G1], { mode: 'voicing', random: () => 0 })
    run(game, 0, 6000)
    game.press(parseNote('C4'), 6000)
    // B fits only G major's first inversion: the C is dropped and the G chord goes on.
    expect(game.press(parseNote('B3'), 6010)).toEqual([])
    const events = ['D4', 'G4'].flatMap((n, i) => game.press(parseNote(n), 6020 + i * 10))
    expect(events.at(-1)).toMatchObject({ type: 'shoot' })
    expect(game.flying.map((i) => i.record.chord)).toEqual([C])
  })
})

describe('Akor Aşçısı', () => {
  it('serves a dish when the recipe chord is played together', () => {
    const game = new ChefGame([C, F], { mode: 'pcs' })
    run(game, 0, 1000)
    expect(game.cooking?.record.chord).toBe(C)
    const events = play(game, C, 1000)
    expect(events.map((e) => (e as { type: string }).type)).toEqual(['add', 'add', 'serve'])
    expect(game.cooking).toBeNull()
    run(game, 1050, NEXT_ORDER_S * 1000 + 100)
    expect(game.cooking?.record.chord).toBe(F)
  })

  it('burns a dish that waits too long and spills a wrong ingredient', () => {
    const game = new ChefGame([C, F], { mode: 'pcs', hearts: 3 })
    run(game, 0, 1000)
    expect(game.press(parseNote('D4'), 1000)).toMatchObject([{ type: 'spill', octave: false }])
    const events = run(game, 1000, 13000)
    expect(events).toContainEqual(expect.objectContaining({ type: 'burn' }))
    expect(game.hearts).toBe(2)
    expect(game.records[0].missed).toBe(true)
  })

  it('lets any inversion through when the recipe only names the chord', () => {
    const game = new ChefGame([C], { mode: 'pcs' })
    run(game, 0, 1000)
    const events = ['E4', 'G4', 'C5'].flatMap((n, i) => game.press(parseNote(n), 1000 + i * 10))
    expect(events[2]).toMatchObject({ type: 'serve' })
    expect(game.done).toBe(true)
  })
})

describe('Akor Barmeni', () => {
  const Lh = chordTarget('F', 'major', 0, 'left')

  it('uses three counters for one hand, two per hand with both', () => {
    expect(chordBarRows([C, F])).toEqual(['treble', 'treble', 'treble'])
    expect(chordBarRows([Lh])).toEqual(['bass', 'bass', 'bass'])
    expect(chordBarRows([C, Lh])).toEqual(['treble', 'treble', 'bass', 'bass'])
  })

  it('serves the customer whose chord is played and seats left-hand chords at the bass counters', () => {
    const game = new ChordBarGame([C, Lh], { mode: 'exact', random: () => 0 })
    run(game, 0, 5000)
    expect(game.waiting).toHaveLength(2)
    const left = game.waiting.find((c) => c.record.chord === Lh)!
    expect(game.rows[left.counter]).toBe('bass')
    const events = play(game, Lh, 5000)
    expect(events.at(-1)).toMatchObject({ type: 'serve', together: true })
    expect(left.state).toBe('served')
    expect(game.drinks).toHaveLength(1)
  })

  it('costs a heart when a customer reaches the bar, none for a wrong key or inversion', () => {
    const game = new ChordBarGame([C], { mode: 'voicing', hearts: 3 })
    run(game, 0, 1000)
    expect(game.press(parseNote('D4'), 1000)).toMatchObject([{ type: 'wrong' }])
    const inv = ['E4', 'G4', 'C5'].flatMap((n, i) => game.press(parseNote(n), 2000 + i * 10))
    expect(inv.at(-1)).toMatchObject({ type: 'inversion' })
    expect(game.hearts).toBe(3)
    expect(run(game, 2100, 20000)).toContainEqual(expect.objectContaining({ type: 'angry' }))
    expect(game.hearts).toBe(2)
    expect(game.done).toBe(true)
    const summary = summarizeChords(game.attempted)
    expect(summary.accuracy).toBe(0)
    expect(summary.chords?.inversionMistakes).toBe(1)
  })
})
