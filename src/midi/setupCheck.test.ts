import { describe, expect, it } from 'vitest'
import { chordCheck, keyCount, platformOf, rangeText, reportMarkdown, touchCheck } from './setupCheck'

describe('setup checks', () => {
  it('counts the keys between the lowest and highest pressed', () => {
    expect(keyCount({ lowest: 21, highest: 108 })).toBe(88)
    expect(rangeText({ lowest: 21, highest: 108 }, 88).ok).toBe(true)
    const short = rangeText({ lowest: 24, highest: 108 }, 88)
    expect(short.ok).toBe(false)
    expect(short.text).toContain('85 tuş')
    expect(rangeText({ lowest: 48, highest: 72 }).text).toBe('Do3 – Do5: 25 tuş')
  })

  it('finds Do-Mi-Sol in any octave and measures the spread', () => {
    expect(
      chordCheck([
        { midi: 60, time: 0 },
        { midi: 64, time: 10 },
      ]).ok,
    ).toBe(false)
    expect(
      chordCheck([
        { midi: 48, time: 100 },
        { midi: 64, time: 130 },
        { midi: 67, time: 112 },
      ]),
    ).toEqual({ ok: true, spreadMs: 30 })
  })

  it('wants a soft and a loud press for touch', () => {
    expect(touchCheck([])).toBeNull()
    expect(touchCheck([0.5, 0.55])?.ok).toBe(false)
    expect(touchCheck([0.2, 0.9])).toEqual({ soft: 0.2, loud: 0.9, ok: true })
  })

  it('writes a report to paste into the chat', () => {
    const md = reportMarkdown({
      device: { name: 'Digital Piano', manufacturer: 'Yamaha Corporation', keyboard: 'Yamaha Clavinova CLP-845' },
      output: 'Digital Piano',
      range: { lowest: 21, highest: 108 },
      chord: { ok: true, spreadMs: 18 },
      touch: { soft: 0.2, loud: 0.95, ok: true },
      pedal: true,
      pianoSound: true,
      latencyMs: 12,
      platform: 'Windows, Chrome',
      date: '2026-10-21',
    })
    expect(md).toContain('Cihaz: Digital Piano (Yamaha Corporation)')
    expect(md).toContain('La0 – Do8 (88 tuş, MIDI 21–108)')
    expect(md).toContain('aralarında 18 ms')
    expect(md).toContain('Sustain pedalı: evet')
    expect(md).toContain('12 ms')
  })

  it('names the platform', () => {
    expect(platformOf('Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/140.0 Mobile')).toBe('Android, Chrome')
    expect(platformOf('Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Edg/140.0')).toBe('Windows, Edge')
  })
})
