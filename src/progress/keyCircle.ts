// Ton çemberi: how far the learner has come in each key of the circle of
// fifths, the major key from its unit's lessons and the relative minor from
// the minor lessons. Pure.

import { KEYS, keyUnitId, MINOR_SLUGS } from '../games/keys/units'
import { parseTonic, tonicName } from '../music/scales'
import { isUnlocked, KEY_UNITS } from './curriculum'

export interface KeyNode {
  unit: string
  /** "Sol", "Si♭". */
  major: string
  /** "mi", "sol": minor keys are written in lower case on the circle. */
  minor: string
  /** Stars earned out of the stars there are, 0–1. */
  majorShare: number
  minorShare: number
  /** The unit's first lesson is open. */
  open: boolean
  /** The unit's boss is beaten. */
  boss: boolean
}

const MAX_STARS = 3

/** The twelve keys in circle order with the share of stars earned in each. */
export function keyCircle(bestStars: (lessonId: string) => number): KeyNode[] {
  return KEYS.map((k, i) => {
    const unit = KEY_UNITS[i]
    const isMinor = (id: string) => MINOR_SLUGS.some((slug) => id === `${keyUnitId(k)}-${slug}`)
    const lessons = unit.lessons.filter((l) => l.kind !== 'boss')
    const share = (ids: string[]) =>
      ids.length ? ids.reduce((n, id) => n + Math.min(MAX_STARS, bestStars(id)), 0) / (ids.length * MAX_STARS) : 0
    const boss = unit.lessons.find((l) => l.kind === 'boss')
    return {
      unit: unit.id,
      major: tonicName(parseTonic(k.major)),
      minor: tonicName(parseTonic(k.minor)).toLocaleLowerCase('tr'),
      majorShare: share(lessons.filter((l) => !isMinor(l.id)).map((l) => l.id)),
      minorShare: share(lessons.filter((l) => isMinor(l.id)).map((l) => l.id)),
      open: isUnlocked(unit.lessons[0].id, bestStars),
      boss: !!boss && bestStars(boss.id) >= 1,
    }
  })
}
