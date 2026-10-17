// Spaced repetition: every note (per staff), chord, scale and arpeggio the
// learner plays is a card in one of five Leitner boxes. A card played well
// when it is due moves up a box and comes back later; a card played badly
// goes back to box 1 and comes back the next day. Pure: dates are day keys
// ("2026-10-17"), passed in.

import { type ArpeggioPart, arpeggioTitle } from '../games/chords/arpeggio'
import { CHORD_KINDS, type NoteLesson, PATTERN_KINDS } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { partTitle, type ScalePart } from '../games/scales/steps'
import { type ChordHands, type ChordQuality, type ChordTarget, chordTitle, type Inversion } from '../music/chords'
import { type Clef, CLEF_NAMES, solfegeName } from '../music/notes'
import type { Tonic } from '../music/scales'

/** Days until a card in box 1..5 is due again. */
export const BOX_DAYS = [1, 2, 4, 7, 15] as const
export const MAX_BOX = BOX_DAYS.length
/** At least this share right on the first try moves a due card up a box. */
export const PROMOTE_AT = 0.9
/** Below this share a card goes back to box 1. */
export const DEMOTE_BELOW = 0.6
/** Boxes 4 and 5: the card is known well. */
export const MASTERED_BOX = 4

export type CardKind = 'note' | 'chord' | 'scale' | 'arpeggio'

export type CardData =
  | { kind: 'note'; clef: Clef; midi: number }
  | { kind: 'chord'; root: Tonic; quality: ChordQuality; inversion: Inversion; hands: ChordHands }
  | { kind: 'scale'; part: ScalePart }
  | { kind: 'arpeggio'; part: ArpeggioPart }

/** How one card went in one lesson. */
export interface CardResult {
  key: string
  label: string
  data: CardData
  /** Times it came up. */
  shown: number
  /** Share played right on the first try (rhythm games: the timing score), 0..1. */
  accuracy: number
}

export interface Card {
  key: string
  kind: CardKind
  label: string
  data: CardData
  box: number
  /** Day key the card is due again. */
  due: string
  /** Epoch ms of the last lesson it came up in. */
  lastSeen: number
  /** Running totals over every lesson. */
  shown: number
  firstTry: number
  /** Accuracy the last time it came up. */
  last: number
}

/** What a lesson did to a card, for the results. */
export interface CardMove {
  key: string
  kind: CardKind
  label: string
  /** null: a new card. */
  from: number | null
  to: number
  due: string
  days: number
  accuracy: number
}

export const noteKey = (clef: Clef, midi: number) => `note:${clef}:${midi}`
const tonicKey = (t: Tonic) => `${t.letter}${t.acc}`
export const chordKey = (c: { root: Tonic; quality: ChordQuality; inversion: Inversion; hands: ChordHands }) =>
  `chord:${tonicKey(c.root)}:${c.quality}:${c.inversion}:${c.hands}`
export const scaleKey = (p: ScalePart) => `scale:${p.tonic}:${p.type}:${p.hands}:${p.octaves ?? 1}`
export const arpeggioKey = (p: ArpeggioPart) => `arp:${p.root}:${p.quality}:${p.hands}:${p.octaves ?? 1}`

const CHORD_HANDS_TEXT: Record<ChordHands, string> = { right: '', left: ' · sol el', both: ' · iki el' }

export const noteLabel = (clef: Clef, midi: number) => `${solfegeName(midi)} (${CLEF_NAMES[clef]})`
export const chordLabel = (t: ChordTarget) => `${chordTitle(t, t.inversion > 0)}${CHORD_HANDS_TEXT[t.hands]}`

/** Day key `days` after `day`. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Whole days from `from` to `to` (day keys). */
export function daysBetween(from: string, to: string): number {
  const ms = (day: string) => {
    const [y, m, d] = day.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((ms(to) - ms(from)) / 86_400_000)
}

export const isDue = (card: Card, today: string) => card.due <= today

/**
 * The box after a lesson: back to 1 below DEMOTE_BELOW; up one at PROMOTE_AT
 * when the card was due (playing it again early does not count); else where
 * it was. A new card starts in box 2 when it was played well, else in 1.
 */
export function nextBox(prev: Pick<Card, 'box' | 'due'> | undefined, accuracy: number, today: string): number {
  if (!prev) return accuracy >= PROMOTE_AT ? 2 : 1
  if (accuracy < DEMOTE_BELOW) return 1
  if (accuracy >= PROMOTE_AT && prev.due <= today) return Math.min(MAX_BOX, prev.box + 1)
  return prev.box
}

/** The card after one lesson's result, and the move to show. */
export function reviewCard(
  prev: Card | undefined,
  r: CardResult,
  today: string,
  at: number,
): { card: Card; move: CardMove } {
  const box = nextBox(prev, r.accuracy, today)
  const days = BOX_DAYS[box - 1]
  const due = addDays(today, days)
  const card: Card = {
    key: r.key,
    kind: r.data.kind,
    label: r.label,
    data: r.data,
    box,
    due,
    lastSeen: at,
    shown: (prev?.shown ?? 0) + r.shown,
    firstTry: (prev?.firstTry ?? 0) + Math.round(r.accuracy * r.shown),
    last: r.accuracy,
  }
  return {
    card,
    move: {
      key: r.key,
      kind: r.data.kind,
      label: r.label,
      from: prev?.box ?? null,
      to: box,
      due,
      days,
      accuracy: r.accuracy,
    },
  }
}

/** Results of the same card in one lesson (a note on two phases) are added up. */
export function mergeResults(results: CardResult[]): CardResult[] {
  const out = new Map<string, CardResult>()
  for (const r of results) {
    const had = out.get(r.key)
    if (!had) out.set(r.key, { ...r })
    else {
      const shown = had.shown + r.shown
      out.set(r.key, { ...had, shown, accuracy: shown ? (had.accuracy * had.shown + r.accuracy * r.shown) / shown : 0 })
    }
  }
  return [...out.values()]
}

/** The scale or arpeggio parts of a lesson's topics ("part-0", "part-1"…), with how they went. */
function partResults<P>(
  summary: SessionSummary,
  parts: P[],
  result: (part: P) => Omit<CardResult, 'shown' | 'accuracy'>,
): CardResult[] {
  return summary.perCategory.flatMap((c) => {
    const m = /^part-(\d+)$/.exec(c.id)
    const part = m ? parts[Number(m[1])] : undefined
    return part && c.shown > 0 ? [{ ...result(part), shown: c.shown, accuracy: c.accuracy }] : []
  })
}

/**
 * The cards a finished lesson played and how each went: notes of reading
 * lessons (per staff), chords of chord lessons (not the ear ones, where the
 * chord is heard, not played from its name), scales and arpeggios part by
 * part. Lessons made of other lessons (boss, mix) carry theirs in `cards`.
 */
export function cardResults(lesson: NoteLesson, summary: SessionSummary): CardResult[] {
  if (summary.cards) return summary.cards
  const kind = lesson.kind ?? 'drill'
  if (!summary.timing && !PATTERN_KINDS.includes(kind))
    return summary.perNote
      .filter((n) => n.shown > 0)
      .map((n) => ({
        key: noteKey(n.clef, n.midi),
        label: noteLabel(n.clef, n.midi),
        data: { kind: 'note', clef: n.clef, midi: n.midi },
        shown: n.shown,
        accuracy: n.firstTry / n.shown,
      }))
  if (CHORD_KINDS.includes(kind) && !lesson.chords?.byEar)
    return (summary.chords?.perChord ?? []).map(({ target: t, shown, firstTry }) => ({
      key: chordKey(t),
      label: chordLabel(t),
      data: { kind: 'chord', root: t.root, quality: t.quality, inversion: t.inversion, hands: t.hands },
      shown,
      accuracy: firstTry / shown,
    }))
  if ((kind === 'scale' || kind === 'ladder') && lesson.scales)
    return partResults(summary, lesson.scales, (part) => ({
      key: scaleKey(part),
      label: partTitle(part),
      data: { kind: 'scale', part },
    }))
  if ((kind === 'arpeggio' || kind === 'surf') && lesson.arpeggios)
    return partResults(summary, lesson.arpeggios, (part) => ({
      key: arpeggioKey(part),
      label: arpeggioTitle(part),
      data: { kind: 'arpeggio', part },
    }))
  return []
}

/** Applies a lesson's results to the stored cards: the cards to write and the moves to show. */
export function applyResults(
  stored: Map<string, Card>,
  results: CardResult[],
  today: string,
  at: number,
): { cards: Card[]; moves: CardMove[] } {
  const cards: Card[] = []
  const moves: CardMove[] = []
  for (const r of mergeResults(results)) {
    const { card, move } = reviewCard(stored.get(r.key), r, today, at)
    cards.push(card)
    moves.push(move)
  }
  return { cards, moves }
}

/** Most worth reviewing first: lower box, then longer overdue, then the worse last result. */
export function byUrgency(a: Card, b: Card): number {
  return a.box - b.box || a.due.localeCompare(b.due) || a.last - b.last || a.key.localeCompare(b.key)
}

export type DueCounts = Record<CardKind, number>

export function dueCounts(cards: Card[], today: string): DueCounts {
  const counts: DueCounts = { note: 0, chord: 0, scale: 0, arpeggio: 0 }
  for (const c of cards) if (isDue(c, today)) counts[c.kind]++
  return counts
}

const COUNT_WORDS: Record<CardKind, string> = { note: 'nota', chord: 'akor', scale: 'gam', arpeggio: 'arpej' }

/** "5 nota, 3 akor, 1 gam". */
export function countsText(counts: DueCounts): string {
  return (Object.keys(COUNT_WORDS) as CardKind[])
    .filter((k) => counts[k] > 0)
    .map((k) => `${counts[k]} ${COUNT_WORDS[k]}`)
    .join(', ')
}

/** When the earliest card not due today is due ("yarın", "3 gün sonra"). */
export function nextDueText(cards: Card[], today: string): string | null {
  const next = cards.filter((c) => !isDue(c, today)).sort((a, b) => a.due.localeCompare(b.due))[0]
  return next ? inDays(daysBetween(today, next.due)) : null
}

export const inDays = (days: number) => (days <= 1 ? 'yarın' : days === 7 ? 'bir hafta sonra' : `${days} gün sonra`)
