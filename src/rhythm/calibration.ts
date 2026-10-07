// Latency calibration: the player taps along with a metronome; the typical
// offset of the taps is the delay of their setup (Bluetooth MIDI, touch
// screen, audio output) and is subtracted from later presses.

import type { InputSource } from '../input/inputBus'

export const CALIBRATION_BPM = 90
export const CALIBRATION_BEATS = 16
/** Taps further than this from the median are slips, not latency. */
const OUTLIER_MS = 120
const MIN_TAPS = 6
const MAX_SPREAD_MS = 60
export const MAX_LATENCY_MS = 300

export type Latency = Record<InputSource, number>

export const NO_LATENCY: Latency = { midi: 0, screen: 0, computer: 0 }

/** Offset of a tap from the nearest beat, in ms (negative = early). */
export function offsetFromBeat(time: number, startAt: number, beatMs: number): { beat: number; offsetMs: number } {
  const beat = Math.round((time - startAt) / beatMs)
  return { beat, offsetMs: time - (startAt + beat * beatMs) }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface CalibrationResult {
  latencyMs: number
  /** Standard deviation of the kept taps. */
  spreadMs: number
  used: number
  /** Enough steady taps to trust the result. */
  ok: boolean
}

export function calibrate(offsets: number[]): CalibrationResult | null {
  if (offsets.length === 0) return null
  const mid = median(offsets)
  const kept = offsets.filter((o) => Math.abs(o - mid) <= OUTLIER_MS)
  const mean = kept.reduce((a, b) => a + b, 0) / kept.length
  const spreadMs = Math.sqrt(kept.reduce((n, o) => n + (o - mean) ** 2, 0) / kept.length)
  const latencyMs = Math.round(Math.min(MAX_LATENCY_MS, Math.max(-MAX_LATENCY_MS, mean)))
  return { latencyMs, spreadMs, used: kept.length, ok: kept.length >= MIN_TAPS && spreadMs <= MAX_SPREAD_MS }
}

/**
 * A press time corrected for the delay of the device it came from: the
 * keyboard's own measurement when there is one (a Bluetooth piano and a USB
 * controller differ a lot), otherwise the one of its input source.
 */
export function correctedTime(
  time: number,
  source: InputSource,
  latency: Latency,
  device?: string,
  byDevice: Record<string, number> = {},
): number {
  const own = device !== undefined ? byDevice[device] : undefined
  return time - (own ?? latency[source] ?? 0)
}
