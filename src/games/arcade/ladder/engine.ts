// "Gam Merdiveni": a staircase up and down a scale, one stair per note. The
// climber hops onto a stair when its note is played on the beat. Timing is
// judged by BeatTrack; this file only turns its state into positions.

import { onTime } from '../../../rhythm/timing'
import type { BeatTrack, TimingRecord } from '../../../rhythm/track'
import type { LadderMeta } from '../../scales/steps'
import { RUN_LENGTH } from '../../scales/steps'

/** Highest stair of a part: the top of the scale. */
export const TOP = (RUN_LENGTH - 1) / 2
const HOP_MS = 260
const STUMBLE_MS = 450

/** Height of a stair in steps above the ground: up the scale and back down. */
export const stairHeight = (step: number) => (step <= TOP ? step + 1 : RUN_LENGTH - step)

export interface Stair {
  step: number
  /** The stair's records (one per hand). */
  records: TimingRecord[]
  meta: LadderMeta[]
}

/** The part on screen: the one with the next note to play (or the last one). */
export function currentPart(track: BeatTrack, meta: LadderMeta[]): number {
  const i = track.records.findIndex((r) => r.judgement === null)
  return meta[i === -1 ? meta.length - 1 : i].part
}

export function stairsOf(track: BeatTrack, meta: LadderMeta[], part: number): Stair[] {
  const stairs: Stair[] = []
  track.records.forEach((r, i) => {
    const m = meta[i]
    if (m.part !== part) return
    const stair = stairs[m.step] ?? (stairs[m.step] = { step: m.step, records: [], meta: [] })
    stair.records.push(r)
    stair.meta.push(m)
  })
  return stairs
}

/** A stair is climbed when every hand played its note (on time or not). */
const climbed = (s: Stair) => s.records.every((r) => r.judgement !== null && r.judgement !== 'miss')
const settledAt = (s: Stair) => Math.max(...s.records.map((r) => r.settledAt ?? 0))

export interface ClimberPose {
  /** The hop goes from stair `from` to stair `to` (-1 is the ground before the first stair). */
  from: number
  to: number
  /** Progress of the hop, 0..1. */
  t: number
  /** Height of the hop arc, 0..1. */
  hop: number
  stumbling: boolean
  /** The stair just climbed was played early or late. */
  wobbly: boolean
}

export function climberPose(stairs: Stair[], now: number): ClimberPose {
  const done = stairs.filter(climbed)
  const last = done[done.length - 1]
  const prev = done[done.length - 2]
  const missed = stairs.find((s) =>
    s.records.some((r) => r.judgement === 'miss' && r.settledAt !== null && now - r.settledAt < STUMBLE_MS),
  )
  if (!last) return { from: -1, to: -1, t: 1, hop: 0, stumbling: !!missed, wobbly: false }
  const t = Math.min(1, (now - settledAt(last)) / HOP_MS)
  return {
    from: prev ? prev.step : -1,
    to: last.step,
    t,
    hop: t < 1 ? 4 * t * (1 - t) : 0,
    stumbling: !!missed,
    wobbly: !last.records.every((r) => onTime(r.judgement)),
  }
}
