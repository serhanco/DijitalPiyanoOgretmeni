import { describe, expect, it } from 'vitest'
import { ALL_LESSONS, BOSS_LESSON_IDS, isUnlocked, UNITS, unitDone } from '../../progress/curriculum'
import { newlyEarnedBadges, xpFor } from '../../progress/gamification'
import type { SessionSummary } from '../noteHunter/summary'
import { BOSS_LESSONS, BOSS_WIN } from './bosses'
import { bossReport, hpAfter } from './report'

const phase = (accuracy: number, o: Partial<SessionSummary> = {}): SessionSummary => ({
  failed: false,
  total: 10,
  firstTry: Math.round(accuracy * 10),
  accuracy,
  avgReactionMs: 1000,
  totalMistakes: 10 - Math.round(accuracy * 10),
  stars: 2,
  perNote: [],
  perCategory: [{ id: 'line', label: 'Çizgideki notalar', shown: 10, firstTry: 8, accuracy: 0.8 }],
  weakest: [],
  message: '',
  ...o,
})

describe('unit bosses', () => {
  it('every unit ends with its boss, made of three of the unit’s lessons', () => {
    for (const unit of UNITS) {
      const boss = unit.lessons.at(-1)!
      expect(boss.kind, unit.id).toBe('boss')
      expect(boss.boss!.phases).toHaveLength(3)
      for (const p of boss.boss!.phases) {
        expect(p.lesson.kind).not.toBe('boss')
        expect(p.lesson.rhythm?.tempoLadder).toBeUndefined()
        expect(p.lesson.introduce).toBeUndefined()
      }
    }
    expect(BOSS_LESSON_IDS).toHaveLength(UNITS.length)
    expect(new Set(ALL_LESSONS.map((l) => l.id)).size).toBe(ALL_LESSONS.length)
  })

  it('a boss opens after the unit’s last lesson and locks nothing', () => {
    const boss = BOSS_LESSONS.basics
    const regular = UNITS[0].lessons.filter((l) => l.kind !== 'boss')
    const starred = new Set(regular.map((l) => l.id))
    const stars = (id: string) => (starred.has(id) ? 1 : 0)
    expect(isUnlocked(boss.id, stars)).toBe(true)
    expect(isUnlocked(boss.id, () => 0)).toBe(false)
    // Başlangıç is done without beating its boss: the other units open.
    expect(unitDone('basics', stars)).toBe(true)
    expect(isUnlocked(UNITS[1].lessons[0].id, stars)).toBe(true)
  })

  it('each phase hits the boss as hard as it was played; the average decides', () => {
    const spec = BOSS_LESSONS.treble.boss!
    expect(hpAfter([BOSS_WIN, BOSS_WIN, BOSS_WIN], 3)).toBeCloseTo(0)
    const win = bossReport(spec, [phase(0.9), phase(0.7), phase(0.8)])
    expect(win.boss!.defeated).toBe(true)
    expect(win.failed).toBe(false)
    expect(win.stars).toBe(2)
    expect(win.boss!.hp).toBe(0)
    expect(win.boss!.tip).toMatch(/Balon Patlatma|Porte okuma|Nota Kuşu/)
    expect(win.perCategory.slice(0, 3).map((c) => c.label)).toEqual([
      '1. aşama: Porte okuma',
      '2. aşama: Balon Patlatma',
      '3. aşama: Nota Kuşu',
    ])
    // The same topic in three phases is merged.
    expect(win.perCategory[3]).toMatchObject({ label: 'Çizgideki notalar', shown: 30 })

    const lose = bossReport(spec, [phase(0.7), phase(0.6), phase(0.8)])
    expect(lose.boss!.defeated).toBe(false)
    expect(lose.stars).toBe(0)
    expect(lose.boss!.hp).toBeGreaterThan(0)
    expect(lose.boss!.tip).toMatch(/Balon Patlatma/)
  })

  it('hearts running out in a phase ends the fight', () => {
    const spec = BOSS_LESSONS.bass.boss!
    const r = bossReport(spec, [phase(1), phase(0.4, { failed: true })])
    expect(r.boss!.defeated).toBe(false)
    expect(r.boss!.phases[1].failed).toBe(true)
    expect(r.boss!.skipped).toEqual(['Nota Kuşu'])
    expect(r.boss!.tip).toMatch(/canların bitti/)
  })

  it('a beaten boss earns XP and badges', () => {
    const outcome = {
      lessonId: 'boss-treble',
      total: 30,
      firstTry: 25,
      accuracy: 0.85,
      avgReactionMs: 1200,
      stars: 2,
      failed: false,
      boss: { defeated: true },
    }
    expect(xpFor(outcome).map((l) => l.label)).toContain('Boss yenildi')
    const ctx = {
      totalXp: 0,
      streak: 1,
      lessonsCompleted: 1,
      outcome,
      threeStarLessons: [],
      allTrebleLessonIds: ['x'],
      allBassLessonIds: ['x'],
      bossesDefeated: 10,
      bossCount: 10,
      weeklyDone: true,
    }
    expect(newlyEarnedBadges(ctx, []).map((b) => b.id)).toEqual(
      expect.arrayContaining(['boss-hunter', 'boss-master', 'week-star']),
    )
  })
})
