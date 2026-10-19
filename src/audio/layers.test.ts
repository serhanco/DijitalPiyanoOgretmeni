import { describe, expect, it } from 'vitest'
import { bassOf, LAYER_AT, layerNotes } from './layers'

describe('Ses katmanları', () => {
  it('puts the bass below G3, on the same note name', () => {
    expect(bassOf(60)).toBe(48)
    expect(bassOf(72)).toBe(48)
    expect(bassOf(67)).toBe(43)
    expect(bassOf(50)).toBe(38)
  })

  it('adds a layer as the run grows', () => {
    expect(layerNotes(64, LAYER_AT.bass - 1)).toEqual([])
    expect(layerNotes(64, LAYER_AT.bass).map((n) => n.midi)).toEqual([52])
    expect(layerNotes(64, LAYER_AT.fifth).map((n) => n.midi)).toEqual([52, 59])
    expect(layerNotes(64, LAYER_AT.shimmer).map((n) => n.midi)).toEqual([52, 59, 76])
  })
})
