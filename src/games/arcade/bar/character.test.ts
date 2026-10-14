import { describe, expect, it } from 'vitest'
import {
  bartenderLook,
  CUSTOMER_KINDS,
  JUGGLE_STREAK,
  juggleBottle,
  kindOf,
  MOOD_MS,
  nextMood,
  patienceOf,
  servedFx,
} from './character'

const at = (mood: Parameters<typeof nextMood>[1], since = 0) => ({ mood, since })

describe('bartender moods', () => {
  it('a weaker mood does not cut a stronger one short', () => {
    expect(nextMood(at('angry'), 'serve', 100)).toEqual(at('angry'))
    expect(nextMood(at('serve'), 'wrong', 100)).toEqual(at('wrong', 100))
    expect(nextMood(at('angry'), 'serve', MOOD_MS.angry + 1)).toEqual(at('serve', MOOD_MS.angry + 1))
  })

  it('winks and tosses a bottle when serving, slips on a wrong key', () => {
    const serve = bartenderLook(at('serve'), 0, 100)
    expect(serve.eyes).toBe('wink')
    expect(serve.toss).not.toBeNull()
    const wrong = bartenderLook(at('wrong'), 0, 200)
    expect(wrong.slip).not.toBeNull()
    expect(wrong.mouth).toBe('oops')
    expect(bartenderLook(at('wrong'), 0, MOOD_MS.wrong + 10).slip).toBeNull()
  })

  it('juggles from a streak and stops at a mistake', () => {
    expect(bartenderLook(at('idle'), JUGGLE_STREAK, 5000).juggling).toBe(true)
    expect(bartenderLook(at('idle'), JUGGLE_STREAK - 1, 5000).juggling).toBe(false)
    expect(bartenderLook(at('wrong', 4900), JUGGLE_STREAK, 5000).juggling).toBe(false)
  })

  it('reduced motion keeps faces but not movement', () => {
    const look = bartenderLook(at('wrong'), 0, 200, true)
    expect(look.mouth).toBe('oops')
    expect([look.dx, look.dy, look.tilt, look.slip]).toEqual([0, 0, 0, null])
  })

  it('juggled bottles stay near the hands and in the air', () => {
    for (let i = 0; i < 3; i++) {
      const b = juggleBottle(i, 1234)
      expect(b.h).toBeGreaterThanOrEqual(0)
      expect(b.h).toBeLessThanOrEqual(1)
    }
  })
})

describe('customers', () => {
  it('has six kinds, chosen by look', () => {
    expect(CUSTOMER_KINDS).toHaveLength(6)
    expect(kindOf(0)).toBe('cat')
    expect(kindOf(7)).toBe('frog')
  })

  it('loses patience along the counter', () => {
    expect([0.1, 0.6, 0.8, 0.95].map(patienceOf)).toEqual(['calm', 'tapping', 'watching', 'steaming'])
  })

  it('a served customer sips and then fades', () => {
    expect(servedFx(0).sip).toBe(0)
    expect(servedFx(0.4).sip).toBeGreaterThan(0.5)
    expect(servedFx(0.8).fade).toBe(0)
  })
})
