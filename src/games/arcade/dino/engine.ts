// "Dino Koşusu": a Chrome Dino-like runner on a metronome. Obstacles arrive
// exactly on their beat; playing the note on the beat makes the dino jump.
// The rhythm itself is judged by BeatTrack; this file only turns its state
// into positions, so the scene stays a pure drawing.

import type { BeatTrack, TimingRecord } from '../../../rhythm/track'

export const DINO_X = 0.2
/** How many beats of the future are visible to the right of the dino. */
export const BEATS_AHEAD = 4
const STUMBLE_MS = 450

/** Horizontal position (fraction of the width) of a target at `now`. */
export function obstacleX(dueAt: number, now: number, beatMs: number): number {
  return DINO_X + ((dueAt - now) / (BEATS_AHEAD * beatMs)) * (1 - DINO_X)
}

/** A jump short enough to land before the next eighth note. */
export const jumpMs = (beatMs: number) => Math.min(beatMs * 0.9, 420)

/** Jump height 0..1, a parabola over the jump. */
export function jumpHeight(sinceMs: number, durationMs: number): number {
  const t = sinceMs / durationMs
  return t <= 0 || t >= 1 ? 0 : 4 * t * (1 - t)
}

export interface DinoPose {
  height: number
  /** Tripped over a missed obstacle or pressed a wrong key. */
  stumbling: boolean
  /** The obstacle being tripped over, for a red flash. */
  hitObstacle: TimingRecord | null
}

export function dinoPose(track: BeatTrack, now: number): DinoPose {
  const last = track.lastPress
  let height = 0
  let stumbling = false
  if (last && (last.event.type === 'hit' || last.event.type === 'stray')) {
    height = jumpHeight(now - last.at, jumpMs(track.beatMs))
  } else if (last && now - last.at < STUMBLE_MS) {
    stumbling = true
  }
  const hitObstacle =
    track.records.find(
      (r) => !r.rest && r.judgement === 'miss' && r.settledAt !== null && now - r.settledAt < STUMBLE_MS,
    ) ?? null
  if (hitObstacle) stumbling = true
  return { height, stumbling, hitObstacle }
}
