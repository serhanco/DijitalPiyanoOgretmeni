import { describe, expect, it } from 'vitest'
import { parseNote } from '../../music/notes'
import { BeatTrack } from '../../rhythm/track'
import { SONGS } from './catalog'
import { tempoReport, waitReport } from './report'
import { concatSongs, parsePart, parseSong, type Song, songPart } from './song'
import { tempoPlan } from './tempo'
import { WaitSession } from './wait'

const n = parseNote

const TINY: Song = {
  id: 'tiny',
  title: 'Minik',
  original: 'Tiny',
  origin: 'Test',
  fact: '',
  beatsPerBar: 4,
  bpm: 60,
  notes: 'C4/q D4/q E4/h | qr E4/q D4/q C4/q',
  left: 'C3/w | C3+G3/h G3/h',
  sections: [1, 1],
}

describe('songs', () => {
  it('parses both hands with rests, chords and sections', () => {
    const s = parseSong(TINY)
    expect(s.bars).toBe(2)
    expect(s.sections.map((x) => x.label)).toEqual(['1. bölüm (ölçü 1–1)', '2. bölüm (ölçü 2–2)'])
    const at = (beat: number) => s.notes.filter((x) => x.beat === beat).map((x) => `${x.hand}:${x.midi}`)
    expect(at(0)).toEqual([`left:${n('C3')}`, `right:${n('C4')}`])
    // The rest moves E4 to the second beat of bar 2.
    expect(at(4)).toEqual([`left:${n('C3')}`, `left:${n('G3')}`])
    expect(at(5)).toEqual([`right:${n('E4')}`])
  })

  it('rejects a bar that is not full and hands of different lengths', () => {
    expect(() => parsePart('C4/q D4/q', 'right', 4, 'x')).toThrow(/bar 1/)
    expect(() => parseSong({ ...TINY, left: 'C3/w' })).toThrow(/bars/)
  })

  it('every song of the catalogue parses, with its original title and origin', () => {
    for (const song of SONGS) {
      const s = parseSong(song)
      expect(s.notes.length, song.id).toBeGreaterThan(8)
      expect(song.original && song.origin, song.id).toBeTruthy()
      // No key is struck by both hands at once.
      const keys = s.notes.map((x) => `${x.beat}:${x.midi}`)
      expect(new Set(keys).size, song.id).toBe(keys.length)
    }
  })

  it('takes one hand and some bars, keeping the song’s bar numbers in the labels', () => {
    const s = songPart(parseSong(SONGS[1]), { hands: 'right', bars: [4, 7] })
    expect(s.bars).toBe(4)
    expect(s.notes[0]).toMatchObject({ beat: 0, bar: 0, midi: n('G4'), hand: 'right' })
    expect(s.sections.map((x) => x.label)).toEqual(['2. bölüm (ölçü 5–8)'])
  })

  it('joins songs into a concert, one section each', () => {
    const a = parseSong(TINY)
    const s = concatSongs([
      { parsed: a, title: 'A' },
      { parsed: a, title: 'B' },
    ])
    expect(s.bars).toBe(4)
    expect(s.sections.map((x) => [x.label, x.from, x.to])).toEqual([
      ['A', 0, 1],
      ['B', 2, 3],
    ])
    expect(s.notes.at(-1)!.beat).toBe(8 + 7)
  })
})

describe('WaitSession', () => {
  const song = () => parseSong(TINY)

  it('falls at the tempo and waits at the step until its keys are down', () => {
    const w = new WaitSession(song(), { bpm: 60, startAt: 1000 })
    w.update(0)
    expect(w.position).toBe(-1)
    w.update(1000)
    expect(w.waiting).toBe(true)
    w.update(5000)
    expect(w.position).toBe(0)
    expect(w.pending).toEqual([n('C3'), n('C4')])
    expect(w.press(n('C4'), 5100).map((e) => e.type)).toEqual(['hit'])
    const ev = w.press(n('C3'), 5150)
    expect(ev.map((e) => e.type)).toEqual(['hit', 'step'])
    const rec = (ev[1] as { record: { waitMs: number; spreadMs: number } }).record
    expect(rec.waitMs).toBe(4150)
    expect(rec.spreadMs).toBe(50)
    // Moves on to D4 at beat 1, a second later.
    w.update(5650)
    expect(w.position).toBeCloseTo(0.5)
    w.update(7000)
    expect(w.position).toBe(1)
  })

  it('a wrong key is a mistake; the section falls once more, then the song goes on', () => {
    const w = new WaitSession(song(), { bpm: 60, startAt: 0 })
    let t = 0
    const play = (keys: string[]) => keys.flatMap((k) => w.press(n(k), (t += 10)))
    play(['C4', 'C3'])
    expect(play(['F4']).map((e) => e.type)).toEqual(['wrong'])
    play(['D4'])
    const ev = play(['E4'])
    expect(ev.map((e) => e.type)).toEqual(['hit', 'step', 'repeat'])
    expect(w.index).toBe(0)
    expect(w.position).toBe(-2)
    // The repeat is clean: on to bar 2.
    play(['C4', 'C3', 'D4', 'E4'])
    expect(w.step!.section).toBe(1)
    play(['G3', 'C3', 'E4', 'G3', 'D4'])
    // A second mistake in bar 2 repeats it too.
    play(['B4'])
    expect(play(['C4']).map((e) => e.type)).toContain('repeat')
    play(['G3', 'C3', 'E4', 'G3', 'D4', 'B4'])
    // Its repeat had a mistake too, but a section falls again only once.
    const end = play(['C4'])
    expect(end.map((e) => e.type)).toEqual(['hit', 'step', 'done'])
    expect(w.repeated).toEqual([1, 1])

    const r = waitReport(w.records, w.song, { title: 'Minik', hands: 'both', repeated: w.repeated })
    expect(r.total).toBe(w.records.length)
    expect(r.totalMistakes).toBe(3)
    expect(r.song!.sections.map((s) => [s.repeats, s.fixed])).toEqual([
      [1, true],
      [1, false],
    ])
    expect(r.perCategory.map((c) => c.label)).toEqual([
      '1. bölüm (ölçü 1–1)',
      '2. bölüm (ölçü 2–2)',
      'Sağ el',
      'Sol el',
      'İki el birlikte',
    ])
    // F4 and B4 were nearest to right-hand notes.
    expect(r.hands!.find((h) => h.hand === 'left')!.accuracy).toBe(1)
    expect(r.sync!.pairs).toBeGreaterThan(0)
  })

  it('a key of the step pressed again is not a mistake', () => {
    const w = new WaitSession(song(), { bpm: 60, startAt: 0 })
    w.press(n('C4'), 0)
    expect(w.press(n('C4'), 10)).toEqual([])
    expect(w.pending).toEqual([n('C3')])
  })

  it('ignores the octave when the setting says so', () => {
    const w = new WaitSession(songPart(song(), { hands: 'right' }), { bpm: 60, startAt: 0, ignoreOctave: true })
    expect(w.press(n('C5'), 0).map((e) => e.type)).toEqual(['hit', 'step'])
  })
})

describe('tempo mode', () => {
  it('turns the notes into timed targets and reports per section and hand', () => {
    const s = parseSong(TINY)
    const plan = tempoPlan(s)
    expect(plan.bars).toEqual([['w'], ['w']])
    const t = new BeatTrack(plan.skill, { bpm: 60, startAt: 0 })
    // Play everything right on time, except the left hand of bar 2.
    t.records.forEach((r, i) => {
      if (r.beat < 4 || s.notes[i].hand === 'right') t.press(r.target, r.dueAt)
    })
    t.update(100_000)
    const out = tempoReport([t.records], s.notes, s, { title: 'Minik', hands: 'both', failed: false })
    const acc = Object.fromEntries(out.perCategory.map((c) => [c.label, c.accuracy]))
    expect(acc['1. bölüm (ölçü 1–1)']).toBe(1)
    expect(acc['Sağ el']).toBe(1)
    expect(acc['Sol el']).toBeLessThan(0.5)
    expect(out.sync!.pairs).toBe(1)
    expect(out.song!.tip).toMatch(/2\. bölüm/)
  })
})
