// Turns a finished session into the report shown on the results screen.

import { type Clef, PLACEMENT_LABELS, type StaffPlacement, staffPlacement } from '../../music/notes'
import type { Judgement } from '../../rhythm/timing'
import { firstTryOk, type PromptRecord } from './session'

export interface NoteStat {
  midi: number
  shown: number
  firstTry: number
  accuracy: number
  avgReactionMs: number | null
  /** Notes pressed by mistake when this one was asked, most frequent first. */
  confusedWith: { midi: number; count: number }[]
}

export interface CategoryStat {
  /** Topic id: a staff placement, or a rhythm value for rhythm lessons. */
  id: string
  label: string
  shown: number
  firstTry: number
  accuracy: number
}

export interface SessionSummary {
  /** True when the hearts ran out before the end. */
  failed: boolean
  total: number
  firstTry: number
  accuracy: number // 0..1
  avgReactionMs: number | null
  totalMistakes: number
  stars: 0 | 1 | 2 | 3
  perNote: NoteStat[]
  perCategory: CategoryStat[]
  /** Notes worth practising, weakest first. */
  weakest: NoteStat[]
  /** Short encouragement or advice for the player. */
  message: string
  /** Rhythm lessons: how well the presses fell on the beat. */
  timing?: TimingSummary
}

export interface TimingSummary {
  counts: Record<Judgement, number>
  /** Notes to play (rests not included). */
  notes: number
  /** Mean signed offset of the played notes: negative = early. */
  meanOffsetMs: number | null
  meanAbsOffsetMs: number | null
  /** Every played note's offset, for the spread chart. */
  offsets: number[]
  restsKept: number
  rests: number
  /** Presses near no note. */
  stray: number
  bestCombo: number
  bpm: number
}

export function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

export function starsFor(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 0.9) return 3
  if (accuracy >= 0.75) return 2
  if (accuracy >= 0.5) return 1
  return 0
}

function messageFor(accuracy: number, avgReactionMs: number | null): string {
  const fast = avgReactionMs !== null && avgReactionMs < 1500
  if (accuracy >= 0.95)
    return fast ? 'Kusursuz ve hızlı! Bir sonraki derse hazırsın.' : 'Kusursuz! Şimdi biraz daha hızlanmayı dene.'
  if (accuracy >= 0.8) return 'Çok iyi gidiyorsun. Zorlandığın notaları bir tur daha çalış.'
  if (accuracy >= 0.6) return 'Güzel ilerleme. Aşağıdaki notalar üzerinde biraz daha durmaya değer.'
  return 'Her tekrar seni güçlendirir. Acele etme, önce doğru notayı bulmaya odaklan.'
}

export function summarize(records: PromptRecord[], clef: Clef, failed = false): SessionSummary {
  const byNote = new Map<number, PromptRecord[]>()
  for (const r of records) {
    const list = byNote.get(r.target) ?? []
    list.push(r)
    byNote.set(r.target, list)
  }

  const reaction = (r: PromptRecord) => (r.shownAt !== null && r.answeredAt !== null ? r.answeredAt - r.shownAt : null)
  // Reaction time only counts prompts answered right on the first try.
  const cleanReactions = (rs: PromptRecord[]) =>
    rs
      .filter(firstTryOk)
      .map(reaction)
      .filter((x): x is number => x !== null)

  const perNote: NoteStat[] = [...byNote.entries()]
    .map(([midi, rs]) => {
      const confusions = new Map<number, number>()
      for (const r of rs) for (const w of r.wrongPresses) confusions.set(w, (confusions.get(w) ?? 0) + 1)
      const firstTry = rs.filter(firstTryOk).length
      return {
        midi,
        shown: rs.length,
        firstTry,
        accuracy: firstTry / rs.length,
        avgReactionMs: avg(cleanReactions(rs)),
        confusedWith: [...confusions.entries()]
          .map(([m, count]) => ({ midi: m, count }))
          .sort((a, b) => b.count - a.count),
      }
    })
    .sort((a, b) => a.midi - b.midi)

  const categories = new Map<StaffPlacement, { shown: number; firstTry: number }>()
  for (const r of records) {
    const p = staffPlacement(r.target, clef)
    const c = categories.get(p) ?? { shown: 0, firstTry: 0 }
    c.shown++
    if (firstTryOk(r)) c.firstTry++
    categories.set(p, c)
  }
  const order: StaffPlacement[] = ['line', 'space', 'outside']
  const perCategory: CategoryStat[] = order
    .filter((p) => categories.has(p))
    .map((p) => {
      const c = categories.get(p)!
      return { id: p, label: PLACEMENT_LABELS[p], ...c, accuracy: c.firstTry / c.shown }
    })

  const total = records.length
  const firstTry = records.filter(firstTryOk).length
  const accuracy = total ? firstTry / total : 0
  const avgReactionMs = avg(cleanReactions(records))

  const weakest = perNote
    .filter((n) => n.accuracy < 1)
    .sort((a, b) => a.accuracy - b.accuracy || (b.avgReactionMs ?? 0) - (a.avgReactionMs ?? 0))
    .slice(0, 3)

  return {
    failed,
    total,
    firstTry,
    accuracy,
    avgReactionMs,
    totalMistakes: records.reduce((n, r) => n + r.wrongPresses.length, 0),
    stars: failed ? 0 : starsFor(accuracy),
    perNote,
    perCategory,
    weakest,
    message: failed
      ? 'Sorun değil, hata yapa yapa öğreniyoruz. Notaları acele etmeden bulmaya odaklanıp tekrar dene.'
      : messageFor(accuracy, avgReactionMs),
  }
}
