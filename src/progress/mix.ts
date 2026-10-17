// Günün Karışımı: a lesson built every day from the spaced-repetition cards
// that are due. Up to three phases: a note-reading drill (with a couple of
// new neighbour notes once the known ones are solid), the due chords, and the
// due scales or arpeggios. Pure.

import { mergedTopics } from '../games/boss/report'
import { arpeggioLesson, chordLesson } from '../games/chords/lessons'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { avg, type CategoryStat, type SessionSummary, starsFor } from '../games/noteHunter/summary'
import { scaleLesson } from '../games/scales/lessons'
import { chordTarget } from '../music/chords'
import { type Clef, fitKeyboard, isBlackKey } from '../music/notes'
import { byUrgency, type Card, type CardKind, dueCounts, type DueCounts, isDue } from './srs'

export const MIX_LESSON_ID = 'mix'
/** Bonus XP for the first mix finished each day. */
export const MIX_XP = 15

/** Notes in the reading phase: at most this many due ones, at least this many in all. */
export const MIX_NOTES = 8
export const MIX_MIN_NOTES = 4
export const MIX_DRILL_LENGTH = 12
/** New neighbour notes are added once this many notes of the staff are in box 3 or higher. */
export const STRETCH_AFTER = 4
export const STRETCH_BOX = 3
export const MIX_CHORDS = 4
export const MIX_CHORD_DRAWS = 6
export const MIX_PATTERNS = 2

/** The reading range a staff stretches to at most. */
const STAFF_BOUNDS: Record<Clef, [number, number]> = { treble: [55, 84], bass: [36, 64] }

export interface MixPhase {
  label: string
  kind: CardKind
  lesson: NoteLesson
}

export interface MixSpec {
  phases: MixPhase[]
  /** Cards due when the mix was built. */
  due: DueCounts
  /** Notes added beyond the known range of the reading phase. */
  stretch: number[]
}

export interface MixSummary {
  phases: { label: string; title: string; accuracy: number; failed: boolean }[]
  stretch: number[]
}

const PHASE_LABELS: Record<CardKind, string> = {
  note: 'Notalar',
  chord: 'Akorlar',
  scale: 'Gamlar',
  arpeggio: 'Arpejler',
}

/** Cards of a kind: the due ones by urgency, then, up to `min`, the others by urgency. */
function pick(cards: Card[], today: string, max: number, min: number): Card[] {
  const due = cards.filter((c) => isDue(c, today)).sort(byUrgency)
  if (!due.length) return []
  const chosen = due.slice(0, max)
  const rest = cards.filter((c) => !isDue(c, today)).sort(byUrgency)
  return [...chosen, ...rest.slice(0, Math.max(0, min - chosen.length))]
}

/** The white keys just below and above the notes of a staff the learner has met, inside the staff's bounds. */
export function stretchNotes(cards: Card[], clef: Clef): number[] {
  const midis = cards.flatMap((c) => (c.data.kind === 'note' && c.data.clef === clef ? [c.data.midi] : []))
  const known = cards.filter((c) => c.data.kind === 'note' && c.data.clef === clef && c.box >= STRETCH_BOX)
  if (known.length < STRETCH_AFTER) return []
  const [lo, hi] = STAFF_BOUNDS[clef]
  const white = (from: number, step: number) => {
    let m = from + step
    while (isBlackKey(m)) m += step
    return m
  }
  const below = white(Math.min(...midis), -1)
  const above = white(Math.max(...midis), 1)
  return [below, above].filter((m) => m >= lo && m <= hi)
}

function notePhase(cards: Card[], today: string): { phase: MixPhase; stretch: number[] } | null {
  const notes = cards.filter((c) => c.data.kind === 'note')
  const dueOf = (clef: Clef) =>
    notes.filter((c) => c.data.kind === 'note' && c.data.clef === clef && isDue(c, today)).length
  const clef: Clef = dueOf('bass') > dueOf('treble') ? 'bass' : 'treble'
  const ofClef = notes.filter((c) => c.data.kind === 'note' && c.data.clef === clef)
  const chosen = pick(ofClef, today, MIX_NOTES, MIX_MIN_NOTES)
  if (!chosen.length) return null
  const midis = chosen.map((c) => (c.data.kind === 'note' ? c.data.midi : 0))
  const stretch = stretchNotes(cards, clef)
  const all = [...new Set([...midis, ...stretch])].sort((a, b) => a - b)
  return {
    stretch,
    phase: {
      label: PHASE_LABELS.note,
      kind: 'note',
      lesson: {
        id: 'mix-notes',
        kind: 'drill',
        title: 'Notalar',
        description: 'Tekrar zamanı gelen notalar',
        clef,
        notes: all,
        length: MIX_DRILL_LENGTH,
        keyboard: fitKeyboard(all, { fromDo: true }),
        ...(stretch.length && { introduce: stretch, focus: stretch }),
      },
    },
  }
}

function chordPhase(cards: Card[], today: string): MixPhase | null {
  const chosen = pick(
    cards.filter((c) => c.kind === 'chord'),
    today,
    MIX_CHORDS,
    2,
  )
  const chords = chosen.flatMap((c) =>
    c.data.kind === 'chord' ? [chordTarget(c.data.root, c.data.quality, c.data.inversion, c.data.hands)] : [],
  )
  if (!chords.length) return null
  const lesson = chordLesson('chord', 'mix-chords', 'Akorlar', 'Tekrar zamanı gelen akorlar', {
    chords,
    ...(chords.length > 1 ? { draw: MIX_CHORD_DRAWS } : { repeat: 3 }),
    mode: 'exact',
    showName: true,
  })
  // Chords for different hands are read from the grand staff.
  const hands = new Set(chords.map((c) => c.hands))
  return { label: PHASE_LABELS.chord, kind: 'chord', lesson: { ...lesson, ...(hands.size > 1 && { grand: true }) } }
}

function patternPhase(cards: Card[], today: string): MixPhase | null {
  const scales = cards.filter((c) => c.kind === 'scale' && isDue(c, today)).sort(byUrgency)
  if (scales.length) {
    const parts = scales.slice(0, MIX_PATTERNS).flatMap((c) => (c.data.kind === 'scale' ? [c.data.part] : []))
    return {
      label: PHASE_LABELS.scale,
      kind: 'scale',
      lesson: scaleLesson('mix-scales', 'Gamlar', 'Tekrar zamanı gelen gamlar', parts),
    }
  }
  const arps = cards.filter((c) => c.kind === 'arpeggio' && isDue(c, today)).sort(byUrgency)
  if (!arps.length) return null
  const parts = arps.slice(0, MIX_PATTERNS).flatMap((c) => (c.data.kind === 'arpeggio' ? [c.data.part] : []))
  return {
    label: PHASE_LABELS.arpeggio,
    kind: 'arpeggio',
    lesson: arpeggioLesson('mix-arpeggios', 'Arpejler', 'Tekrar zamanı gelen arpejler', parts),
  }
}

/** Today's mix from the cards, or null when nothing is due. */
export function buildMix(cards: Card[], today: string): NoteLesson | null {
  const notes = notePhase(cards, today)
  const phases = [notes?.phase, chordPhase(cards, today), patternPhase(cards, today)].filter((p): p is MixPhase => !!p)
  if (!phases.length) return null
  const spec: MixSpec = { phases, due: dueCounts(cards, today), stretch: notes?.stretch ?? [] }
  return {
    id: MIX_LESSON_ID,
    kind: 'mix',
    title: 'Günün Karışımı',
    description: 'Tekrar zamanı gelen notalar, akorlar ve gamlar bir arada',
    clef: phases[0].lesson.clef,
    notes: [],
    length: 0,
    keyboard: phases[0].lesson.keyboard,
    mix: spec,
  }
}

/** The mix's report: a topic per phase, then the phases' topics merged. A phase out of hearts does not end the mix. */
export function mixReport(spec: MixSpec, all: SessionSummary[]): SessionSummary {
  // A phase ended before anything was played (a test finish) is left out.
  const phases = spec.phases.filter((_, i) => all[i] && all[i].total > 0)
  const summaries = all.filter((s) => s.total > 0)
  const played = summaries.length
  const accuracy = played ? summaries.reduce((a, s) => a + s.accuracy, 0) / played : 0
  const phaseTopics: CategoryStat[] = summaries.map((s, i) => ({
    id: `phase-${i + 1}`,
    label: phases[i].label,
    shown: s.total,
    firstTry: s.firstTry,
    accuracy: s.accuracy,
  }))
  const weakest = [...summaries.map((s, i) => ({ s, i }))].sort((a, b) => a.s.accuracy - b.s.accuracy)[0]
  const message = !played
    ? 'Karışım seni bekliyor.'
    : accuracy >= 0.9
      ? 'Tekrarlar tertemiz! Kartların bir üst kutuya çıktı, daha seyrek gelecekler.'
      : weakest && weakest.s.accuracy < 0.6
        ? `${phases[weakest.i].label} biraz zorladı. Zorlanılan kartlar yarın yine gelecek; her tekrar kolaylaştırır.`
        : 'Güzel tekrar. İyi bildiklerin daha seyrek, zorlandıkların daha sık gelecek.'
  return {
    failed: false,
    total: summaries.reduce((a, s) => a + s.total, 0),
    firstTry: summaries.reduce((a, s) => a + s.firstTry, 0),
    accuracy,
    avgReactionMs: avg(summaries.flatMap((s) => (s.avgReactionMs === null ? [] : [s.avgReactionMs]))),
    totalMistakes: summaries.reduce((a, s) => a + s.totalMistakes, 0),
    stars: played ? starsFor(accuracy) : 0,
    // The reading phase's notes, as in a drill.
    perNote: summaries.flatMap((s, i) => (phases[i].kind === 'note' ? s.perNote : [])),
    perCategory: [...phaseTopics, ...mergedTopics(summaries)],
    weakest: summaries.flatMap((s, i) => (phases[i].kind === 'note' ? s.weakest : [])),
    message,
    mix: {
      phases: summaries.map((s, i) => ({
        label: phases[i].label,
        title: phases[i].lesson.title,
        accuracy: s.accuracy,
        failed: s.failed,
      })),
      stretch: spec.stretch,
    },
  }
}
