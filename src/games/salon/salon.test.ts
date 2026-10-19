import { describe, expect, it } from 'vitest'
import { ALL_LESSONS, findLesson } from '../../progress/curriculum'
import {
  ENDLESS_LENGTH,
  gameOpen,
  isSalonId,
  nextRecord,
  SALON_GAMES,
  SALON_SONGS,
  SALON_SKILLS,
  salonLesson,
  salonResult,
  skillOpen,
  skillsOf,
  tuneShiftFor,
} from './salon'
import { tunePitches } from '../arcade/train/tunes'

const game = (kind: string) => SALON_GAMES.find((g) => g.kind === kind)!
const skill = (id: string) => SALON_SKILLS.find((s) => s.id === id)!

describe('Oyun Salonu', () => {
  it('points at lessons that exist, with the right content', () => {
    for (const g of SALON_GAMES) {
      expect(findLesson(g.template)?.kind).toBe(g.kind)
      expect(skillsOf(g).length).toBeGreaterThan(0)
      for (const s of skillsOf(g)) expect(salonLesson(g, s, findLesson)).not.toBeNull()
    }
    for (const s of SALON_SKILLS) expect(findLesson(s.source)).toBeDefined()
  })

  it('plays a game with another skill', () => {
    const lesson = salonLesson(game('bird'), skill('fa'), findLesson)!
    expect(isSalonId(lesson.id)).toBe(true)
    expect(lesson.kind).toBe('bird')
    expect(lesson.clef).toBe('bass')
    expect(lesson.notes).toEqual(findLesson('bass-bird-2')!.notes)
    expect(lesson.length).toBe(ENDLESS_LENGTH)
    expect(lesson.salon).toEqual({ game: 'bird', skill: 'fa', endless: true })
  })

  it('keeps a chord game’s own judging and draws the skill’s chords', () => {
    const lesson = salonLesson(game('chef'), skill('minör'), findLesson)!
    expect(lesson.chords!.mode).toBe(findLesson('chord-chef-1')!.chords!.mode)
    expect(lesson.chords!.chords).toEqual(findLesson('chord-minor')!.chords!.chords)
    expect(lesson.chords!.draw).toBe(ENDLESS_LENGTH)
  })

  it('plays a round of random bars in beat games', () => {
    const lesson = salonLesson(game('dino'), skill('sekizlik'), findLesson)!
    expect(lesson.salon?.endless).toBe(false)
    expect(lesson.rhythm!.values).toContain('e')
    expect(lesson.rhythm!.pattern).toBeUndefined()
  })

  it('opens games and skills with the lessons that teach them', () => {
    const none = () => 0
    expect(gameOpen(game('bird'), ALL_LESSONS, none)).toBe(false)
    const starred = (ids: string[]) => (id: string) => (ids.includes(id) ? 1 : 0)
    expect(gameOpen(game('bird'), ALL_LESSONS, starred(['basics-bird']))).toBe(true)
    expect(skillOpen(skill('oktav'), starred(['basics-bird']))).toBe(true)
    expect(skillOpen(skill('fa'), starred(['basics-bird']))).toBe(false)
  })

  it('has a skill to play for every game, whichever lesson of its kind opened it', () => {
    for (const g of SALON_GAMES)
      for (const l of ALL_LESSONS.filter((l) => l.kind === g.kind)) {
        const stars = (id: string) => (id === l.id ? 1 : 0)
        expect(gameOpen(g, ALL_LESSONS, stars)).toBe(true)
        expect(
          skillsOf(g).some((s) => skillOpen(s, stars, true)),
          `${g.kind} via ${l.id}`,
        ).toBe(true)
      }
    // Dino Koşusu comes before Ritim Davulcusu, whose rhythm is the first beat skill.
    expect(skillOpen(skill('temel'), (id) => (id === 'rhythm-dino-1' ? 1 : 0), true)).toBe(true)
    expect(skillOpen(skill('sekizlik'), (id) => (id === 'rhythm-dino-1' ? 1 : 0), true)).toBe(false)
  })

  it('moves Nota Treni songs onto the staff of the skill', () => {
    const train = game('train')
    for (const s of skillsOf(train)) {
      const lesson = salonLesson(train, s, findLesson)!
      // The songs skill brings its own notes; the others play the source lesson's.
      const notes = s.songs ? lesson.notes : findLesson(s.source)!.notes
      const pitches = (lesson.tunes ?? []).flatMap(tunePitches).map((p) => p + (lesson.tuneShift ?? 0))
      for (const p of pitches) {
        expect(p, s.id).toBeGreaterThanOrEqual(Math.min(...notes))
        expect(p, s.id).toBeLessThanOrEqual(Math.max(...notes))
      }
    }
    const bass = salonLesson(train, skill('fa'), findLesson)!
    expect(bass.tunes?.length).toBeGreaterThan(0)
    expect(bass.tuneShift).toBe(-12)
    expect(tuneShiftFor(findLesson('treble-train-1')!, [60, 62])).toBeNull()
  })

  it('plays well-known songs in Nota Kuşu, Balon and Nota Treni', () => {
    const songs = skill('sarki')
    expect(SALON_SONGS.length).toBeGreaterThanOrEqual(15)
    for (const kind of ['bird', 'balloon', 'train'] as const) {
      const lesson = salonLesson(game(kind), songs, findLesson)!
      expect(lesson.tunes).toBe(SALON_SONGS)
      expect(lesson.tuneShift).toBe(0)
      const pitches = SALON_SONGS.flatMap(tunePitches)
      expect(Math.min(...pitches)).toBeGreaterThanOrEqual(lesson.keyboard.low)
      expect(Math.max(...pitches)).toBeLessThanOrEqual(lesson.keyboard.high)
    }
    // Every song shows where it comes from.
    for (const t of SALON_SONGS) expect(t.original && t.origin, t.title).toBeTruthy()
    // The skill opens with Nota Treni's first lesson.
    expect(skillOpen(songs, (id) => (id === 'treble-train-1' ? 1 : 0))).toBe(true)
  })

  it('scores endless games by points and beat games by timing', () => {
    expect(salonResult(true, { accuracy: 0.5, arcade: { score: 22, bestCombo: 9 } })).toEqual({ score: 22, combo: 9 })
    expect(salonResult(false, { accuracy: 0.876 })).toEqual({ score: 88, combo: 0 })
  })

  it('keeps the best score', () => {
    const a = nextRecord(undefined, { score: 10, combo: 4 })
    expect(a).toEqual({ record: { best: 10, bestCombo: 4, plays: 1 }, isNew: true })
    const b = nextRecord(a.record, { score: 8, combo: 6 })
    expect(b).toEqual({ record: { best: 10, bestCombo: 6, plays: 2 }, isNew: false })
    expect(nextRecord(undefined, { score: 0, combo: 0 }).isNew).toBe(false)
  })
})
