import { describe, expect, it } from 'vitest'
import { rhythmSkill } from '../games/arcade/skill'
import { parseNote } from '../music/notes'
import { UNITS } from '../progress/curriculum'
import { RHYTHM2_LESSONS, RHYTHM_LESSONS } from './lessons'
import { parsePattern, parseTune, rhythmPlan } from './plan'
import { VALUE_BEATS } from './rhythm'
import { BeatTrack } from './track'
import * as tunes from './tunes'

const C4 = parseNote('C4')

describe('rhythm plans', () => {
  it('checks that every bar of a pattern is full', () => {
    expect(parsePattern('q q h | w')).toEqual([['q', 'q', 'h'], ['w']])
    expect(() => parsePattern('q q h | q')).toThrow(/bar 2/)
    expect(parsePattern('q h | hd', 3)).toEqual([['q', 'h'], ['hd']])
  })

  it('reads a song: notes and rests', () => {
    const { bars, pitches } = parseTune(tunes.HOT_CROSS_BUNS_RESTS)
    expect(bars[0]).toEqual(['q', 'q', 'q', 'qr'])
    expect(pitches.slice(0, 4)).toEqual([parseNote('E4'), parseNote('D4'), C4, null])
  })

  it('repeats a pattern, doubles it for Yankı and sings a short song again', () => {
    const base = { beatsPerBar: 4, values: [] }
    expect(rhythmPlan({ ...base, bars: 3, pattern: 'q q h | w' }).bars).toEqual([
      ['q', 'q', 'h'],
      ['w'],
      ['q', 'q', 'h'],
    ])
    const echo = rhythmPlan({ ...base, bars: 2, pattern: 'q q h | w', echo: true })
    expect(echo.bars).toEqual([['q', 'q', 'h'], ['q', 'q', 'h'], ['w'], ['w']])
    expect(echo.listen).toEqual([true, false, true, false])
    const song = rhythmPlan({ ...base, bars: 8, tune: tunes.FRERE_JACQUES_OPENING })
    expect(song.bars).toHaveLength(8)
    expect(song.pitches).toHaveLength(32)
  })

  it('does not judge the bars the app plays in Yankı', () => {
    const plan = rhythmPlan({ beatsPerBar: 4, values: [], bars: 1, pattern: 'q q h', echo: true })
    const skill = rhythmSkill({ clef: 'treble', bars: plan.bars, notes: [C4], anyKey: true, listen: plan.listen })
    const t = new BeatTrack(skill, { bpm: 60, startAt: 0, hearts: 3 })
    expect(t.total).toBe(3)
    // Silence during the demo bar costs nothing; a press there is only stray.
    expect(t.update(3900)).toEqual([])
    expect(t.press(C4, 1000)[0].type).toBe('stray')
    for (const at of [4000, 5000, 6000]) expect(t.press(C4, at)[0].type).toBe('hit')
    t.update(9000)
    expect(t.done).toBe(true)
    expect(t.attempted).toHaveLength(3)
    expect(t.hearts).toBe(3)
  })

  it('has songs whose bars are all full', () => {
    for (const tune of Object.values(tunes)) {
      const meter = tune === tunes.BLUE_DANUBE || tune === tunes.MINUET ? 3 : 4
      expect(() => parseTune(tune, meter), tune.title).not.toThrow()
    }
  })

  it('builds every rhythm lesson, and songs play their own notes on a keyboard that holds them', () => {
    for (const lesson of [...RHYTHM_LESSONS, ...RHYTHM2_LESSONS]) {
      if (!lesson.rhythm) continue
      const plan = rhythmPlan(lesson.rhythm)
      for (const bar of plan.bars)
        expect(
          bar.reduce((n, v) => n + VALUE_BEATS[v], 0),
          lesson.id,
        ).toBe(lesson.rhythm.beatsPerBar)
      for (const p of plan.pitches ?? []) {
        if (p === null) continue
        expect(p, lesson.id).toBeGreaterThanOrEqual(lesson.keyboard.low)
        expect(p, lesson.id).toBeLessThanOrEqual(lesson.keyboard.high)
      }
      if (lesson.rhythm.guide) expect(lesson.rhythm.anyKey, lesson.id).toBe(false)
    }
  })

  it('keeps the ids of the first rhythm unit', () => {
    const ids = new Set(
      UNITS.filter((u) => u.id.startsWith('rhythm'))
        .flatMap((u) => u.lessons)
        .map((l) => l.id),
    )
    for (const id of [
      'rhythm-1',
      'rhythm-2',
      'rhythm-dino-1',
      'rhythm-3',
      'rhythm-4',
      'rhythm-drum-1',
      'rhythm-dino-2',
      'rhythm-5',
      'rhythm-drum-2',
      'rhythm-waltz',
      'rhythm-dino-waltz',
      'rhythm-dotted',
      'rhythm-drum-dotted',
    ])
      expect(ids.has(id), id).toBe(true)
  })
})
