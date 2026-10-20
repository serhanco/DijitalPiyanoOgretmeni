// Sending notes to the piano: the app's own example notes (Yankı, memory and
// ear games, theory cards) can sound from a digital piano's speakers instead of
// the app's sampled piano. Only outputs that belong to a connected keyboard
// with its own sound are used; virtual synths and silent controllers never are.

import { useSettings } from '../state/settings'
import { keyboardFor } from './keyboards'

export interface PortInfo {
  id: string
  name: string
  manufacturer: string
}

const VIRTUAL = /through|thru|wavetable|iac|loopmidi|virtual/i

/** "MIDIOUT2 (Digital Piano)" → "digital piano", "MPK mini 3 MIDI 1" → "mpk mini 3". */
export function portKey(name: string): string {
  const inner = /\(([^)]+)\)\s*$/.exec(name)?.[1] ?? name
  return inner
    .toLowerCase()
    .replace(/\b(midi|in|out|port)\s*\d*\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The output that sounds on one of the connected keyboards, or null. */
export function pickOutput(inputs: PortInfo[], outputs: PortInfo[]): PortInfo | null {
  const sounding = inputs.filter((i) => keyboardFor(i.name, i.manufacturer)?.makesSound !== false)
  const keys = new Set(sounding.map((i) => portKey(i.name)))
  return (
    outputs.find(
      (o) =>
        !VIRTUAL.test(o.name) && keyboardFor(o.name, o.manufacturer)?.makesSound !== false && keys.has(portKey(o.name)),
    ) ?? null
  )
}

interface Sender {
  send(data: number[], timestamp?: number): void
}

let output: Sender | null = null
const sounding = new Set<number>()
/** When each note was last sent (performance.now() time), to spot a piano that echoes them back. */
const sentAt = new Map<number, number>()
export const ECHO_MS = 40

export function setPianoOutput(o: Sender | null): void {
  if (output && output !== o) allNotesOff()
  output = o
}

/** The piano to play example notes on, when there is one and the setting allows it. */
export function pianoOutput(): Sender | null {
  return output && useSettings.getState().demoOnPiano ? output : null
}

const velocityByte = (v: number) => Math.max(1, Math.min(127, Math.round(v * 127)))

/** `at` is a performance.now() time; omitted means now. */
export function outNoteOn(midi: number, velocity = 0.8, at?: number): boolean {
  const o = pianoOutput()
  if (!o) return false
  o.send([0x90, midi, velocityByte(velocity)], at)
  sounding.add(midi)
  sentAt.set(midi, at ?? performance.now())
  return true
}

/**
 * True for a note-on that is the piano sending back a note the app just played
 * on it (some instruments pass received notes through), not the learner's key.
 */
export function isEcho(midi: number, time: number): boolean {
  const sent = sentAt.get(midi)
  return sent !== undefined && Math.abs(time - sent) < ECHO_MS
}

export function outNoteOff(midi: number, at?: number): void {
  if (!output || !sounding.has(midi)) return
  output.send([0x80, midi, 0], at)
  if (at === undefined) sounding.delete(midi)
}

export function allNotesOff(): void {
  if (!output) return
  for (const midi of sounding) output.send([0x80, midi, 0])
  sounding.clear()
}
