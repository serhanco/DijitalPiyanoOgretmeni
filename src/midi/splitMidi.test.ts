import { describe, expect, it } from 'vitest'
import { splitMidi } from './splitMidi'

describe('splitMidi', () => {
  it('splits a buffer holding several messages', () => {
    expect(splitMidi([0x90, 60, 100, 0x80, 60, 0, 0xb0, 64, 127])).toEqual([
      [0x90, 60, 100],
      [0x80, 60, 0],
      [0xb0, 64, 127],
    ])
  })

  it('expands running status, also across buffers', () => {
    const running = { status: 0 }
    expect(splitMidi([0x90, 60, 100, 64, 90], running)).toEqual([
      [0x90, 60, 100],
      [0x90, 64, 90],
    ])
    expect(splitMidi([67, 0], running)).toEqual([[0x90, 67, 0]])
  })

  it('keeps real-time bytes apart and skips system exclusive', () => {
    expect(splitMidi([0xfe, 0xf0, 1, 2, 3, 0xf7, 0xc0, 5, 0x90, 60, 0xf8, 1])).toEqual([
      [0xfe],
      [0xc0, 5],
      [0xf8],
      [0x90, 60, 1],
    ])
  })
})
