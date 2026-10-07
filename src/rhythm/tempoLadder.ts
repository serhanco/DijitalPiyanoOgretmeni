// Tempo merdiveni: the same activity played several times in a row, each
// round faster than the last (60, 72, 84 BPM). A round is passed with a good
// enough timing score; passing every round raises the starting tempo for
// good. Pure: rounds are read from finished BeatTracks.

import type { CategoryStat } from '../games/noteHunter/summary'
import { clean, scoreOf } from './summary'
import { MAX_BPM } from './timing'
import type { BeatTrack } from './track'

export interface TempoLadderSpec {
  /** Rounds in one lesson. */
  rounds: number
  /** BPM added every round, and to the starting tempo once every round is passed. */
  stepBpm: number
}

/** A round is passed with at least this timing score (perfect 1, good 0.85, early or late 0.4). */
export const ROUND_PASS = 0.8

export interface TempoRound {
  bpm: number
  /** Timing score of the round, 0..1; notes never reached count as missed. */
  score: number
  passed: boolean
}

export interface TempoLadderSummary {
  /** The planned tempos, the rounds played and the starting tempo for next time when it went up. */
  tempos: number[]
  rounds: TempoRound[]
  raisedTo: number | null
}

/** The highest starting tempo that still keeps the last round within MAX_BPM. */
export const maxBase = (spec: TempoLadderSpec) => MAX_BPM - (spec.rounds - 1) * spec.stepBpm

export function ladderTempos(base: number, spec: TempoLadderSpec): number[] {
  const start = Math.min(base, maxBase(spec))
  return Array.from({ length: spec.rounds }, (_, i) => start + i * spec.stepBpm)
}

export function scoreRound(track: BeatTrack): TempoRound {
  const score = track.total ? track.records.reduce((n, r) => n + scoreOf(r), 0) / track.total : 0
  return { bpm: track.bpm, score, passed: !track.failed && score >= ROUND_PASS }
}

/** Whether to play another, faster round after `played` rounds. */
export function nextRound(played: TempoRound[], tempos: number[]): number | null {
  const last = played[played.length - 1]
  return last?.passed && played.length < tempos.length ? tempos[played.length] : null
}

/** The new starting tempo once every round is passed; null when it stays. */
export function raisedBase(tempos: number[], rounds: TempoRound[], spec: TempoLadderSpec): number | null {
  if (rounds.length < tempos.length || !rounds.every((r) => r.passed)) return null
  const next = Math.min(tempos[0] + spec.stepBpm, maxBase(spec))
  return next > tempos[0] ? next : null
}

/** One report topic per tempo played: "72 BPM" with its timing score. */
export function tempoTopics(tracks: BeatTrack[]): CategoryStat[] {
  return tracks.map((t) => {
    const settled = t.attempted
    const { score } = scoreRound(t)
    return {
      id: `tempo-${t.bpm}`,
      label: `${t.bpm} BPM`,
      shown: t.total,
      firstTry: settled.filter(clean).length,
      accuracy: score,
    }
  })
}

export function tempoLadderSummary(tracks: BeatTrack[], tempos: number[], spec: TempoLadderSpec): TempoLadderSummary {
  const rounds = tracks.map(scoreRound)
  return { tempos, rounds, raisedTo: raisedBase(tempos, rounds, spec) }
}
