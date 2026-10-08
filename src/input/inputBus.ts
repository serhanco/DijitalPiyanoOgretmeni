// One stream of note events, whatever they come from: a MIDI keyboard,
// the on-screen keyboard or the computer keyboard.

import { isPaused, toGameTime } from './gameClock'

export type InputSource = 'midi' | 'screen' | 'computer'

export interface NoteEvent {
  type: 'on' | 'off'
  midi: number
  velocity: number // 0..1
  source: InputSource
  time: number // game clock milliseconds (gameClock.ts)
  /** MIDI only: the name of the keyboard's port. */
  device?: string
}

type Listener = (e: NoteEvent) => void

const listeners = new Set<Listener>()
const held = new Map<number, InputSource>()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** `time` is a performance.now() time; listeners get it on the game clock. Keys pressed while paused are dropped. */
export function emit(raw: NoteEvent): void {
  if (raw.type === 'on' && isPaused()) return
  const e = { ...raw, time: toGameTime(raw.time) }
  if (e.type === 'on') held.set(e.midi, e.source)
  else held.delete(e.midi)
  for (const l of listeners) l(e)
}

export function noteOn(
  midi: number,
  source: InputSource,
  velocity = 0.8,
  time = performance.now(),
  device?: string,
): void {
  emit({ type: 'on', midi, velocity, source, time, device })
}

export function noteOff(midi: number, source: InputSource, time = performance.now(), device?: string): void {
  emit({ type: 'off', midi, velocity: 0, source, time, device })
}

export function heldNotes(): number[] {
  return [...held.keys()]
}
