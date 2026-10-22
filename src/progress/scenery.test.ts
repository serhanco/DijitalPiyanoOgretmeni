import { describe, expect, it } from 'vitest'
import { KEYS } from '../games/keys/units'
import { UNITS } from './curriculum'
import { keySign, propSide, sceneOf, unitToCelebrate } from './scenery'

describe('sceneOf', () => {
  it('gives every unit before the keys its own scene', () => {
    const early = UNITS.filter((u) => !u.id.startsWith('key-')).map((u) => sceneOf(u.id).id)
    expect(new Set(early).size).toBe(early.length)
  })

  it('changes the balloon journey every three keys', () => {
    const lands = KEYS.map((_, i) => sceneOf(`key-${KEYS[i].id}`, i).id)
    expect(lands).toEqual([
      ...Array(3).fill('village'),
      ...Array(3).fill('forest'),
      ...Array(3).fill('peak'),
      ...Array(3).fill('snow'),
    ])
  })
})

describe('propSide', () => {
  it('stands away from the node', () => {
    expect(propSide(56, 0)).toBe('left')
    expect(propSide(-84, 1)).toBe('right')
    expect([propSide(0, 0), propSide(0, 1)]).toEqual(['right', 'left'])
  })
})

describe('keySign', () => {
  it('counts the sharps or flats of each key', () => {
    expect(KEYS.map((k) => keySign(k.major))).toEqual([
      '♮',
      '1♯',
      '1♭',
      '2♯',
      '2♭',
      '3♯',
      '3♭',
      '4♯',
      '4♭',
      '5♯',
      '5♭',
      '6♯',
    ])
  })
})

describe('unitToCelebrate', () => {
  it('celebrates a unit once, when its last lesson is played', () => {
    expect(unitToCelebrate('treble', ['basics', 'treble'], ['basics'])).toEqual({
      celebrate: 'treble',
      seen: ['basics', 'treble'],
    })
    expect(unitToCelebrate('treble', ['basics', 'treble'], ['basics', 'treble']).celebrate).toBeUndefined()
    expect(unitToCelebrate('rhythm', ['basics'], ['basics']).celebrate).toBeUndefined()
  })

  it('never celebrates old progress', () => {
    expect(unitToCelebrate('treble', ['basics', 'treble'], null)).toEqual({ seen: ['basics', 'treble'] })
  })
})
