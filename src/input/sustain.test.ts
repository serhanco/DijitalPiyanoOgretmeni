import { describe, expect, it } from 'vitest'
import { Sustain } from './sustain'

describe('Sustain', () => {
  it('passes releases through while the pedal is up', () => {
    const s = new Sustain()
    expect(s.off(60, 100)).toEqual({ midi: 60, time: 100 })
    expect(s.on(60, 200)).toBeNull()
  })

  it('holds released keys until the pedal comes up', () => {
    const s = new Sustain()
    expect(s.pedal(true, 50)).toEqual([])
    expect(s.off(60, 100)).toBeNull()
    expect(s.off(64, 120)).toBeNull()
    expect(s.held).toEqual([60, 64])
    expect(s.pedal(false, 400)).toEqual([
      { midi: 60, time: 400 },
      { midi: 64, time: 400 },
    ])
    expect(s.held).toEqual([])
  })

  it('ends a held note when its key is struck again', () => {
    const s = new Sustain()
    s.pedal(true, 0)
    s.off(60, 100)
    expect(s.on(60, 300)).toEqual({ midi: 60, time: 300 })
    // The new note is held by its key now; lifting the pedal does not end it.
    expect(s.pedal(false, 350)).toEqual([])
  })
})
