import { describe, expect, it } from 'vitest'
import { keyCodeToMidi } from './computerKeyboard'

describe('keyCodeToMidi', () => {
  it('maps the home row to white keys from C', () => {
    expect(['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'].map((c) => keyCodeToMidi(c, 60))).toEqual([
      60, 62, 64, 65, 67, 69, 71, 72,
    ])
    expect(keyCodeToMidi('KeyW', 60)).toBe(61)
    expect(keyCodeToMidi('KeyQ', 60)).toBeNull()
  })
})
