// "Ritim Davulcusu": notes fall down lanes onto drum pads and must be played
// as they land, on the beat. Judged by BeatTrack; this file maps its state to
// lanes and positions for the scene.

import type { BeatTrack } from '../../../rhythm/track'

/** Where the pads sit, as a fraction of the height. */
export const HIT_Y = 0.78
export const BEATS_AHEAD = 3

/** One lane per distinct note; a single lane when any key counts. */
export function lanesFor(track: BeatTrack, anyKey: boolean): number[] {
  if (anyKey) return [track.records[0]?.target ?? 60]
  return [...new Set(track.records.filter((r) => !r.rest).map((r) => r.target))].sort((a, b) => a - b)
}

export function laneOf(lanes: number[], midi: number, anyKey: boolean): number {
  return anyKey ? 0 : lanes.indexOf(midi)
}

/** Vertical position (fraction of the height) of a note at `now`. */
export function noteY(dueAt: number, now: number, beatMs: number): number {
  return HIT_Y - ((dueAt - now) / (BEATS_AHEAD * beatMs)) * HIT_Y
}
