import { CHORD_LESSONS } from '../games/chords/lessons'
import { BASS_LESSONS } from '../games/noteHunter/bassLessons'
import { HANDS_LESSONS } from '../games/noteHunter/handsLessons'
import { type NoteLesson, TREBLE_LESSONS } from '../games/noteHunter/lessons'
import { type Clef, fitKeyboard } from '../music/notes'
import { SCALE_LESSONS } from '../games/scales/lessons'
import { RHYTHM_LESSONS } from '../rhythm/lessons'
import { BASICS_LESSONS } from '../games/theory/lessons'

export interface Unit {
  id: string
  title: string
  subtitle: string
  color: string
  lessons: NoteLesson[]
  /** Planned units are shown locked on the map. */
  comingSoon?: boolean
  /** Ends with a "weak notes" review built from the note statistics. */
  review?: boolean
  /** The unit opens once every lesson of this unit has a star. */
  requires?: string
}

/** Every unit after Başlangıç waits for it. */
const AFTER_BASICS = 'basics'

export const UNITS: Unit[] = [
  {
    id: 'basics',
    title: 'Başlangıç: Temeller',
    subtitle: 'Klavye, parmaklar, porte; notalar ikişer ikişer',
    color: '#ffc800',
    lessons: BASICS_LESSONS,
  },
  {
    id: 'treble',
    requires: AFTER_BASICS,
    title: 'Ünite 1: Sol Anahtarı',
    subtitle: 'Sağ elin notalarını tanı',
    color: '#58cc02',
    lessons: TREBLE_LESSONS,
    review: true,
  },
  {
    id: 'rhythm',
    requires: AFTER_BASICS,
    title: 'Ünite 2: Ritim ve Tempo',
    subtitle: 'Zamanında çal',
    color: '#ce82ff',
    lessons: RHYTHM_LESSONS,
  },
  {
    id: 'bass',
    requires: AFTER_BASICS,
    title: 'Ünite 3: Fa Anahtarı',
    subtitle: 'Sol elin notaları',
    color: '#1cb0f6',
    lessons: BASS_LESSONS,
    review: true,
  },
  {
    id: 'hands',
    requires: AFTER_BASICS,
    title: 'Ünite 4: İki El',
    subtitle: 'Büyük porte, Orta Do ve iki el birlikte',
    color: '#ff4b8b',
    lessons: HANDS_LESSONS,
  },
  {
    id: 'scales',
    requires: AFTER_BASICS,
    title: 'Ünite 5: Gamlar',
    subtitle: 'Sağ el, sol el, iki el eş zamanlı',
    color: '#2bc4a8',
    lessons: SCALE_LESSONS,
  },
  {
    id: 'chords',
    requires: AFTER_BASICS,
    title: 'Ünite 6: Akorlar',
    subtitle: 'Üçlüler, çevrimler, arpejler',
    color: '#ff9600',
    lessons: CHORD_LESSONS,
  },
]

export const ALL_LESSONS: NoteLesson[] = UNITS.flatMap((u) => u.lessons)

export function findLesson(id: string): NoteLesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id)
}

/** True when every lesson of the unit has at least one star. */
export function unitDone(unitId: string, bestStars: (id: string) => number): boolean {
  const unit = UNITS.find((u) => u.id === unitId)
  return !!unit && unit.lessons.every((l) => bestStars(l.id) >= 1)
}

/**
 * The first lesson of a unit opens when the unit it requires is done (or when
 * the learner already has stars in the unit, so earlier progress stays open);
 * each next lesson opens once the one before it has a star.
 */
export function isUnlocked(lessonId: string, bestStars: (id: string) => number): boolean {
  for (const unit of UNITS) {
    const i = unit.lessons.findIndex((l) => l.id === lessonId)
    if (i === 0)
      return !unit.requires || unitDone(unit.requires, bestStars) || unit.lessons.some((l) => bestStars(l.id) >= 1)
    if (i > 0) return bestStars(unit.lessons[i - 1].id) >= 1
  }
  return false
}

export interface NoteScore {
  midi: number
  shown: number
  firstTry: number
}

/**
 * Pick the notes most worth reviewing: lowest first-try accuracy, with a
 * small prior so a note seen once and missed once does not dominate.
 */
export function weakestNotes(stats: NoteScore[], count: number): number[] {
  return [...stats]
    .filter((s) => s.shown > 0)
    .map((s) => ({ midi: s.midi, score: (s.firstTry + 1) / (s.shown + 2) }))
    .sort((a, b) => a.score - b.score || a.midi - b.midi)
    .slice(0, count)
    .map((s) => s.midi)
}

export const REVIEW_LESSON_ID = 'review'

/** A practice lesson built from the player's weakest notes, on their staff (or both staves). */
export function buildReviewLesson(clef: Clef | 'grand', notes: number[]): NoteLesson {
  return {
    id: REVIEW_LESSON_ID,
    title: 'Zayıf Notalar',
    description: 'En çok zorlandığın notalarla kısa bir tekrar',
    clef: clef === 'grand' ? 'treble' : clef,
    ...(clef === 'grand' && { grand: true }),
    notes,
    length: 15,
    keyboard: fitKeyboard(notes, { fromDo: true }),
  }
}

/** The map node a lesson is started from; the weak-notes lessons share an id, so their clef tells them apart. */
export function mapNodeOf(lesson: NoteLesson): string {
  return lesson.id === REVIEW_LESSON_ID ? `review-${lesson.grand ? 'grand' : lesson.clef}` : lesson.id
}
