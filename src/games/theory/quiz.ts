// Pure engine of the theory lessons: a few explanation cards, then a short quiz.
// Questions are answered by tapping a choice or by pressing a key; the first
// answer counts, a wrong one shows the explanation and the player tries again.

import { pitchClass } from '../../music/notes'
import { type CategoryStat, type SessionSummary, starsFor } from '../noteHunter/summary'

/** Pictures drawn next to a card or a question. */
export type Illustration =
  | {
      kind: 'keyboard'
      low: number
      high: number
      /** Keys drawn highlighted. */
      marks?: number[]
      /** Brackets over the groups of two and three black keys. */
      groups?: boolean
      /** Note names on the white keys. */
      labels?: boolean
      /** Do position finger numbers (1 on middle C) above the keys. */
      fingers?: boolean
    }
  | {
      kind: 'staff'
      /** Whole notes, left to right. */
      notes?: number[]
      /** Note names under the notes. */
      names?: boolean
      /** A word under each note (e.g. "çizgi", "ara"). */
      captions?: string[]
      /** Number the lines 1–5 from the bottom. */
      numbers?: 'lines'
      /** Draw the treble clef (default true). */
      clef?: boolean
      /** Highlight this line (1–5). */
      highlight?: number
    }
  | { kind: 'hand'; hand: 'right' | 'left'; highlight?: number; hideNumbers?: boolean }
  /** Whole, half and quarter notes, optionally with their beats. */
  | { kind: 'durations'; beats?: boolean }

export interface TheoryCard {
  title: string
  text: string
  art?: Illustration
}

interface BaseQuestion {
  /** Topic id, a key of `TheorySpec.topics`. */
  topic: string
  prompt: string
  art?: Illustration
  /** Shown after a wrong answer, and in the report for missed questions. */
  explain: string
}

export interface ChoiceQuestion extends BaseQuestion {
  type: 'choice'
  options: string[]
  /** Index of the right option. */
  answer: number
}

export interface KeyQuestion extends BaseQuestion {
  type: 'key'
  /** Any key of this pitch class is right (0 = Do). */
  pitchClass: number
}

export type Question = ChoiceQuestion | KeyQuestion

export interface TheorySpec {
  cards: TheoryCard[]
  questions: Question[]
  /** Topic id → label used in the report. */
  topics: Record<string, string>
}

export interface QuestionRecord {
  topic: string
  /** Wrong answers before the right one: option indices, or MIDI numbers for key questions. */
  wrong: number[]
}

export type AnswerResult = 'correct' | 'wrong' | 'ignored'

export class QuizSession {
  readonly records: QuestionRecord[]
  private index = 0
  readonly spec: TheorySpec

  constructor(spec: TheorySpec) {
    this.spec = spec
    this.records = spec.questions.map((q) => ({ topic: q.topic, wrong: [] }))
  }

  get position(): number {
    return this.index
  }

  get done(): boolean {
    return this.index >= this.spec.questions.length
  }

  get current(): Question | null {
    return this.done ? null : this.spec.questions[this.index]
  }

  /** Tap an option of a choice question. */
  choose(option: number): AnswerResult {
    const q = this.current
    if (!q || q.type !== 'choice') return 'ignored'
    return this.judge(option === q.answer, option)
  }

  /** A key pressed during a key question. */
  press(midi: number): AnswerResult {
    const q = this.current
    if (!q || q.type !== 'key') return 'ignored'
    return this.judge(pitchClass(midi) === q.pitchClass, midi)
  }

  private judge(right: boolean, answer: number): AnswerResult {
    if (right) {
      this.index++
      return 'correct'
    }
    this.records[this.index].wrong.push(answer)
    return 'wrong'
  }
}

/** Report of a quiz: right on the first try per topic, and the explanations of missed questions. */
export function summarizeQuiz(spec: TheorySpec, records: QuestionRecord[]): SessionSummary {
  const total = records.length
  const firstTry = records.filter((r) => r.wrong.length === 0).length
  const accuracy = total ? firstTry / total : 0

  const perCategory: CategoryStat[] = Object.entries(spec.topics)
    .map(([id, label]) => {
      const rs = records.filter((r) => r.topic === id)
      const ok = rs.filter((r) => r.wrong.length === 0).length
      return { id, label, shown: rs.length, firstTry: ok, accuracy: rs.length ? ok / rs.length : 0 }
    })
    .filter((c) => c.shown > 0)

  const missed = records.flatMap((r, i) => (r.wrong.length ? [spec.questions[i].explain] : []))
  const weakTopic = [...perCategory].sort((a, b) => a.accuracy - b.accuracy)[0]

  return {
    failed: false,
    total,
    firstTry,
    accuracy,
    avgReactionMs: null,
    totalMistakes: records.reduce((n, r) => n + r.wrong.length, 0),
    stars: starsFor(accuracy),
    perNote: [],
    perCategory,
    weakest: [],
    quiz: { missed },
    message:
      accuracy === 1
        ? 'Hepsini ilk denemede bildin! Temelin sağlam.'
        : accuracy >= 0.75
          ? `Çok iyi! Yalnızca “${weakTopic.label}” konusuna bir kez daha göz at.`
          : `İyi bir başlangıç. “${weakTopic.label}” konusunu tekrar okuyup testi bir daha dene.`,
  }
}
