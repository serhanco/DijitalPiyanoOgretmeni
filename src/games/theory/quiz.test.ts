import { describe, expect, it } from 'vitest'
import { BASICS_LESSONS, NOTE_INTRO } from './lessons'
import { QuizSession, summarizeQuiz, type TheorySpec } from './quiz'

const spec: TheorySpec = {
  topics: { a: 'Konu A', b: 'Konu B' },
  cards: [{ title: 'Kart', text: 'Metin' }],
  questions: [
    { type: 'choice', topic: 'a', prompt: '1?', options: ['x', 'y'], answer: 1, explain: 'Cevap y.' },
    { type: 'key', topic: 'b', prompt: 'Do bas', pitchClass: 0, explain: 'Do iki siyahın solunda.' },
    { type: 'choice', topic: 'b', prompt: '3?', options: ['x', 'y'], answer: 0, explain: 'Cevap x.' },
  ],
}

describe('QuizSession', () => {
  it('moves on only after the right answer and remembers wrong ones', () => {
    const q = new QuizSession(spec)
    expect(q.press(60)).toBe('ignored')
    expect(q.choose(0)).toBe('wrong')
    expect(q.position).toBe(0)
    expect(q.choose(1)).toBe('correct')
    expect(q.choose(0)).toBe('ignored')
    expect(q.press(62)).toBe('wrong')
    expect(q.press(72)).toBe('correct')
    expect(q.choose(0)).toBe('correct')
    expect(q.done).toBe(true)
    expect(q.records.map((r) => r.wrong)).toEqual([[0], [62], []])
  })

  it('reports per topic with the explanations of missed questions', () => {
    const q = new QuizSession(spec)
    q.choose(0)
    q.choose(1)
    q.press(60)
    q.choose(0)
    const s = summarizeQuiz(spec, q.records)
    expect(s.total).toBe(3)
    expect(s.firstTry).toBe(2)
    expect(s.totalMistakes).toBe(1)
    expect(s.perCategory.map((c) => [c.label, c.accuracy])).toEqual([
      ['Konu A', 0],
      ['Konu B', 1],
    ])
    expect(s.quiz?.missed).toEqual(['Cevap y.'])
    expect(s.message).toContain('Konu A')
    expect(s.stars).toBe(1)
  })
})

describe('basics unit', () => {
  it('teaches the octave two notes at a time, starting with Do and Sol', () => {
    const intro = BASICS_LESSONS.flatMap((l) => l.introduce ?? [])
    expect(intro).toEqual([60, 67, 62, 64, 65, 69, 71, 72])
    for (const midi of intro) expect(NOTE_INTRO[midi]).toBeTruthy()
    // A lesson only asks notes that were introduced in it or before it.
    const known = new Set<number>()
    for (const l of BASICS_LESSONS) {
      for (const m of l.introduce ?? []) known.add(m)
      for (const m of l.notes) expect(known.has(m)).toBe(true)
    }
  })

  it('has valid quizzes', () => {
    for (const l of BASICS_LESSONS.filter((l) => l.kind === 'theory')) {
      const t = l.theory!
      expect(t.cards.length).toBeGreaterThan(0)
      for (const q of t.questions) {
        expect(t.topics[q.topic]).toBeTruthy()
        if (q.type === 'choice') expect(q.options[q.answer]).toBeTruthy()
      }
    }
  })
})
