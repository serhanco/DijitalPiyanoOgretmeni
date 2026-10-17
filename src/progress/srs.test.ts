import { describe, expect, it } from 'vitest'
import { summarizeChords } from '../games/chords/report'
import type { ChordRecord } from '../games/chords/session'
import { CHORD_LESSONS } from '../games/chords/lessons'
import { TREBLE_LESSONS } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { SCALE_LESSONS } from '../games/scales/lessons'
import { chordTarget } from '../music/chords'
import { adaptsTempo, nextPace, nextTempo, paceText } from './adaptive'
import { buildMix, MIX_LESSON_ID, mixReport, stretchNotes } from './mix'
import {
  addDays,
  applyResults,
  type Card,
  cardResults,
  chordKey,
  countsText,
  daysBetween,
  dueCounts,
  nextBox,
  noteKey,
  scaleKey,
} from './srs'

const TODAY = '2026-10-17'

const summary = (o: Partial<SessionSummary> = {}): SessionSummary => ({
  failed: false,
  total: 10,
  firstTry: 9,
  accuracy: 0.9,
  avgReactionMs: 1000,
  totalMistakes: 1,
  stars: 3,
  perNote: [],
  perCategory: [],
  weakest: [],
  message: '',
  ...o,
})

const note = (midi: number, box: number, due: string, clef: 'treble' | 'bass' = 'treble'): Card => ({
  key: noteKey(clef, midi),
  kind: 'note',
  label: String(midi),
  data: { kind: 'note', clef, midi },
  box,
  due,
  lastSeen: 0,
  shown: 4,
  firstTry: 3,
  last: 0.75,
})

describe('Leitner boxes', () => {
  it('counts days across months', () => {
    expect(addDays('2026-10-30', 4)).toBe('2026-11-03')
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3)
  })

  it('moves a due card up when played well, back to 1 when played badly, else keeps it', () => {
    const due = { box: 2, due: TODAY }
    expect(nextBox(due, 0.95, TODAY)).toBe(3)
    expect(nextBox(due, 0.5, TODAY)).toBe(1)
    expect(nextBox(due, 0.75, TODAY)).toBe(2)
    expect(nextBox({ box: 5, due: TODAY }, 1, TODAY)).toBe(5)
  })

  it('does not move a card up when it is played again before it is due', () => {
    expect(nextBox({ box: 2, due: addDays(TODAY, 1) }, 1, TODAY)).toBe(2)
    expect(nextBox({ box: 3, due: addDays(TODAY, 3) }, 0.4, TODAY)).toBe(1)
  })

  it('starts a new card in box 2 when it went well, else in box 1', () => {
    expect(nextBox(undefined, 0.9, TODAY)).toBe(2)
    expect(nextBox(undefined, 0.8, TODAY)).toBe(1)
  })

  it('sets the next date from the box and adds the same card from two phases together', () => {
    const stored = new Map([[noteKey('treble', 62), note(62, 2, TODAY)]])
    const r = (accuracy: number, shown = 2) => ({
      key: noteKey('treble', 62),
      label: 'Re4',
      data: { kind: 'note' as const, clef: 'treble' as const, midi: 62 },
      shown,
      accuracy,
    })
    const { cards, moves } = applyResults(stored, [r(1), r(1)], TODAY, 5)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ box: 3, due: addDays(TODAY, 4), shown: 8, firstTry: 7, last: 1 })
    expect(moves[0]).toMatchObject({ from: 2, to: 3, days: 4 })
    // 1 of 2 right, then 2 of 2: 3 of 4 together, the box stays.
    expect(applyResults(stored, [r(0.5), r(1)], TODAY, 5).cards[0].box).toBe(2)
  })
})

describe('cards from lessons', () => {
  it('takes the notes of reading lessons per staff', () => {
    const lesson = TREBLE_LESSONS[0]
    const s = summary({
      perNote: [
        { midi: 60, clef: 'treble', shown: 4, firstTry: 4, accuracy: 1, avgReactionMs: 900, confusedWith: [] },
        { midi: 62, clef: 'treble', shown: 4, firstTry: 2, accuracy: 0.5, avgReactionMs: 900, confusedWith: [] },
      ],
    })
    const rs = cardResults(lesson, s)
    expect(rs.map((r) => [r.key, r.accuracy])).toEqual([
      ['note:treble:60', 1],
      ['note:treble:62', 0.5],
    ])
    expect(rs[0].label).toBe('Do4 (sol anahtarı)')
    // Rhythm lessons have notes too, but they are judged on time.
    expect(cardResults({ ...lesson, kind: 'rhythm' }, { ...s, timing: {} as never })).toEqual([])
  })

  it('takes every chord of a chord lesson, but not the ones played by ear', () => {
    const c = chordTarget('C', 'major')
    const g = chordTarget('G', 'major', 1)
    const rec = (chord: typeof c, ok: boolean): ChordRecord => ({
      chord,
      shownAt: 0,
      answeredAt: 1000,
      wrongPresses: ok ? [] : [61],
      inversionMistakes: 0,
      incomplete: 0,
      spreadMs: 10,
      lastVoice: null,
    })
    const s = summarizeChords([rec(c, true), rec(g, false), rec(c, true)])
    const lesson = CHORD_LESSONS.find((l) => l.kind === 'chord' && !l.chords?.byEar)!
    const rs = cardResults(lesson, s)
    expect(rs.find((r) => r.key === chordKey(c))).toMatchObject({ shown: 2, accuracy: 1 })
    expect(rs.find((r) => r.key === chordKey(g))).toMatchObject({
      shown: 1,
      accuracy: 0,
      label: 'Sol Majör · 1. çevrim',
    })
    const ear = CHORD_LESSONS.find((l) => l.chords?.byEar)!
    expect(cardResults(ear, s)).toEqual([])
  })

  it('takes scales part by part from the report topics', () => {
    const lesson = SCALE_LESSONS.find((l) => (l.scales?.length ?? 0) >= 2)!
    const s = summary({
      perCategory: [
        { id: 'part-1', label: 'x', shown: 15, firstTry: 12, accuracy: 0.8 },
        { id: 'crossings', label: 'Parmak geçişleri', shown: 4, firstTry: 4, accuracy: 1 },
      ],
    })
    expect(cardResults(lesson, s)).toEqual([
      expect.objectContaining({ key: scaleKey(lesson.scales![1]), shown: 15, accuracy: 0.8 }),
    ])
  })

  it('uses the cards a boss or mix collected from its phases', () => {
    const cards = [
      { key: 'k', label: 'K', data: { kind: 'note' as const, clef: 'bass' as const, midi: 48 }, shown: 1, accuracy: 1 },
    ]
    expect(cardResults({ ...TREBLE_LESSONS[0], kind: 'boss' }, summary({ cards }))).toBe(cards)
  })
})

describe('Günün Karışımı', () => {
  const chordCard = (root: string, due: string, box = 1): Card => {
    const t = chordTarget(root, 'major')
    return {
      key: chordKey(t),
      kind: 'chord',
      label: root,
      data: { kind: 'chord', root: t.root, quality: 'major', inversion: 0, hands: 'right' },
      box,
      due,
      lastSeen: 0,
      shown: 2,
      firstTry: 1,
      last: 0.5,
    }
  }
  const scaleCard = (due: string): Card => {
    const part = SCALE_LESSONS[0].scales![0]
    return {
      key: scaleKey(part),
      kind: 'scale',
      label: 'Do Majör',
      data: { kind: 'scale', part },
      box: 2,
      due,
      lastSeen: 0,
      shown: 15,
      firstTry: 12,
      last: 0.8,
    }
  }
  const later = addDays(TODAY, 3)

  it('is not built when nothing is due', () => {
    expect(buildMix([note(60, 2, later)], TODAY)).toBeNull()
  })

  it('has a phase for the due notes, chords and scales, with what is due', () => {
    const cards = [
      note(60, 1, TODAY),
      note(62, 2, TODAY),
      note(64, 3, later),
      note(65, 3, later),
      chordCard('C', TODAY),
      chordCard('F', later),
      scaleCard(TODAY),
    ]
    const mix = buildMix(cards, TODAY)!
    expect(mix.id).toBe(MIX_LESSON_ID)
    expect(mix.kind).toBe('mix')
    expect(mix.mix!.phases.map((p) => p.label)).toEqual(['Notalar', 'Akorlar', 'Gamlar'])
    expect(countsText(mix.mix!.due)).toBe('2 nota, 1 akor, 1 gam')
    const [notes, chords, scales] = mix.mix!.phases.map((p) => p.lesson)
    // Two due notes, filled up to four with the other cards of the staff.
    expect(notes.kind).toBe('drill')
    expect(notes.notes).toEqual([60, 62, 64, 65])
    expect(notes.keyboard.low % 12).toBe(0)
    // One due chord, with another one so the drill is not one chord.
    expect(chords.kind).toBe('chord')
    expect(chords.chords!.chords).toHaveLength(2)
    expect(chords.chords!.mode).toBe('exact')
    expect(scales.kind).toBe('scale')
    expect(scales.scales).toEqual([SCALE_LESSONS[0].scales![0]])
  })

  it('reads the staff with more due notes', () => {
    const cards = [note(60, 1, TODAY), note(48, 1, TODAY, 'bass'), note(50, 1, TODAY, 'bass')]
    expect(buildMix(cards, TODAY)!.mix!.phases[0].lesson.clef).toBe('bass')
  })

  it('adds the neighbour notes once the known notes are solid', () => {
    const solid = [60, 62, 64, 65].map((m) => note(m, 3, later))
    expect(stretchNotes(solid, 'treble')).toEqual([59, 67])
    expect(stretchNotes(solid.slice(0, 3), 'treble')).toEqual([])
    const mix = buildMix([...solid.slice(1), note(60, 3, TODAY)], TODAY)!
    const drill = mix.mix!.phases[0].lesson
    expect(drill.introduce).toEqual([59, 67])
    expect(drill.notes).toContain(59)
    expect(mix.mix!.stretch).toEqual([59, 67])
  })

  it('joins the phases into one report and never counts as lost', () => {
    const mix = buildMix([note(60, 1, TODAY), chordCard('C', TODAY)], TODAY)!
    const r = mixReport(mix.mix!, [summary({ accuracy: 1 }), summary({ accuracy: 0.5, failed: true })])
    expect(r.failed).toBe(false)
    expect(r.accuracy).toBe(0.75)
    expect(r.perCategory.slice(0, 2).map((c) => c.label)).toEqual(['Notalar', 'Akorlar'])
    expect(r.mix!.phases[1].failed).toBe(true)
  })

  it('counts the due cards by kind', () => {
    expect(dueCounts([note(60, 1, TODAY), note(61, 1, later), scaleCard('2026-10-01')], TODAY)).toEqual({
      note: 1,
      chord: 0,
      scale: 1,
      arpeggio: 0,
    })
  })
})

describe('adaptive difficulty', () => {
  const r = (accuracy: number, failed = false, stars = 3) => ({ accuracy, failed, stars })

  it('speeds an arcade lesson up after a very good game and slows it down after a hard one', () => {
    expect(nextPace(1, r(0.96))).toBe(1.1)
    expect(nextPace(1.1, r(0.8))).toBe(1.1)
    expect(nextPace(1.1, r(0.5))).toBe(1)
    expect(nextPace(1, r(1, true))).toBe(0.9)
    expect(nextPace(1.3, r(1))).toBe(1.3)
    expect(nextPace(0.8, r(0.2))).toBe(0.8)
    expect(paceText(1.1)).toBe('×1,1')
  })

  it('moves the suggested tempo within bounds of the lesson tempo', () => {
    expect(nextTempo(80, 80, r(0.95))).toBe(84)
    expect(nextTempo(80, 108, r(0.95))).toBe(110)
    expect(nextTempo(80, 110, r(1))).toBeNull()
    expect(nextTempo(80, 80, r(0.3, true, 0))).toBe(76)
    expect(nextTempo(80, 60, r(0.3, true, 0))).toBeNull()
    expect(nextTempo(80, 80, r(0.85, false, 2))).toBeNull()
    expect(adaptsTempo('dino', false)).toBe(true)
    expect(adaptsTempo('dino', true)).toBe(false)
    expect(adaptsTempo('drill', false)).toBe(false)
  })
})
