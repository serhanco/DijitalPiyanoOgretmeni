import { describe, expect, it } from 'vitest'
import { danger, FALL_S, standX, startChute, stepChute, sway } from './rescue'

describe('balloon rescue', () => {
  it('a parachute falls and lands on the grass', () => {
    let c = startChute(3, 0.5, 0.3, 0xff0000)
    for (let i = 0; i < 400 && !c.landed; i++) c = stepChute(c, 0.05, 0.93)
    expect(c.landed).toBe(true)
    expect(c.y).toBe(0.93)
    expect(c.age).toBeLessThan(FALL_S + 0.5)
    expect(stepChute(c, 1, 0.93)).toBe(c)
  })

  it('sways within bounds', () => {
    for (const a of [0, 0.4, 1.7, 9]) expect(Math.abs(sway(a))).toBeLessThanOrEqual(0.35)
  })

  it('danger only near the top', () => {
    expect(danger(0.6)).toBe(0)
    expect(danger(0.15)).toBeCloseTo(0.5)
    expect(danger(-0.1)).toBe(1)
  })

  it('rescued passengers stand in a row that never leaves the screen', () => {
    for (let n = 0; n < 40; n++) {
      const x = standX(n, 40)
      expect(x).toBeGreaterThanOrEqual(0.05)
      expect(x).toBeLessThan(0.95)
    }
  })
})
