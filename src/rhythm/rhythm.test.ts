import { describe, expect, it } from 'vitest'
import { dinoPose, jumpHeight, obstacleX, DINO_X } from '../games/arcade/dino/engine'
import { HIT_Y, lanesFor, noteY } from '../games/arcade/drum/engine'
import { rhythmSkill } from '../games/arcade/skill'
import { calibrate, correctedTime, offsetFromBeat } from './calibration'
import { generateBars, layoutRhythm, parseRhythm, rhythmBeats, VALUE_BEATS } from './rhythm'
import { summarizeRhythm } from './summary'
import { describeOffset, judge } from './timing'
import { BeatTrack } from './track'

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const C4 = 60
const E4 = 64
const G4 = 67

describe('timing', () => {
  it('judges offsets with the ±40 / ±90 ms windows', () => {
    expect(judge(0)).toBe('perfect')
    expect(judge(-40)).toBe('perfect')
    expect(judge(41)).toBe('good')
    expect(judge(-90)).toBe('good')
    expect(judge(-91)).toBe('early')
    expect(judge(150)).toBe('late')
  })

  it('describes offsets in Turkish', () => {
    expect(describeOffset(-23)).toBe('23 ms erken')
    expect(describeOffset(31.6)).toBe('32 ms geç')
    expect(describeOffset(2)).toBe('tam zamanında')
  })
})

describe('rhythm patterns', () => {
  it('parses and lays out bars on beats', () => {
    const bars = parseRhythm('q q h | e e q qr q')
    expect(bars).toEqual([
      ['q', 'q', 'h'],
      ['e', 'e', 'q', 'qr', 'q'],
    ])
    expect(layoutRhythm(bars).map((e) => e.beat)).toEqual([0, 1, 2, 4, 4.5, 5, 6, 7])
    expect(rhythmBeats(bars)).toBe(8)
  })

  it('generates full 4/4 bars with every value, paired eighths and halves on strong beats', () => {
    for (let seed = 1; seed < 30; seed++) {
      const bars = generateBars({ values: ['q', 'h', 'e', 'qr'], bars: 4, random: seeded(seed) })
      expect(bars).toHaveLength(4)
      for (const bar of bars) expect(bar.reduce((n, v) => n + VALUE_BEATS[v], 0)).toBe(4)
      const events = layoutRhythm(bars)
      expect(events[0].value).not.toBe('qr')
      events.forEach((e, i) => {
        if (e.value === 'h') expect(e.beat % 2).toBe(0)
        if (e.value === 'qr') expect(events[i - 1].value).not.toBe('qr')
        if (e.value === 'e' && e.beat % 1 === 0) expect(events[i + 1].value).toBe('e')
      })
      expect(new Set(bars.flat())).toEqual(new Set(['q', 'h', 'e', 'qr']))
    }
  })
})

describe('rhythmSkill', () => {
  it('gives every note and rest a beat; any key matches when asked', () => {
    const skill = rhythmSkill({ clef: 'treble', bars: parseRhythm('q qr h'), notes: [C4], anyKey: true })
    expect(skill.targets).toEqual([
      { midi: C4, beat: 0, value: 'q' },
      { midi: C4, beat: 1, value: 'qr' },
      { midi: C4, beat: 2, value: 'h' },
    ])
    expect(skill.matches(skill.targets[0], 71)).toBe(true)
  })

  it('assigns pitches to played notes when the pitch matters', () => {
    const skill = rhythmSkill({
      clef: 'treble',
      bars: parseRhythm('q q q q'),
      notes: [C4, E4, G4],
      random: seeded(4),
    })
    expect(skill.targets.every((t) => [C4, E4, G4].includes(t.midi))).toBe(true)
    expect(skill.matches(skill.targets[0], skill.targets[0].midi === C4 ? E4 : C4)).toBe(false)
  })
})

describe('BeatTrack', () => {
  // 120 bpm: a beat is 500 ms; beat 0 at t = 1000.
  const track = (text: string, hearts: number | null = null, notes = [C4], anyKey = true) =>
    new BeatTrack(rhythmSkill({ clef: 'treble', bars: parseRhythm(text), notes, anyKey, random: seeded(2) }), {
      bpm: 120,
      startAt: 1000,
      hearts,
    })

  it('judges presses against the nearest beat', () => {
    const t = track('q q q q')
    expect(t.press(C4, 1010)[0]).toMatchObject({ type: 'hit', judgement: 'perfect' })
    expect(t.press(C4, 1440)[0]).toMatchObject({ type: 'hit', judgement: 'good' })
    expect(t.press(C4, 2150)[0]).toMatchObject({ type: 'hit', judgement: 'late' })
    expect(t.press(C4, 2380)[0]).toMatchObject({ type: 'hit', judgement: 'early' })
    expect(t.done).toBe(true)
    expect(t.records.map((r) => r.offsetMs)).toEqual([10, -60, 150, -120])
  })

  it('misses notes nobody plays, once their window has passed', () => {
    const t = track('q q h', 3)
    t.press(C4, 1000)
    expect(t.update(1600)).toEqual([])
    const ev = t.update(1800)
    expect(ev[0]).toMatchObject({ type: 'miss' })
    expect(t.hearts).toBe(2)
    expect(t.combo).toBe(0)
    expect(t.bestCombo).toBe(1)
  })

  it('narrows the window between close eighth notes', () => {
    const t = track('e e q h')
    expect(t.windowOf(t.records[0])).toBe(125)
    expect(t.windowOf(t.records[3])).toBe(220)
    // 1200 is closer to the second eighth (1250) than to the first (1000).
    expect(t.press(C4, 1200)[0]).toMatchObject({ type: 'hit', record: t.records[1] })
  })

  it('keeps rests that stay silent and breaks the ones played into', () => {
    const t = track('q qr q qr', 5)
    t.press(C4, 1000)
    expect(t.update(2000)).toEqual([{ type: 'rest-kept', record: t.records[1] }])
    t.press(C4, 2000)
    expect(t.press(C4, 2600)[0]).toMatchObject({ type: 'miss', record: t.records[3] })
    expect(t.records[3].judgement).toBe('miss')
    expect(t.hearts).toBe(4)
    expect(t.done).toBe(true)
  })

  it('counts stray presses without costing a heart', () => {
    const t = track('h h', 3)
    expect(t.press(C4, 500)).toEqual([]) // count-in
    expect(t.press(C4, 1500)[0]).toEqual({ type: 'stray', midi: C4 })
    expect(t.stray).toBe(1)
    expect(t.hearts).toBe(3)
  })

  it('needs the right key when the pitch matters', () => {
    const t = track('q q q q', 3, [C4, E4, G4], false)
    const first = t.records[0]
    const wrong = first.target === C4 ? E4 : C4
    expect(t.press(wrong, 1000)[0]).toMatchObject({ type: 'wrong' })
    expect(t.hearts).toBe(3)
    expect(t.press(first.target, 1030)[0]).toMatchObject({ type: 'hit', judgement: 'perfect' })
    expect(first.wrongPresses).toEqual([wrong])
  })

  it('fails when the hearts run out', () => {
    const t = track('q q q q', 2)
    t.update(5000)
    expect(t.failed).toBe(true)
    expect(t.done).toBe(true)
    expect(t.attempted).toHaveLength(2)
  })

  it('reports the timing distribution, mean offset and success per rhythm value', () => {
    const t = track('q q e e qr | h h', null)
    t.press(C4, 1000) // perfect
    t.press(C4, 1560) // good, +60
    t.press(C4, 2020) // perfect, +20
    t.update(2400) // second eighth missed
    t.update(3000) // rest kept
    t.press(C4, 3130) // late, +130
    t.press(C4, 3500) // between the halves: stray
    t.press(C4, 3550) // stray
    t.update(5000) // last half missed
    const s = summarizeRhythm(t.attempted, { stray: t.stray, bestCombo: t.bestCombo, bpm: 120 })
    expect(s.total).toBe(7)
    expect(s.timing?.counts).toEqual({ perfect: 2, good: 1, early: 0, late: 1, miss: 2 })
    expect(s.timing?.meanOffsetMs).toBeCloseTo((0 + 60 + 20 + 130) / 4)
    expect(s.timing?.restsKept).toBe(1)
    expect(s.timing?.stray).toBe(2)
    expect(s.firstTry).toBe(4)
    const cat = Object.fromEntries(s.perCategory.map((c) => [c.id, c.accuracy]))
    expect(cat.quarter).toBeCloseTo((1 + 0.85) / 2)
    expect(cat.eighth).toBeCloseTo(0.5)
    expect(cat.rest).toBe(1)
    expect(cat.half).toBeCloseTo(0.2)
    expect(s.perNote).toEqual([])
    expect(s.message).toMatch(/ms geç/)
  })
})

describe('calibration', () => {
  it('finds the nearest beat of a tap', () => {
    expect(offsetFromBeat(1530, 1000, 500)).toEqual({ beat: 1, offsetMs: 30 })
    expect(offsetFromBeat(1980, 1000, 500)).toEqual({ beat: 2, offsetMs: -20 })
  })

  it('averages steady taps and ignores slips', () => {
    const r = calibrate([42, 38, 50, 45, 40, 47, 300, 44])!
    expect(r.used).toBe(7)
    expect(r.latencyMs).toBe(44)
    expect(r.ok).toBe(true)
  })

  it('rejects too few or too scattered taps', () => {
    expect(calibrate([])).toBeNull()
    expect(calibrate([40, 45])!.ok).toBe(false)
    expect(calibrate([-100, 100, -90, 90, -80, 80, 0, 10])!.ok).toBe(false)
  })

  it('corrects a press by its source delay', () => {
    expect(correctedTime(1000, 'midi', { midi: 35, screen: 10, computer: 0 })).toBe(965)
  })
})

describe('game geometry', () => {
  it('obstacles reach the dino on their beat', () => {
    expect(obstacleX(1500, 1500, 500)).toBeCloseTo(DINO_X)
    expect(obstacleX(3500, 1500, 500)).toBeCloseTo(1)
    expect(jumpHeight(200, 400)).toBeCloseTo(1)
    expect(jumpHeight(500, 400)).toBe(0)
  })

  it('the dino jumps on hits and stumbles on misses', () => {
    const t = new BeatTrack(rhythmSkill({ clef: 'treble', bars: parseRhythm('q q h'), notes: [C4], anyKey: true }), {
      bpm: 120,
      startAt: 1000,
    })
    t.press(C4, 1000)
    expect(dinoPose(t, 1180).height).toBeGreaterThan(0.9)
    t.update(1800)
    expect(dinoPose(t, 1850)).toMatchObject({ stumbling: true, hitObstacle: t.records[1] })
  })

  it('drum notes land on the pads on their beat', () => {
    expect(noteY(2000, 2000, 500)).toBeCloseTo(HIT_Y)
    expect(noteY(3500, 2000, 500)).toBeCloseTo(0)
    const t = new BeatTrack(
      rhythmSkill({ clef: 'treble', bars: parseRhythm('q q q q'), notes: [G4, C4, E4], random: seeded(1) }),
      { bpm: 120, startAt: 0 },
    )
    expect(lanesFor(t, false).every((m, i, a) => i === 0 || a[i - 1] < m)).toBe(true)
    expect(lanesFor(t, true)).toHaveLength(1)
  })
})
