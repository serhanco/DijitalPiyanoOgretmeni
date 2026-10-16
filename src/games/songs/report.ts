// Reports of Nota Şelalesi: success per section and per hand, how together
// the hands came down, the sections that needed a repeat, and what to
// practise next. Pure.

import type { Hand } from '../../music/notes'
import { clean, scoreOf } from '../../rhythm/summary'
import type { TimingRecord } from '../../rhythm/track'
import { TOGETHER_MS } from '../melody/session'
import {
  avg,
  type CategoryStat,
  type HandStat,
  type SessionSummary,
  starsFor,
  type SyncSummary,
} from '../noteHunter/summary'
import type { ParsedSong, Section, SongNote } from './song'
import type { WaitRecord } from './wait'

export type SongMode = 'wait' | 'tempo'

export interface SectionResult {
  label: string
  accuracy: number
  /** Wait mode: how many times it fell again after mistakes. */
  repeats: number
  /** Wait mode: its repeat was played without a mistake. */
  fixed: boolean
}

export interface SongSummary {
  title: string
  mode: SongMode
  hands: 'right' | 'left' | 'both'
  sections: SectionResult[]
  repeats: number
  /** What to practise next. */
  tip: string
}

const HAND_TOPIC: Record<Hand, string> = { right: 'Sağ el', left: 'Sol el' }
const HAND_STAT_LABEL: Record<Hand, string> = { right: 'Sağ el (sol anahtarı)', left: 'Sol el (fa anahtarı)' }

function topic(id: string, label: string, shown: number, firstTry: number, accuracy: number): CategoryStat {
  return { id, label, shown, firstTry, accuracy }
}

/** The hand a wrong key is blamed on: the hand of the step's note nearest to it. */
export function blameHand(notes: SongNote[], midi: number): Hand {
  return [...notes].sort((a, b) => Math.abs(a.midi - midi) - Math.abs(b.midi - midi))[0].hand
}

function handsOf(notes: SongNote[]): Set<Hand> {
  return new Set(notes.map((x) => x.hand))
}

function syncOf(leads: number[]): SyncSummary | undefined {
  if (!leads.length) return undefined
  const gaps = leads.map(Math.abs)
  return {
    pairs: leads.length,
    together: gaps.filter((g) => g <= TOGETHER_MS).length,
    meanGapMs: avg(gaps),
    meanLeadMs: avg(leads),
  }
}

function tipFor(mode: SongMode, sections: SectionResult[], accuracy: number, failed: boolean): string {
  const weakest = [...sections].sort((a, b) => a.accuracy - b.accuracy)[0]
  const name = weakest && sections.length > 1 ? weakest.label : 'Şarkıyı'
  if (mode === 'wait') {
    if (accuracy >= 0.95) return 'Notaları öğrendin! Şimdi şarkıyı ritimli modda, metronomla çal.'
    if (weakest && weakest.accuracy < 0.8)
      return `${name} zorladı. Önce o bölümü yavaşça, tuşlara bakarak bir daha çal.`
    return 'Güzel! Bir tur daha bekleyen modda çal, sonra ritimli moda geç.'
  }
  if (failed) return 'Tempoyu 10 düşürüp bir daha dene; notalar oturunca hızlanırsın.'
  if (accuracy >= 0.95) return 'Tempoyu 5 artırıp bir daha dene!'
  if (weakest && weakest.accuracy < 0.75)
    return `${name} zorladı. Onu bekleyen modda bir daha çal, sonra tempoyu 10 düşürüp dene.`
  return 'Aynı tempoda bir tur daha çal; her turda daha akıcı olacak.'
}

function songMessage(mode: SongMode, accuracy: number): string {
  if (accuracy >= 0.95) return mode === 'wait' ? 'Şarkının notaları parmaklarında!' : 'Harika bir performans!'
  if (accuracy >= 0.8) return 'Çok iyi! Birkaç yeri daha cilalayınca şarkı tamam.'
  if (accuracy >= 0.6) return 'Şarkı şekilleniyor. Zorlandığın bölüme biraz daha zaman ayır.'
  return 'Her şarkı önce yavaş öğrenilir. Acele etme, bölüm bölüm çalış.'
}

/** Learning mode: every step played, on the first try or after wrong keys. */
export function waitReport(
  records: WaitRecord[],
  song: ParsedSong,
  meta: { title: string; hands: SongSummary['hands']; repeated: number[] },
): SessionSummary {
  const total = records.length
  const firstTry = records.filter((r) => r.wrong.length === 0).length
  const accuracy = total ? firstTry / total : 0
  const perCategory: CategoryStat[] = []
  // Sections not reached (a lesson ended early) are left out.
  const sections: SectionResult[] = song.sections.flatMap((s: Section) => {
    const xs = records.filter((r) => r.section === s.index)
    if (!xs.length) return []
    const ok = xs.filter((r) => r.wrong.length === 0).length
    const repeat = xs.filter((r) => r.pass > 0)
    perCategory.push(topic(`section-${s.index}`, s.label, xs.length, ok, ok / xs.length))
    return {
      label: s.label,
      accuracy: ok / xs.length,
      repeats: meta.repeated[s.index] ?? 0,
      fixed: repeat.length > 0 && repeat.every((r) => r.wrong.length === 0),
    }
  })

  let hands: HandStat[] | undefined
  let sync: SyncSummary | undefined
  if (meta.hands === 'both') {
    hands = (['right', 'left'] as Hand[]).map((hand) => {
      const xs = records.filter((r) => handsOf(r.notes).has(hand))
      const ok = xs.filter((r) => !r.wrong.some((m) => blameHand(r.notes, m) === hand)).length
      if (xs.length) perCategory.push(topic(hand, HAND_TOPIC[hand], xs.length, ok, ok / xs.length))
      return {
        hand,
        label: HAND_STAT_LABEL[hand],
        shown: xs.length,
        firstTry: ok,
        accuracy: xs.length ? ok / xs.length : 0,
        avgReactionMs: null,
      }
    })
    const leads: number[] = []
    for (const r of records) {
      const first = (hand: Hand) => {
        const ts = r.notes.flatMap((x, i) => (x.hand === hand && r.pressedAt[i] !== null ? [r.pressedAt[i]!] : []))
        return ts.length ? Math.min(...ts) : null
      }
      const left = first('left')
      const right = first('right')
      if (left !== null && right !== null) leads.push(left - right)
    }
    sync = syncOf(leads)
    const pairs = records.filter((r) => handsOf(r.notes).size > 1)
    if (pairs.length) {
      const ok = pairs.filter((r) => r.wrong.length === 0).length
      perCategory.push(topic('both', 'İki el birlikte', pairs.length, ok, ok / pairs.length))
    }
  }

  const repeats = meta.repeated.reduce((a, b) => a + b, 0)
  return {
    failed: false,
    total,
    firstTry,
    accuracy,
    avgReactionMs: avg(records.map((r) => r.waitMs)),
    totalMistakes: records.reduce((n, r) => n + r.wrong.length, 0),
    stars: starsFor(accuracy),
    perNote: [],
    perCategory,
    weakest: [],
    message: songMessage('wait', accuracy),
    ...(hands && { hands }),
    ...(sync && { sync }),
    song: {
      title: meta.title,
      mode: 'wait',
      hands: meta.hands,
      sections,
      repeats,
      tip: tipFor('wait', sections, accuracy, false),
    },
  }
}

/**
 * Rhythm mode: the parts added to the rhythm report (timing, holds) of the
 * rounds played. `notes[i]` is the note of `records[i]` in every round.
 */
export function tempoReport(
  rounds: TimingRecord[][],
  notes: SongNote[],
  song: ParsedSong,
  meta: { title: string; hands: SongSummary['hands']; failed: boolean },
): Pick<SessionSummary, 'perCategory' | 'hands' | 'sync' | 'song'> {
  const settled = rounds.flatMap((records, round) =>
    records.flatMap((r, i) => (r.judgement === null ? [] : [{ r, note: notes[i], round }])),
  )
  const stat = (id: string, label: string, xs: TimingRecord[]) =>
    topic(id, label, xs.length, xs.filter(clean).length, xs.reduce((n, r) => n + scoreOf(r), 0) / xs.length)
  const perCategory: CategoryStat[] = []
  const sections: SectionResult[] = song.sections.flatMap((s) => {
    const xs = settled.filter(({ note }) => note.bar >= s.from && note.bar <= s.to).map(({ r }) => r)
    if (!xs.length) return []
    const t = stat(`section-${s.index}`, s.label, xs)
    perCategory.push(t)
    return { label: s.label, accuracy: t.accuracy, repeats: 0, fixed: false }
  })
  let hands: HandStat[] | undefined
  let sync: SyncSummary | undefined
  if (meta.hands === 'both') {
    hands = (['right', 'left'] as Hand[]).map((hand) => {
      const xs = settled.filter(({ note }) => note.hand === hand).map(({ r }) => r)
      const t = xs.length ? stat(hand, HAND_TOPIC[hand], xs) : null
      if (t) perCategory.push(t)
      return {
        hand,
        label: HAND_STAT_LABEL[hand],
        shown: xs.length,
        firstTry: t?.firstTry ?? 0,
        accuracy: t?.accuracy ?? 0,
        avgReactionMs: null,
      }
    })
    // The two hands' notes on the same beat, both played.
    const byBeat = new Map<string, Partial<Record<Hand, number>>>()
    for (const { r, note, round } of settled) {
      if (r.offsetMs === null) continue
      const key = `${round}:${r.beat}`
      const pair = byBeat.get(key) ?? {}
      pair[note.hand] = Math.min(pair[note.hand] ?? Infinity, r.offsetMs)
      byBeat.set(key, pair)
    }
    const leads = [...byBeat.values()].flatMap((p) =>
      p.left !== undefined && p.right !== undefined ? [p.left - p.right] : [],
    )
    sync = syncOf(leads)
  }
  const all = settled.map(({ r }) => r)
  const accuracy = all.length ? all.reduce((n, r) => n + scoreOf(r), 0) / all.length : 0
  return {
    perCategory,
    ...(hands && { hands }),
    ...(sync && { sync }),
    song: {
      title: meta.title,
      mode: 'tempo',
      hands: meta.hands,
      sections,
      repeats: 0,
      tip: tipFor('tempo', sections, accuracy, meta.failed),
    },
  }
}
