import { describe, expect, it } from 'vitest'
import { parseRhythm } from '../../../rhythm/rhythm'
import { BeatTrack } from '../../../rhythm/track'
import { rhythmSkill } from '../skill'
import { cactusFace, DINO_REACTION_MS, dinoFeeling, dinoLook, dustAge, outfitLevel } from './character'

const track = () =>
  new BeatTrack(rhythmSkill({ clef: 'treble', bars: parseRhythm('q q q q'), notes: [60], anyKey: true }), {
    bpm: 60,
    startAt: 0,
    hearts: null,
  })

describe('dino feelings', () => {
  it('runs when nothing happened', () => {
    expect(dinoFeeling(track(), 500).reaction).toBe('run')
  })

  it('a perfect hit feels perfect and wears off', () => {
    const t = track()
    t.press(60, 1000)
    expect(dinoFeeling(t, 1100).reaction).toBe('perfect')
    expect(dinoFeeling(t, 1000 + DINO_REACTION_MS.perfect + 1).reaction).toBe('run')
  })

  it('a hit off the beat feels off', () => {
    const t = track()
    t.press(60, 1075)
    expect(dinoFeeling(t, 1100).reaction).toBe('good')
    const u = track()
    u.press(60, 1200)
    expect(dinoFeeling(u, 1250).reaction).toBe('off')
  })

  it('a missed note makes it stumble', () => {
    const t = track()
    t.update(1500)
    expect(dinoFeeling(t, 1600).reaction).toBe('stumble')
  })
})

describe('dino look', () => {
  it('turns a full circle on a perfect jump', () => {
    expect(dinoLook({ reaction: 'perfect', t: 420 }, 0).spin).toBeCloseTo(-Math.PI * 2)
    expect(dinoLook({ reaction: 'perfect', t: 100 }, 0).eyes).toBe('happy')
  })

  it('gets dizzy with stars on a stumble', () => {
    const look = dinoLook({ reaction: 'stumble', t: 300 }, 0)
    expect(look.eyes).toBe('dizzy')
    expect(look.stars).toBe(1)
  })

  it('reduced motion keeps the face but not the spin or squash', () => {
    const look = dinoLook({ reaction: 'stumble', t: 100 }, 0, true)
    expect(look.eyes).toBe('dizzy')
    expect([look.spin, look.scaleX, look.scaleY]).toEqual([0, 1, 1])
  })
})

describe('dino extras', () => {
  it('dresses up with the combo', () => {
    expect([0, 4, 5, 10, 19, 20, 50].map(outfitLevel)).toEqual([0, 0, 1, 2, 2, 3, 3])
  })

  it('cactus faces follow the judgement and distance', () => {
    expect(cactusFace(null, 3)).toBe('calm')
    expect(cactusFace(null, 0.3)).toBe('squint')
    expect(cactusFace('perfect', -0.2)).toBe('happy')
    expect(cactusFace('miss', -0.2)).toBe('ouch')
  })

  it('dust age stays within 0..1', () => {
    for (const b of [-1.3, 0, 0.2, 0.49, 7.9]) expect(dustAge(b)).toBeGreaterThanOrEqual(0)
    expect(dustAge(0.25)).toBeCloseTo(0.5)
  })
})
