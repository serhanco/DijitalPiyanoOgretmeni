// The shared engine of every rhythm activity: timed targets on a beat grid,
// presses judged against them, misses detected as time passes. Pure: the
// caller passes times (performance.now() milliseconds, already corrected for
// input latency) and draws from the state.

import type { SkillProvider } from '../games/arcade/skill'
import { isRest, VALUE_BEATS, type RhythmValue } from './rhythm'
import { beatMs, judge, type Judgement, MAX_WINDOW_MS, onTime } from './timing'

export interface TimingRecord {
  target: number
  beat: number
  value: RhythmValue
  rest: boolean
  /** When the note should be played (start of the rest). */
  dueAt: number
  /** Press time minus `dueAt`, for notes that were played. */
  offsetMs: number | null
  /** Null until settled. A kept rest is 'perfect', a broken one 'miss'. */
  judgement: Judgement | null
  settledAt: number | null
  wrongPresses: number[]
}

export type TrackEvent =
  | { type: 'hit'; record: TimingRecord; judgement: Judgement }
  | { type: 'miss'; record: TimingRecord }
  | { type: 'wrong'; record: TimingRecord; midi: number }
  | { type: 'rest-kept'; record: TimingRecord }
  | { type: 'stray'; midi: number }

export interface TrackOptions {
  bpm: number
  /** performance.now() time of beat 0. */
  startAt: number
  /** Lives lost on misses, wrong notes and broken rests. Unlimited when null. */
  hearts?: number | null
}

export class BeatTrack {
  readonly records: TimingRecord[]
  readonly bpm: number
  readonly beatMs: number
  readonly startAt: number
  hearts: number | null
  combo = 0
  bestCombo = 0
  /** Presses that were near no note at all. */
  stray = 0
  /** The latest press, for animations (a jump, a drum hit). */
  lastPress: { at: number; event: TrackEvent } | null = null
  private readonly windows: number[]
  private readonly skill: SkillProvider

  constructor(skill: SkillProvider, { bpm, startAt, hearts = null }: TrackOptions) {
    this.skill = skill
    this.bpm = bpm
    this.beatMs = beatMs(bpm)
    this.startAt = startAt
    this.hearts = hearts
    this.records = skill.targets.map((t) => {
      const value = t.value ?? 'q'
      const beat = t.beat ?? 0
      return {
        target: t.midi,
        beat,
        value,
        rest: isRest(value),
        dueAt: startAt + beat * this.beatMs,
        offsetMs: null,
        judgement: null,
        settledAt: null,
        wrongPresses: [],
      }
    })
    // A note's window never reaches halfway to its neighbours, so a press
    // always belongs to the closest note. Notes due together (both hands)
    // share a window.
    const times = [...new Set(this.records.filter((r) => !r.rest).map((r) => r.dueAt))].sort((a, b) => a - b)
    this.windows = this.records.map((r) => {
      if (r.rest) return 0
      const i = times.indexOf(r.dueAt)
      const gaps = [times[i - 1], times[i + 1]].filter((t) => t !== undefined).map((t) => Math.abs(t - r.dueAt) / 2)
      return Math.min(MAX_WINDOW_MS, ...gaps)
    })
  }

  get total(): number {
    return this.records.length
  }

  /** Time the last note or rest ends. */
  get endAt(): number {
    const last = this.records[this.records.length - 1]
    return last ? last.dueAt + VALUE_BEATS[last.value] * this.beatMs : this.startAt
  }

  /** Fractional beat at `now`; negative during the count-in. */
  beatAt(now: number): number {
    return (now - this.startAt) / this.beatMs
  }

  get failed(): boolean {
    return this.hearts !== null && this.hearts <= 0
  }

  get done(): boolean {
    return this.failed || this.records.every((r) => r.judgement !== null)
  }

  get progress(): number {
    return this.records.filter((r) => r.judgement !== null).length / Math.max(1, this.total)
  }

  /** Settled targets: the basis of the report. */
  get attempted(): TimingRecord[] {
    return this.records.filter((r) => r.judgement !== null)
  }

  /** The next note still to be played, for hints and tests. */
  get next(): TimingRecord | null {
    return this.records.find((r) => !r.rest && r.judgement === null) ?? null
  }

  windowOf(record: TimingRecord): number {
    return this.windows[this.records.indexOf(record)]
  }

  private settle(r: TimingRecord, judgement: Judgement, now: number) {
    r.judgement = judgement
    r.settledAt = now
    if (onTime(judgement) && r.wrongPresses.length === 0) {
      this.combo++
      this.bestCombo = Math.max(this.bestCombo, this.combo)
    } else {
      this.combo = 0
    }
  }

  private loseHeart() {
    if (this.hearts !== null) this.hearts = Math.max(0, this.hearts - 1)
  }

  press(midi: number, time: number): TrackEvent[] {
    // Presses during the count-in are warm-up, not mistakes.
    if (this.done || time < this.startAt - MAX_WINDOW_MS) return []
    let nearest: TimingRecord | null = null
    let matching: TimingRecord | null = null
    for (const r of this.records) {
      if (r.rest || r.judgement !== null) continue
      const off = Math.abs(time - r.dueAt)
      if (off > this.windowOf(r)) continue
      if (!nearest || off < Math.abs(time - nearest.dueAt)) nearest = r
      if (this.skill.matches({ midi: r.target }, midi) && (!matching || off < Math.abs(time - matching.dueAt)))
        matching = r
    }
    // Of notes due together, the key decides which one was played.
    const best = matching ?? nearest

    let event: TrackEvent
    if (best) {
      if (this.skill.matches({ midi: best.target }, midi)) {
        best.offsetMs = time - best.dueAt
        this.settle(best, judge(best.offsetMs), time)
        event = { type: 'hit', record: best, judgement: best.judgement! }
      } else {
        // No heart yet: the note is still open and becomes a miss if it is never played right.
        best.wrongPresses.push(midi)
        this.combo = 0
        event = { type: 'wrong', record: best, midi }
      }
    } else {
      // Playing during a rest breaks it; the next note's early window is checked above first.
      const rest = this.records.find(
        (r) => r.rest && r.judgement === null && time >= r.dueAt && time < r.dueAt + VALUE_BEATS[r.value] * this.beatMs,
      )
      if (rest) {
        rest.wrongPresses.push(midi)
        this.settle(rest, 'miss', time)
        this.loseHeart()
        event = { type: 'miss', record: rest }
      } else {
        this.stray++
        event = { type: 'stray', midi }
      }
    }
    this.lastPress = { at: time, event }
    return [event]
  }

  /** Settle notes nobody played and rests nobody broke. */
  update(now: number): TrackEvent[] {
    const events: TrackEvent[] = []
    for (const r of this.records) {
      if (this.done) break
      if (r.judgement !== null) continue
      if (r.rest) {
        if (now >= r.dueAt + VALUE_BEATS[r.value] * this.beatMs) {
          this.settle(r, 'perfect', now)
          events.push({ type: 'rest-kept', record: r })
        }
      } else if (now > r.dueAt + this.windowOf(r)) {
        this.settle(r, 'miss', now)
        this.loseHeart()
        events.push({ type: 'miss', record: r })
      }
    }
    return events
  }
}
