import { describe, expect, it } from 'vitest'
import { parseMidiMessage } from './midiMessage'

describe('parseMidiMessage', () => {
  it('reads note-on on any channel', () => {
    expect(parseMidiMessage([0x90, 60, 127])).toEqual({ type: 'on', channel: 0, midi: 60, velocity: 1 })
    expect(parseMidiMessage([0x93, 64, 64])?.channel).toBe(3)
  })

  it('treats note-on with velocity 0 as note-off', () => {
    expect(parseMidiMessage([0x90, 60, 0])?.type).toBe('off')
    expect(parseMidiMessage([0x80, 60, 40])?.type).toBe('off')
  })

  it('ignores other messages', () => {
    expect(parseMidiMessage([0xb0, 64, 127])).toBeNull() // sustain pedal
    expect(parseMidiMessage([0xfe])).toBeNull() // active sensing
  })
})
