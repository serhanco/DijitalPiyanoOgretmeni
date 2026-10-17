import { describe, expect, it } from 'vitest'
import {
  balanced,
  chordPrompts,
  contrastOf,
  directionPrompts,
  EarSession,
  earReport,
  intervalPrompts,
  pitchPrompts,
  singPrompts,
} from './session'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

describe('balanced', () => {
  it('uses every item about equally and never repeats across rounds', () => {
    const out = balanced([1, 2, 3], 30, seeded(3))
    expect(out).toHaveLength(30)
    for (const n of [1, 2, 3]) expect(out.filter((x) => x === n)).toHaveLength(10)
    for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1])
  })
})

describe('case builders', () => {
  it('direction cases go the way their answer says', () => {
    for (const p of directionPrompts([60, 62, 64, 67, 72], 40, seeded(5))) {
      const [a, b] = p.notes
      expect(p.answer).toBe(b > a ? 'up' : b < a ? 'down' : 'same')
    }
  })

  it('note finding plays the reference Do first and asks every note', () => {
    const ps = pitchPrompts([60, 67], 6, seeded(1))
    expect(ps.every((p) => p.reference === 60 && p.shown === 60 && p.options === undefined)).toBe(true)
    expect(new Set(ps.map((p) => p.answer))).toEqual(new Set(['60', '67']))
  })

  it('intervals stay in range and are as wide as their answer', () => {
    const spec = { intervals: [3, 4, 7], ways: ['up', 'down', 'together'] as const, low: 60, high: 72 }
    for (const p of intervalPrompts({ ...spec, ways: [...spec.ways] }, 30, seeded(9))) {
      const [a, b] = p.notes
      expect(Math.abs(b - a)).toBe(Number(p.answer))
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(60)
      expect(Math.max(a, b)).toBeLessThanOrEqual(72)
      if (p.together) expect(p.topics).toContain('way:together')
      else expect(p.topics).toContain(b > a ? 'way:up' : 'way:down')
    }
  })

  it('"play the second note" shows the first and never asks for harmonic intervals', () => {
    for (const p of singPrompts({ intervals: [2, 4], ways: ['up', 'together'], low: 60, high: 72 }, 10, seeded(2))) {
      expect(p.shown).toBe(p.notes[0])
      expect(p.answer).toBe(String(p.notes[1]))
      expect(p.notes[1]).toBeGreaterThan(p.notes[0])
    }
  })

  it('chords have their colour shape and fit under the top', () => {
    for (const p of chordPrompts({ colours: ['major', 'minor', 'dom7'], low: 55, high: 72 }, 12, seeded(4))) {
      const shape = p.notes.map((n) => n - p.notes[0])
      expect(shape).toEqual(p.answer === 'major' ? [0, 4, 7] : p.answer === 'minor' ? [0, 3, 7] : [0, 4, 7, 10])
      expect(Math.max(...p.notes)).toBeLessThanOrEqual(72)
    }
  })
})

describe('EarSession', () => {
  const cases = intervalPrompts({ intervals: [3, 4], ways: ['up'], low: 60, high: 72 }, 4, seeded(7))

  it('reports a session ended before any case was answered (a test finish)', () => {
    const r = earReport(new EarSession(cases, { hearts: 3 }))
    expect(r.firstTry).toBe(0)
    expect(r.message).toMatch(/Vakalar seni bekliyor/)
  })

  it('counts the first answer, costs a heart for a wrong one, and lets the player try again', () => {
    const s = new EarSession(cases, { hearts: 3 })
    expect(s.choose(s.current!.answer, 0)).toEqual([]) // not heard yet
    s.markShown(100)
    const wrong = s.current!.answer === '3' ? '4' : '3'
    expect(s.choose(wrong, 900)).toEqual([{ type: 'wrong', chosen: wrong }])
    expect(s.choose(wrong, 950)).toEqual([]) // the same wrong option again is ignored
    expect(s.heartsLeft).toBe(2)
    expect(s.choose(s.current!.answer, 1200)).toEqual([{ type: 'right' }])
    for (let i = 1; i < 4; i++) {
      s.markShown(2000 * i)
      s.replay()
      const ev = s.choose(s.current!.answer, 2000 * i + 800)
      expect(ev[0]).toEqual({ type: 'right' })
    }
    expect(s.done).toBe(true)
    const r = earReport(s)
    expect(r.total).toBe(4)
    expect(r.firstTry).toBe(3)
    expect(r.ear!.replays).toBe(3)
    expect(r.ear!.confusions).toHaveLength(1)
    expect(r.ear!.confusions[0].count).toBe(1)
    expect(r.ear!.tips[0]).toMatch(/şarkısının başıyla/)
    expect(r.perCategory.map((c) => c.id)).toEqual(
      ['int:3', 'int:4', 'way:up'].filter((id) => r.perCategory.some((c) => c.id === id)),
    )
    expect(r.avgReactionMs).toBe(800)
  })

  it('fails when the hearts run out', () => {
    const s = new EarSession(cases, { hearts: 1 })
    s.markShown(0)
    const wrong = s.current!.answer === '3' ? '4' : '3'
    expect(s.choose(wrong, 10)).toEqual([{ type: 'wrong', chosen: wrong }, { type: 'failed' }])
    expect(s.done).toBe(true)
    const r = earReport(s)
    expect(r.failed).toBe(true)
    expect(r.stars).toBe(0)
  })

  it('key cases: the right key, octaves when asked, and the shown note is ignored', () => {
    const sing = singPrompts({ intervals: [4], ways: ['up'], low: 60, high: 72 }, 1, seeded(1))
    const s = new EarSession(sing)
    s.markShown(0)
    expect(s.press(sing[0].notes[0], 10)).toEqual([])
    expect(s.press(sing[0].notes[1] + 12, 20)[0].type).toBe('wrong')
    expect(s.press(sing[0].notes[1], 30)).toEqual([{ type: 'right' }, { type: 'complete' }])

    const pitch = pitchPrompts([64], 1)
    const loose = new EarSession(pitch, { ignoreOctave: true })
    loose.markShown(0)
    expect(loose.press(76, 5)[0].type).toBe('right')
  })
})

describe('contrastOf', () => {
  it('plays the chosen interval from the same note, then the right one', () => {
    const p = intervalPrompts({ intervals: [3], ways: ['down'], low: 60, high: 72 }, 1, seeded(1))[0]
    const [a] = p.notes
    expect(contrastOf(p, '7')).toEqual([
      { notes: [a, a - 7], together: false },
      { notes: p.notes, together: false },
    ])
  })

  it('plays the chosen colour on the same root', () => {
    const p = chordPrompts({ colours: ['major'], low: 60, high: 72 }, 1, seeded(1))[0]
    expect(contrastOf(p, 'minor')[0]).toEqual({ notes: [p.notes[0], p.notes[0] + 3, p.notes[0] + 7], together: true })
  })
})
