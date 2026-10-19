import { describe, expect, it } from 'vitest'
import { ALL_LESSONS, findLesson } from '../../progress/curriculum'
import {
  ENDLESS_LENGTH,
  gameOpen,
  isSalonId,
  nextRecord,
  SALON_GAMES,
  SALON_SKILLS,
  salonLesson,
  salonResult,
  skillOpen,
  skillsOf,
} from './salon'

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
