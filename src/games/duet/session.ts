// "Çift Kişilik Davul": Notiş plays a bar on its drum, the learner answers in
// the next bar. First the answer copies the call (a Yankı turned into a game),
// later it is free: any rhythm of the learner's own that fills the bar and
// keeps to the beat grid counts. Pure: times are passed in (game clock ms).

import { parsePattern } from '../../rhythm/plan'
import { isRest, type RhythmValue, VALUE_BEATS } from '../../rhythm/rhythm'
import { beatMs, GOOD_MS, judge, type Judgement, JUDGEMENT_SCORE, MAX_WINDOW_MS } from '../../rhythm/timing'
import { type CategoryStat, type SessionSummary, starsFor } from '../noteHunter/summary'

export type DuetTurn = 'echo' | 'free'

export interface DuetSpec {
  bpm: number
  beatsPerBar: number
  /** Notiş's calls, one bar each, used in turn ("q q h | q e e h"). */
  calls: string
  /** Each round: copy the call, or answer it freely. */
  turns: DuetTurn[]
}

/** A press this close to an eighth of the grid is on the beat in a free answer. */
export const GRID_MS = GOOD_MS + 30
/** A free answer needs at least this many notes. */
export const MIN_FREE_NOTES = 3
/** A round passes from this score. */
export const ROUND_OK = 0.75
/** A press this early still belongs to the answer bar; the last part of the bar is left for late presses. */
const EARLY_MS = 150
const SETTLE_MS = 120

export interface RoundResult {
  score: number
  ok: boolean
  /** Echo: each call note, matched or not. */
  notes?: { judgement: Judgement; offsetMs: number | null }[]
  /** Presses near no call note (echo) or off the grid (free). */
  extra: number
  /** Free: presses on the eighth grid, and whether the rhythm differed from the call. */
  onGrid?: number
  own?: boolean
  /** Free: fewer than MIN_FREE_NOTES presses. */
  quiet?: boolean
}

export interface DuetRound {
  index: number
  turn: DuetTurn
  call: RhythmValue[]
  /** Beats (inside the bar) the call's notes start on. */
  onsets: number[]
  callStart: number
  answerStart: number
  answerEnd: number
  presses: number[]
  result: RoundResult | null
}

export type DuetEvent =
  | { type: 'tap'; round: DuetRound; time: number; onGrid: boolean | null }
  | { type: 'stray'; time: number }
  | { type: 'judged'; round: DuetRound }

/** Start beats of the notes of a bar (rests left out). */
export function onsetsOf(bar: RhythmValue[]): number[] {
  const out: number[] = []
  let beat = 0
  for (const v of bar) {
    if (!isRest(v)) out.push(beat)
    beat += VALUE_BEATS[v]
  }
  return out
}

export class DuetSession {
  readonly rounds: DuetRound[]
  readonly beatMs: number
  readonly bpm: number
  readonly beatsPerBar: number
  readonly startAt: number

  /** `startAt`: game-clock time of the first call's first beat. */
  constructor(spec: DuetSpec, startAt: number, bpm = spec.bpm) {
    this.bpm = bpm
    this.beatMs = beatMs(bpm)
    this.beatsPerBar = spec.beatsPerBar
    this.startAt = startAt
    const calls = parsePattern(spec.calls, spec.beatsPerBar)
    const barMs = this.beatMs * spec.beatsPerBar
    this.rounds = spec.turns.map((turn, index) => {
      const call = calls[index % calls.length]
      const callStart = startAt + index * 2 * barMs
      return {
        index,
        turn,
        call,
        onsets: onsetsOf(call),
        callStart,
        answerStart: callStart + barMs,
        answerEnd: callStart + 2 * barMs,
        presses: [],
        result: null,
      }
    })
  }

  get endAt(): number {
    return this.rounds.length ? this.rounds[this.rounds.length - 1].answerEnd : this.startAt
  }

  get done(): boolean {
    return this.rounds.every((r) => r.result !== null)
  }

  get attempted(): DuetRound[] {
    return this.rounds.filter((r) => r.result !== null)
  }

  get progress(): number {
    return this.attempted.length / Math.max(1, this.rounds.length)
  }

  /** The round whose call or answer is playing at `now`, and which half. */
  turnAt(now: number): { round: DuetRound; part: 'call' | 'answer' } | null {
    for (const r of this.rounds) {
      if (now >= r.callStart && now < r.answerStart) return { round: r, part: 'call' }
      if (now >= r.answerStart && now < r.answerEnd) return { round: r, part: 'answer' }
    }
    return null
  }

  /** Beat of the bar the eighth-grid position nearest `time` is on, and how far off it is. */
  gridOf(round: DuetRound, time: number): { beat: number; offsetMs: number } {
    const eighth = this.beatMs / 2
    const k = Math.round((time - round.answerStart) / eighth)
    return { beat: k / 2, offsetMs: time - (round.answerStart + k * eighth) }
  }

  press(time: number): DuetEvent[] {
    const round = this.rounds.find(
      (r) => r.result === null && time >= r.answerStart - EARLY_MS && time < r.answerEnd - EARLY_MS,
    )
    if (!round) return [{ type: 'stray', time }]
    round.presses.push(time)
    const onGrid = round.turn === 'free' ? Math.abs(this.gridOf(round, time).offsetMs) <= GRID_MS : null
    return [{ type: 'tap', round, time, onGrid }]
  }

  update(now: number): DuetEvent[] {
    const events: DuetEvent[] = []
    for (const r of this.rounds) {
      if (r.result !== null || now < r.answerEnd - EARLY_MS + SETTLE_MS) continue
      r.result = r.turn === 'echo' ? this.judgeEcho(r) : this.judgeFree(r)
      events.push({ type: 'judged', round: r })
    }
    return events
  }

  /** Each call note is matched to the closest press inside its window. */
  private judgeEcho(r: DuetRound): RoundResult {
    const due = r.onsets.map((b) => r.answerStart + b * this.beatMs)
    const windows = due.map((t, i) =>
      Math.min(
        MAX_WINDOW_MS,
        ...[due[i - 1], due[i + 1]].filter((x) => x !== undefined).map((x) => Math.abs(x - t) / 2),
      ),
    )
    const used = new Set<number>()
    const notes = due.map((t, i) => {
      let best: number | null = null
      r.presses.forEach((p, k) => {
        if (used.has(k) || Math.abs(p - t) > windows[i]) return
        if (best === null || Math.abs(p - t) < Math.abs(r.presses[best] - t)) best = k
      })
      if (best === null) return { judgement: 'miss' as Judgement, offsetMs: null }
      used.add(best)
      const offsetMs = r.presses[best] - t
      return { judgement: judge(offsetMs), offsetMs }
    })
    const extra = r.presses.length - used.size
    const score = notes.reduce((s, n) => s + JUDGEMENT_SCORE[n.judgement], 0) / Math.max(1, notes.length + extra)
    return { score, ok: score >= ROUND_OK, notes, extra }
  }

  /** Any rhythm counts that has enough notes and keeps them on the eighth grid. */
  private judgeFree(r: DuetRound): RoundResult {
    const grid = r.presses.map((p) => this.gridOf(r, p))
    const onGrid = grid.filter((g) => Math.abs(g.offsetMs) <= GRID_MS).length
    const quiet = r.presses.length < MIN_FREE_NOTES
    const score = quiet ? 0 : onGrid / r.presses.length
    const played = [...new Set(grid.map((g) => g.beat))].sort((a, b) => a - b)
    const own = played.join() !== r.onsets.join()
    return { score, ok: !quiet && score >= ROUND_OK, extra: r.presses.length - onGrid, onGrid, own, quiet }
  }
}

export interface DuetSummary {
  rounds: { turn: DuetTurn; score: number; ok: boolean; own?: boolean; quiet?: boolean }[]
  /** Free answers that passed with a rhythm different from Notiş's call. */
  ownRhythms: number
  /** Mean signed offset of the matched echo notes: negative = early. */
  meanOffsetMs: number | null
}

const TURN_LABELS: Record<DuetTurn, string> = {
  echo: 'Yankı: aynısını çalmak',
  free: 'Cevap: kendi ritmini çalmak',
}

/** The report: a topic per kind of turn, accuracy = mean round score. */
export function duetReport(session: DuetSession, failed = false): SessionSummary {
  const rounds = session.attempted
  const scores = rounds.map((r) => r.result!.score)
  const accuracy = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const perCategory: CategoryStat[] = (['echo', 'free'] as DuetTurn[])
    .map((turn) => {
      const rs = rounds.filter((r) => r.turn === turn)
      const ok = rs.filter((r) => r.result!.ok).length
      return {
        id: turn,
        label: TURN_LABELS[turn],
        shown: rs.length,
        firstTry: ok,
        accuracy: rs.length ? rs.reduce((s, r) => s + r.result!.score, 0) / rs.length : 0,
      }
    })
    .filter((c) => c.shown > 0)
  const offsets = rounds.flatMap((r) =>
    (r.result!.notes ?? []).flatMap((n) => (n.offsetMs === null ? [] : [n.offsetMs])),
  )
  const meanOffsetMs = offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : null
  const ownRhythms = rounds.filter((r) => r.turn === 'free' && r.result!.ok && r.result!.own).length
  const firstTry = rounds.filter((r) => r.result!.ok).length
  const free = perCategory.find((c) => c.id === 'free')
  const echo = perCategory.find((c) => c.id === 'echo')
  const message =
    accuracy >= 0.9
      ? 'Notiş’le harika bir düet! Kulağın ve elin aynı ritimde.'
      : free && echo && free.accuracy < echo.accuracy - 0.15
        ? 'Taklit iyi; kendi cevaplarında vuruşu metronomla say, notaları sekizlik ızgaraya oturt.'
        : echo && echo.accuracy < 0.75
          ? 'Önce dinle, sonra aynısını çal: Notiş’in ritmini içinden sayarak tekrar et.'
          : 'Güzel düet! Biraz daha çalıştıkça cevapların daha da oturacak.'
  return {
    failed,
    total: rounds.length,
    firstTry,
    accuracy,
    avgReactionMs: null,
    totalMistakes: rounds.reduce((n, r) => n + r.result!.extra, 0),
    stars: failed ? 0 : starsFor(accuracy),
    perNote: [],
    perCategory,
    weakest: [],
    message,
    duet: {
      rounds: rounds.map((r) => ({
        turn: r.turn,
        score: r.result!.score,
        ok: r.result!.ok,
        ...(r.turn === 'free' && { own: r.result!.own, quiet: r.result!.quiet }),
      })),
      ownRhythms,
      meanOffsetMs,
    },
  }
}
