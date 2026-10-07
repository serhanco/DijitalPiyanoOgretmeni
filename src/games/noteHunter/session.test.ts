import { describe, expect, it } from 'vitest'
import { buildSequence, NoteHunterSession } from './session'
import { summarize } from './summary'

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

describe('buildSequence', () => {
  it('never repeats a note back to back', () => {
    const seq = buildSequence([60, 62, 64], 300, seeded(7))
    expect(seq).toHaveLength(300)
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1])
  })

  it('covers every note before repeating', () => {
    const seq = buildSequence([60, 62, 64, 65, 67], 5, seeded(3))
    expect([...seq].sort()).toEqual([60, 62, 64, 65, 67])
  })
})

describe('NoteHunterSession', () => {
  it('ignores presses before the note is shown', () => {
    const s = new NoteHunterSession({ notes: [60], length: 1 })
    expect(s.press(60, 0)).toBe('ignored')
  })

  it('records wrong presses and moves on after the right one', () => {
    const s = new NoteHunterSession({ notes: [60, 62], length: 2, random: seeded() })
    const first = s.current!.target
    const other = first === 60 ? 62 : 60
    s.markShown(1000)
    expect(s.press(other, 1200)).toBe('wrong')
    expect(s.press(first, 1500)).toBe('correct')
    expect(s.position).toBe(1)
    expect(s.records[0].wrongPresses).toEqual([other])
    s.markShown(2000)
    expect(s.press(other, 2600)).toBe('correct')
    expect(s.done).toBe(true)
  })

  it('accepts any octave when asked to', () => {
    const s = new NoteHunterSession({ notes: [60], length: 1, ignoreOctave: true })
    s.markShown(0)
    expect(s.press(72, 10)).toBe('correct')
  })
})

describe('summarize', () => {
  it('reports accuracy, reaction time, topics and confusions', () => {
    const records = [
      { target: 64, shownAt: 0, answeredAt: 800, wrongPresses: [] }, // E4 line
      { target: 65, shownAt: 0, answeredAt: 2000, wrongPresses: [64] }, // F4 space
      { target: 64, shownAt: 0, answeredAt: 1200, wrongPresses: [] },
      { target: 60, shownAt: 0, answeredAt: 3000, wrongPresses: [62, 62] }, // C4 outside
    ]
    const s = summarize(records, 'treble')
    expect(s.total).toBe(4)
    expect(s.firstTry).toBe(2)
    expect(s.accuracy).toBe(0.5)
    expect(s.avgReactionMs).toBe(1000)
    expect(s.totalMistakes).toBe(3)
    expect(s.stars).toBe(1)
    expect(s.perCategory.map((c) => [c.id, c.accuracy])).toEqual([
      ['line', 1],
      ['space', 0],
      ['outside', 0],
    ])
    const c4 = s.perNote.find((n) => n.midi === 60)!
    expect(c4.confusedWith).toEqual([{ midi: 62, count: 2 }])
    expect(s.weakest.map((n) => n.midi)).toEqual(expect.arrayContaining([60, 65]))
    expect(s.weakest).not.toContainEqual(expect.objectContaining({ midi: 64 }))
  })
})

describe('hearts', () => {
  it('fails the session when the hearts run out', () => {
    const s = new NoteHunterSession({ notes: [60, 62], length: 5, hearts: 2, random: seeded() })
    s.markShown(0)
    const wrong = s.current!.target === 60 ? 62 : 60
    expect(s.press(wrong, 1)).toBe('wrong')
    expect(s.heartsLeft).toBe(1)
    expect(s.done).toBe(false)
    s.press(wrong, 2)
    expect(s.failed).toBe(true)
    expect(s.done).toBe(true)
    expect(s.attempted).toHaveLength(1)
    expect(s.press(s.records[0].target, 3)).toBe('ignored')
  })
})
