import { afterEach, describe, expect, it } from 'vitest'
import { GAME_INTROS, introFor, markIntroSeen } from './intro'

describe('Oyun arası Notiş', () => {
  afterEach(() => localStorage.clear())

  it('tells every game’s rule in two sentences and one move in three steps', () => {
    for (const [kind, intro] of Object.entries(GAME_INTROS)) {
      expect(intro.rule.match(/[.!?]/g)?.length, kind).toBe(2)
      expect(intro.steps, kind).toHaveLength(3)
    }
  })

  it('shows a game’s rule once', () => {
    expect(introFor('bird')?.name).toBe('Nota Kuşu')
    markIntroSeen('bird')
    expect(introFor('bird')).toBeNull()
    expect(introFor('balloon')?.name).toBe('Balon Patlatma')
    // Lessons that are not games have no intro.
    expect(introFor('drill')).toBeNull()
    expect(introFor(undefined)).toBeNull()
  })

  it('can be turned off (browser tests)', () => {
    localStorage.setItem('dpo-intros', 'off')
    expect(introFor('bird')).toBeNull()
  })
})
