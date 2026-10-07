// One stream of note events, whatever they come from: a MIDI keyboard,
// the on-screen keyboard or the computer keyboard.

export type InputSource = 'midi' | 'screen' | 'computer'

export interface NoteEvent {
  type: 'on' | 'off'
  midi: number
  velocity: number // 0..1
  source: InputSource
  time: number // performance.now() milliseconds
}

type Listener = (e: NoteEvent) => void

const listeners = new Set<Listener>()
const held = new Map<number, InputSource>()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emit(e: NoteEvent): void {
  if (e.type === 'on') held.set(e.midi, e.source)
  else held.delete(e.midi)
  for (const l of listeners) l(e)
}

export function noteOn(midi: number, source: InputSource, velocity = 0.8, time = performance.now()): void {
  emit({ type: 'on', midi, velocity, source, time })
}

export function noteOff(midi: number, source: InputSource, time = performance.now()): void {
  emit({ type: 'off', midi, velocity: 0, source, time })
}

export function heldNotes(): number[] {
  return [...held.keys()]
}
