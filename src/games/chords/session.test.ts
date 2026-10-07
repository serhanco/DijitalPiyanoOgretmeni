import { describe, expect, it } from 'vitest'
import { chordTarget, progression } from '../../music/chords'
import { parseNote } from '../../music/notes'
import { BeatTrack } from '../../rhythm/track'
import { ladderReport } from '../scales/steps'
import { arpeggioSteps, arpeggioTitle, surfPartBeats, surfPlan } from './arpeggio'
import { CHORD_LESSONS, chordSequence } from './lessons'
import { summarizeChords } from './report'
import { CHORD_WINDOW_MS, ChordListener, ChordSession, matchChord } from './session'

const C = chordTarget('C', 'major')
const press = (s: ChordSession, notes: string[], start: number, gap = 20) =>
  notes.flatMap((n, i) => s.press(parseNote(n), start + i * gap))

describe('ChordListener', () => {
  it('keeps held keys and keys released within the window', () => {
    const l = new ChordListener()
    l.press(60, 0)
    l.release(60)
    l.press(64, 100)
    expect(l.active(100).map((p) => p.midi)).toEqual([60, 64])
    expect(l.active(CHORD_WINDOW_MS + 1).map((p) => p.midi)).toEqual([64])
  })

  it('reports an attempt given up once every key is gone', () => {
    const l = new ChordListener()
    l.press(60, 0)
    l.release(60)
    expect(l.abandoned(100)).toBe(false)
    expect(l.abandoned(CHORD_WINDOW_MS + 10)).toBe(true)
    expect(l.abandoned(CHORD_WINDOW_MS + 20)).toBe(false)
  })
})

describe('matchChord', () => {
  const at = (...ns: string[]) => ns.map((n, i) => ({ midi: parseNote(n), at: i * 10 }))

  it('needs the written keys in exact mode', () => {
    expect(matchChord(C, at('C4', 'E4'), 'exact').state).toBe('partial')
    expect(matchChord(C, at('C4', 'E4', 'G4'), 'exact')).toEqual({ state: 'complete', spreadMs: 20, lastVoice: 2 })
    expect(matchChord(C, at('C4', 'E4', 'G5'), 'exact')).toEqual({
      state: 'wrong',
      midi: parseNote('G5'),
      octave: true,
    })
    expect(matchChord(C, at('C4', 'F4'), 'exact')).toMatchObject({ state: 'wrong', octave: false })
  })

  it('accepts any octave in voicing mode but checks the bottom note', () => {
    expect(matchChord(C, at('C3', 'E3', 'G3'), 'voicing').state).toBe('complete')
    expect(matchChord(C, at('E3', 'G3', 'C4'), 'voicing')).toEqual({ state: 'inversion', bottom: parseNote('E3') })
    expect(matchChord(C, at('E3', 'G3', 'C4'), 'pcs').state).toBe('complete')
    // Ignoring the octave keeps the inversion.
    expect(matchChord(C, at('E5', 'G5', 'C6'), 'exact', true).state).toBe('inversion')
  })
})

describe('ChordSession', () => {
  it('judges a chord when every note is down, with the spread', () => {
    const s = new ChordSession({ chords: [C, chordTarget('F', 'major', 2)], mode: 'exact' })
    s.markShown(0)
    expect(press(s, ['C4', 'E4'], 100).map((e) => e.type)).toEqual(['partial', 'partial'])
    const [ev] = s.press(parseNote('G4'), 160)
    expect(ev).toMatchObject({ type: 'chord', together: true })
    expect(s.records[0]).toMatchObject({ answeredAt: 160, spreadMs: 60, lastVoice: 2 })
    expect(s.position).toBe(1)
  })

  it('counts a spread-out chord as right but not together', () => {
    const s = new ChordSession({ chords: [C], mode: 'exact' })
    s.markShown(0)
    press(s, ['G4', 'E4', 'C4'], 0, 120)
    expect(s.records[0].spreadMs).toBe(240)
    expect(s.done).toBe(true)
    const summary = summarizeChords(s.records)
    expect(summary.accuracy).toBe(1)
    expect(summary.chords).toMatchObject({ played: 1, together: 0 })
  })

  it('costs a heart for a wrong key and lets the chord be finished', () => {
    const s = new ChordSession({ chords: [C], mode: 'exact', hearts: 3 })
    s.markShown(0)
    s.press(parseNote('C4'), 0)
    const [wrong] = s.press(parseNote('F4'), 10)
    expect(wrong).toMatchObject({ type: 'wrong', midi: parseNote('F4') })
    expect(s.heartsLeft).toBe(2)
    press(s, ['E4', 'G4'], 30)
    expect(s.records[0].answeredAt).toBe(50)
    expect(summarizeChords(s.records).accuracy).toBe(0)
  })

  it('names a wrong inversion and starts the chord over', () => {
    const s = new ChordSession({ chords: [C], mode: 'voicing', hearts: 3 })
    s.markShown(0)
    const events = press(s, ['E4', 'G4', 'C5'], 0)
    expect(events[2]).toMatchObject({ type: 'inversion', bottom: parseNote('E4') })
    expect(s.heartsLeft).toBe(2)
    expect(s.playing(100)).toEqual([])
    press(s, ['C5', 'E5', 'G5'], 500)
    expect(s.done).toBe(true)
  })

  it('records a chord given up halfway, without a heart', () => {
    const s = new ChordSession({ chords: [C], mode: 'exact', hearts: 3 })
    s.markShown(0)
    s.press(parseNote('C4'), 0)
    s.release(parseNote('C4'))
    expect(s.update(100)).toEqual([])
    expect(s.update(CHORD_WINDOW_MS + 10)).toMatchObject([{ type: 'incomplete' }])
    expect(s.heartsLeft).toBe(3)
    expect(s.records[0].incomplete).toBe(1)
  })

  it('ends when the hearts run out', () => {
    const s = new ChordSession({ chords: [C, C], mode: 'exact', hearts: 2 })
    s.markShown(0)
    s.press(parseNote('D4'), 0)
    s.press(parseNote('F4'), 10)
    expect(s.failed).toBe(true)
    expect(s.done).toBe(true)
  })
})

describe('chord report', () => {
  it('reports per family, inversion, degree, together, the late note and the weakest chords', () => {
    const chords = progression('C', ['I', 'IV', 'V', 'I'], { hands: 'both' })
    const s = new ChordSession({ chords, mode: 'exact' })
    chords.forEach((c, i) => {
      s.markShown(i * 1000)
      // The bass comes 150 ms late on every chord but the last; the second chord first gets a wrong key.
      if (i === 1) s.press(parseNote('D4'), i * 1000)
      const late = i < 3 ? 150 : 10
      c.notes.slice(1).forEach((n, k) => s.press(n.midi, i * 1000 + 100 + k * 5))
      s.press(c.notes[0].midi, i * 1000 + 100 + late)
    })
    const summary = summarizeChords(s.records)
    expect(summary.firstTry).toBe(3)
    const labels = summary.perCategory.map((c) => c.label)
    expect(labels).toContain('Majör akorlar')
    expect(labels).toContain('2. çevrim')
    expect(labels).toContain('IV (Fa Majör)')
    expect(summary.perCategory.find((c) => c.id === 'together')).toMatchObject({ shown: 4, firstTry: 1 })
    expect(summary.chords?.lateVoice).toBe('bass')
    expect(summary.chords?.weakest[0].name).toBe('Fa Majör · 2. çevrim')
  })
})

describe('chord lessons', () => {
  it('draws chords at random without the same chord twice in a row', () => {
    const lesson = CHORD_LESSONS[0]
    const seq = chordSequence(lesson.chords!, () => 0.1)
    expect(seq).toHaveLength(12)
    let r = 0
    const varied = chordSequence(lesson.chords!, () => [0.1, 0.1, 0.5, 0.9][r++ % 4])
    varied.slice(1).forEach((c, i) => expect(c.notes[0].midi).not.toBe(varied[i].notes[0].midi))
  })

  it('plays progressions in order and keeps every chord on the keyboard', () => {
    for (const lesson of CHORD_LESSONS) {
      const notes = (lesson.chords?.chords ?? []).flatMap((c) => c.notes.map((n) => n.midi))
      for (const m of notes) {
        expect(m).toBeGreaterThanOrEqual(lesson.keyboard.low)
        expect(m).toBeLessThanOrEqual(lesson.keyboard.high)
      }
    }
    const p = CHORD_LESSONS.find((l) => l.id === 'progression-1')!
    expect(chordSequence(p.chords!).map((c) => c.numeral)).toEqual(['I', 'IV', 'V', 'I', 'I', 'IV', 'V', 'I'])
  })
})

describe('arpeggio steps and Arpej Sörfü', () => {
  it('turns arpeggios into fingered steps, both hands on the same step', () => {
    const steps = arpeggioSteps([{ root: 'A', quality: 'minor', hands: 'parallel' }])
    expect(steps).toHaveLength(7)
    expect(steps[0].notes.map((n) => [n.midi, n.clef, n.finger])).toEqual([
      [parseNote('A4'), 'treble', 1],
      [parseNote('A2'), 'bass', 5],
    ])
    expect(arpeggioTitle({ root: 'C', quality: 'major', hands: 'right', octaves: 2 })).toBe(
      'Do Majör arpej · sağ el · 2 oktav',
    )
  })

  it('plans one note per beat in 3/4, the top note of the way back held', () => {
    const parts = [
      { root: 'C', quality: 'major' as const, hands: 'right' as const },
      { root: 'G', quality: 'major' as const, hands: 'right' as const, octaves: 2 as const },
    ]
    const plan = surfPlan(parts)
    expect(surfPartBeats(parts[0])).toBe(9)
    expect(plan.bars.flat().length).toBe(3 * 2 + 1 + 3 * 4 + 1)
    expect(plan.skill.targets[6]).toMatchObject({ beat: 6, value: 'hd' })
    expect(plan.skill.targets[7]).toMatchObject({ midi: parseNote('G3'), beat: 9, value: 'q' })
  })

  it('reports evenness from the time between played notes', () => {
    const plan = surfPlan([{ root: 'C', quality: 'major', hands: 'right' }])
    const track = new BeatTrack(plan.skill, { bpm: 60, startAt: 0 })
    // Every note 0 ms off, one note 60 ms late.
    track.records.forEach((r, i) => track.press(r.target, r.dueAt + (i === 3 ? 60 : 0)))
    const report = ladderReport([track.records], plan.meta, ['Do Majör arpej'])
    expect(report.scale.evenness).toBeGreaterThan(0.9)
    expect(report.scale.evenness).toBeLessThan(1)
    expect(report.perCategory.map((c) => c.label)).toContain('Eşit aralık')
  })
})
