// Scale lessons: scale parts turned into melody steps (with spelling,
// fingers and crossings), the timed plan of Gam Merdiveni, and the parts of
// the report only scales have (per scale, crossings, evenness). Pure.

import { type Clef, type Hand, pitchClass } from '../../music/notes'
import {
  type Crossing,
  keyAccidentals,
  keySignature,
  parseTonic,
  type ScaleType,
  scaleRun,
  scaleTitle,
  spelledName,
  type Tonic,
} from '../../music/scales'
import type { RhythmValue } from '../../rhythm/rhythm'
import { clean, scoreOf } from '../../rhythm/summary'
import type { TimingRecord } from '../../rhythm/track'
import type { SkillProvider, SkillTarget } from '../arcade/skill'
import { type Step, TOGETHER_MS } from '../melody/session'
import { firstTryOk, type PromptRecord } from '../noteHunter/session'
import type { CategoryStat, HandStat, SyncSummary } from '../noteHunter/summary'
import { avg } from '../noteHunter/summary'

/** Who plays the scale: one hand, both hands in the same direction, or in opposite directions. */
export type ScaleHands = 'right' | 'left' | 'parallel' | 'contrary'

export interface ScalePart {
  /** "C", "Bb", "F#". */
  tonic: string
  type: ScaleType
  hands: ScaleHands
}

export const HANDS_TITLES: Record<ScaleHands, string> = {
  right: 'sağ el',
  left: 'sol el',
  parallel: 'iki el',
  contrary: 'zıt hareket',
}

/** Notes in one scale part: up an octave and back down. */
export const RUN_LENGTH = 15
/** Steps on one page of the staff: the way up, then the way down. */
export const SCALE_PAGE = 8

export function partTitle(part: ScalePart): string {
  return `${scaleTitle(parseTonic(part.tonic), part.type)} · ${HANDS_TITLES[part.hands]}`
}

const handsOf = (h: ScaleHands): Hand[] => (h === 'right' ? ['right'] : h === 'left' ? ['left'] : ['right', 'left'])
const clefOfHand = (hand: Hand): Clef => (hand === 'right' ? 'treble' : 'bass')

/**
 * Octave of the tonic a hand starts on, chosen to sit well on its staff:
 * the right hand from the 4th octave, the left hand an octave or two lower,
 * and in contrary motion both thumbs share the tonic nearest middle C.
 */
function startOctave(tonic: Tonic, hands: ScaleHands, hand: Hand): number {
  const high = tonic.letter === 'g' || tonic.letter === 'a' || tonic.letter === 'b'
  if (hands === 'contrary') return high ? 3 : 4
  return hand === 'right' ? 4 : high ? 2 : 3
}

export function scaleSteps(parts: ScalePart[]): Step[] {
  return parts.flatMap((part, p) => {
    const tonic = parseTonic(part.tonic)
    const keySig = keySignature(tonic, part.type)
    const keyAcc = keyAccidentals(tonic, part.type)
    const runs = handsOf(part.hands).map((hand) => ({
      hand,
      run: scaleRun(
        tonic,
        part.type,
        hand,
        startOctave(tonic, part.hands, hand),
        part.hands === 'contrary' && hand === 'left',
      ),
    }))
    return Array.from({ length: RUN_LENGTH }, (_, i) => ({
      melody: p,
      keySig,
      keyAcc,
      notes: runs.map(({ hand, run }) => ({
        midi: run[i].midi,
        clef: clefOfHand(hand),
        spelled: run[i],
        finger: run[i].finger,
        cross: run[i].cross,
      })),
    }))
  })
}

/** The keyboard to show: from the C at or below the lowest note to the highest white key needed. */
export function scaleKeyboard(parts: ScalePart[]): { low: number; high: number } {
  const midis = scaleSteps(parts).flatMap((s) => s.notes.map((n) => n.midi))
  const low = Math.min(...midis)
  const high = Math.max(...midis)
  const blackTop = [1, 3, 6, 8, 10].includes(pitchClass(high))
  return { low: low - pitchClass(low), high: blackTop ? high + 1 : high }
}

/** Written names of the lesson's keys, so a B♭ is never called La#. */
export function spelledNames(steps: Step[]): Map<number, string> {
  const names = new Map<number, string>()
  for (const s of steps) for (const n of s.notes) if (n.spelled) names.set(n.midi, spelledName(n.spelled))
  return names
}

export interface ScaleSummary {
  /** 0..1: how even the time between notes was (1 = like a metronome). Null when too few notes. */
  evenness: number | null
  /** Mean time from one note to the next, played cleanly. */
  meanIntervalMs: number | null
  /** Notes reached with a thumb crossing, and how many were right at once. */
  crossings: { shown: number; firstTry: number }
}

const topic = (id: string, label: string, shown: number, firstTry: number, accuracy: number): CategoryStat => ({
  id,
  label,
  shown,
  firstTry,
  accuracy,
})

/** How even a list of intervals is: 1 minus the coefficient of variation, never below 0. */
export function evennessOf(intervals: number[]): number | null {
  const mean = avg(intervals)
  if (mean === null || intervals.length < 3 || mean <= 0) return null
  const sd = Math.sqrt(intervals.reduce((n, x) => n + (x - mean) ** 2, 0) / intervals.length)
  return Math.max(0, 1 - sd / mean)
}

/**
 * The report of an untimed scale lesson: success per scale part, at thumb
 * crossings, and how evenly the notes followed each other.
 */
export function scaleReport(
  steps: Step[],
  stepRecords: PromptRecord[][],
  parts: ScalePart[],
): { perCategory: CategoryStat[]; scale: ScaleSummary } {
  const perCategory: CategoryStat[] = []
  parts.forEach((part, p) => {
    const rs = stepRecords.filter((_, i) => steps[i].melody === p).flat()
    const seen = rs.filter((r) => r.shownAt !== null)
    if (!seen.length) return
    const ok = seen.filter(firstTryOk).length
    perCategory.push(topic(`part-${p}`, partTitle(part), seen.length, ok, ok / seen.length))
  })

  const crossed = steps.flatMap((s, i) =>
    s.notes.flatMap((n, k) => (n.cross && stepRecords[i][k].shownAt !== null ? [stepRecords[i][k]] : [])),
  )
  const crossOk = crossed.filter(firstTryOk).length
  if (crossed.length)
    perCategory.push(topic('crossings', 'Parmak geçişleri', crossed.length, crossOk, crossOk / crossed.length))

  // Time between two clean steps of the same part; the page turn halfway is not counted.
  const doneAt = (rs: PromptRecord[]) =>
    rs.every((r) => r.answeredAt !== null && firstTryOk(r)) ? Math.max(...rs.map((r) => r.answeredAt!)) : null
  const perPart: number[][] = parts.map(() => [])
  let inPart = 0
  steps.forEach((s, i) => {
    inPart = i > 0 && steps[i - 1].melody === s.melody ? inPart + 1 : 0
    if (inPart === 0 || inPart === SCALE_PAGE) return
    const a = doneAt(stepRecords[i - 1])
    const b = doneAt(stepRecords[i])
    if (a !== null && b !== null) perPart[s.melody].push(b - a)
  })
  // Each part may have its own pace: average the parts' evenness, weighted by their notes.
  let weight = 0
  let sum = 0
  for (const xs of perPart) {
    const e = evennessOf(xs)
    if (e === null) continue
    weight += xs.length
    sum += e * xs.length
  }
  const all = perPart.flat()
  const evenness = weight ? sum / weight : null
  if (evenness !== null) perCategory.push(topic('evenness', 'Eşit tempo', all.length, all.length, evenness))

  return {
    perCategory,
    scale: { evenness, meanIntervalMs: avg(all), crossings: { shown: crossed.length, firstTry: crossOk } },
  }
}

/** What Gam Merdiveni needs to know about each timed target besides its timing. */
export interface LadderMeta {
  part: number
  step: number
  clef: Clef
  finger: number
  cross: Crossing | null
  name: string
}

export interface LadderPlan {
  steps: Step[]
  bars: RhythmValue[][]
  skill: SkillProvider
  /** One entry per target, in the same order as the track's records. */
  meta: LadderMeta[]
}

/** Beats one part takes: fifteen quarters, the last note held for two beats. */
export const PART_BEATS = RUN_LENGTH + 1

/** A scale on the metronome: one note per beat, both hands' notes on the same beat. */
export function ladderPlan(parts: ScalePart[], ignoreOctave = false): LadderPlan {
  const steps = scaleSteps(parts)
  const targets: SkillTarget[] = []
  const meta: LadderMeta[] = []
  let inPart = 0
  steps.forEach((s, i) => {
    inPart = i > 0 && steps[i - 1].melody === s.melody ? inPart + 1 : 0
    const value: RhythmValue = inPart === RUN_LENGTH - 1 ? 'h' : 'q'
    for (const n of s.notes) {
      targets.push({ midi: n.midi, beat: s.melody * PART_BEATS + inPart, value, clef: n.clef })
      meta.push({
        part: s.melody,
        step: inPart,
        clef: n.clef,
        finger: n.finger ?? 0,
        cross: n.cross ?? null,
        name: n.spelled ? spelledName(n.spelled, false) : '',
      })
    }
  })
  const bar: RhythmValue[] = ['q', 'q', 'q', 'q']
  const bars = parts.flatMap(() => [bar, bar, bar, ['q', 'q', 'h'] as RhythmValue[]])
  const midis = targets.map((t) => t.midi)
  return {
    steps,
    bars,
    meta,
    skill: {
      clef: 'treble',
      range: [...new Set(midis)].sort((a, b) => a - b),
      targets,
      matches: (t, pressed) => (ignoreOctave ? pitchClass(t.midi) === pitchClass(pressed) : t.midi === pressed),
    },
  }
}

/** The scale parts of a Gam Merdiveni report: per part, crossings, each hand, and the two hands together. */
export function ladderReport(
  records: TimingRecord[],
  meta: LadderMeta[],
  parts: ScalePart[],
): { perCategory: CategoryStat[]; scale: ScaleSummary; hands?: HandStat[]; sync?: SyncSummary } {
  const settled = records.map((r, i) => ({ r, m: meta[i] })).filter(({ r }) => r.judgement !== null)
  const stat = (id: string, label: string, xs: TimingRecord[]) =>
    topic(id, label, xs.length, xs.filter(clean).length, xs.reduce((n, r) => n + scoreOf(r), 0) / xs.length)

  const perCategory: CategoryStat[] = []
  parts.forEach((part, p) => {
    const xs = settled.filter(({ m }) => m.part === p).map(({ r }) => r)
    if (xs.length) perCategory.push(stat(`part-${p}`, partTitle(part), xs))
  })
  const crossed = settled.filter(({ m }) => m.cross).map(({ r }) => r)
  if (crossed.length) perCategory.push(stat('crossings', 'Parmak geçişleri', crossed))

  const clefs = new Set(meta.map((m) => m.clef))
  let hands: HandStat[] | undefined
  let sync: SyncSummary | undefined
  if (clefs.size > 1) {
    hands = (['right', 'left'] as Hand[]).map((hand) => {
      const xs = settled.filter(({ m }) => m.clef === clefOfHand(hand)).map(({ r }) => r)
      const s = xs.length ? stat(hand, '', xs) : null
      return {
        hand,
        label: hand === 'right' ? 'Sağ el (sol anahtarı)' : 'Sol el (fa anahtarı)',
        shown: xs.length,
        firstTry: s?.firstTry ?? 0,
        accuracy: s?.accuracy ?? 0,
        avgReactionMs: null,
      }
    })
    // Pairs: the two hands' notes on the same beat, both played.
    const leads: number[] = []
    const byBeat = new Map<number, { left?: number; right?: number }>()
    for (const { r, m } of settled) {
      if (r.offsetMs === null) continue
      const pair = byBeat.get(r.beat) ?? {}
      pair[m.clef === 'bass' ? 'left' : 'right'] = r.offsetMs
      byBeat.set(r.beat, pair)
    }
    for (const { left, right } of byBeat.values())
      if (left !== undefined && right !== undefined) leads.push(left - right)
    if (leads.length) {
      const gaps = leads.map(Math.abs)
      sync = {
        pairs: leads.length,
        together: gaps.filter((g) => g <= TOGETHER_MS).length,
        meanGapMs: avg(gaps),
        meanLeadMs: avg(leads),
      }
    }
  }

  return {
    perCategory,
    scale: {
      evenness: null,
      meanIntervalMs: null,
      crossings: { shown: crossed.length, firstTry: crossed.filter(clean).length },
    },
    ...(hands && { hands }),
    ...(sync && { sync }),
  }
}
