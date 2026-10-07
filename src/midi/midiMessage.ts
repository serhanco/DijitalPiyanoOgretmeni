export interface ParsedMidiMessage {
  type: 'on' | 'off'
  channel: number
  midi: number
  velocity: number // 0..1
}

/**
 * Decode a raw MIDI message into a note event. Returns null for anything
 * that is not a note message. A note-on with velocity 0 is a note-off.
 */
export function parseMidiMessage(data: ArrayLike<number>): ParsedMidiMessage | null {
  if (data.length < 3) return null
  const status = data[0] & 0xf0
  const channel = data[0] & 0x0f
  const midi = data[1] & 0x7f
  const rawVelocity = data[2] & 0x7f
  if (status === 0x90 && rawVelocity > 0) {
    return { type: 'on', channel, midi, velocity: rawVelocity / 127 }
  }
  if (status === 0x80 || (status === 0x90 && rawVelocity === 0)) {
    return { type: 'off', channel, midi, velocity: 0 }
  }
  return null
}
