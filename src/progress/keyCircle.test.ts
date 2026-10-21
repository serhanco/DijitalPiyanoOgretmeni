import { describe, expect, it } from 'vitest'
import { KEY_UNITS } from './curriculum'
import { keyCircle } from './keyCircle'

describe('keyCircle', () => {
  it('fills the major key from its lessons and the minor key from the minor lessons', () => {
    const c = KEY_UNITS[0].lessons
    const stars = (id: string) => (id === 'key-c-minor' ? 3 : id === 'key-c-scale' ? 2 : 0)
    const [first, second] = keyCircle(stars)
    expect(first).toMatchObject({ unit: 'key-c', major: 'Do', minor: 'la', boss: false })
    expect(first.minorShare).toBeCloseTo(0.5) // one of the two minor lessons, three stars
    expect(first.majorShare).toBeCloseTo(2 / ((c.length - 3) * 3))
    expect(second).toMatchObject({ major: 'Sol', minor: 'mi', majorShare: 0, open: false })
  })

  it('marks a beaten boss', () => {
    expect(keyCircle((id) => (id === 'boss-key-fs' ? 1 : 0))[11]).toMatchObject({
      major: 'Fa#',
      minor: 're#',
      boss: true,
    })
  })
})
