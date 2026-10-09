import { describe, expect, it } from 'vitest'
import { birdPose, burst, nextReaction, REACTION_MS, stepParticles } from './character'

const at = (reaction: Parameters<typeof nextReaction>[1], since = 0) => ({ reaction, since })

describe('bird reactions', () => {
  it('a weaker reaction does not cut a stronger one short', () => {
    expect(nextReaction(at('crash'), 'flap', 100)).toEqual(at('crash'))
    expect(nextReaction(at('pass'), 'flap', 100)).toEqual(at('pass'))
    expect(nextReaction(at('flap'), 'crash', 100)).toEqual(at('crash', 100))
  })

  it('anything replaces a finished reaction', () => {
    expect(nextReaction(at('crash'), 'flap', REACTION_MS.crash + 1)).toEqual(at('flap', REACTION_MS.crash + 1))
  })

  it('shows a face per reaction and goes back to normal afterwards', () => {
    expect(birdPose(at('pass'), 200).eyes).toBe('happy')
    expect(birdPose(at('pass'), 200).mouth).toBe('open')
    expect(birdPose(at('crash'), 300).eyes).toBe('dizzy')
    expect(birdPose(at('crash'), 300).stars).toBe(1)
    expect(birdPose(at('oops'), 100).eyes).toBe('wide')
    expect(birdPose(at('oops'), 100).sweat).toBeGreaterThan(0)
    const after = birdPose(at('crash'), REACTION_MS.crash + 500)
    expect(after.eyes).toBe('open')
    expect(after.stars).toBe(0)
  })

  it('squashes on a crash and hops up on a pass', () => {
    const hit = birdPose(at('crash'), 70)
    expect(hit.scaleX).toBeGreaterThan(1)
    expect(hit.scaleY).toBeLessThan(1)
    expect(birdPose(at('pass'), REACTION_MS.pass / 2).dy).toBeLessThan(-0.2)
  })

  it('reduced motion keeps the faces but not the movement', () => {
    const pose = birdPose(at('crash'), 70, true)
    expect(pose.eyes).toBe('dizzy')
    expect([pose.dx, pose.dy, pose.tilt, pose.scaleX, pose.scaleY]).toEqual([0, 0, 0, 1, 1])
  })
})

describe('bird particles', () => {
  it('sparkles and a note on a pass, feathers on a crash, nothing on a flap', () => {
    expect(burst('pass').map((p) => p.kind)).toEqual(['sparkle', 'sparkle', 'sparkle', 'sparkle', 'sparkle', 'note'])
    expect(burst('crash').every((p) => p.kind === 'feather')).toBe(true)
    expect(burst('flap')).toEqual([])
  })

  it('particles move and disappear when their life is over', () => {
    let ps = burst('crash', () => 0.5)
    const moved = stepParticles(ps, 100)
    expect(moved[0].x).not.toBe(ps[0].x)
    for (let i = 0; i < 20; i++) ps = stepParticles(ps, 100)
    expect(ps).toEqual([])
  })
})
