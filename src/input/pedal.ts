// The sustain pedal, from a MIDI keyboard. Kept apart from the note stream:
// most activities only care about keys, and the ones that judge how long a
// note is held (BeatFrame) read the pedal through `Sustain`.

import { toGameTime } from './gameClock'

export interface PedalEvent {
  down: boolean
  time: number // game clock milliseconds
  device?: string
}

type Listener = (e: PedalEvent) => void

const listeners = new Set<Listener>()
let down = false

export function subscribePedal(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** `time` is a performance.now() time. Repeats (pianos resend the value as the pedal moves) are dropped. */
export function emitPedal(isDown: boolean, time = performance.now(), device?: string): void {
  if (isDown === down) return
  down = isDown
  const e = { down, time: toGameTime(time), device }
  for (const l of listeners) l(e)
}

export const pedalDown = () => down
