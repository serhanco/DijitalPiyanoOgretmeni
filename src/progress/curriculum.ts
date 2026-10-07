import { type NoteLesson, TREBLE_LESSONS } from '../games/noteHunter/lessons'
import type { Clef } from '../music/notes'
import { RHYTHM_LESSONS } from '../rhythm/lessons'

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
}

export const UNITS: Unit[] = [
  {
    id: 'treble',
    title: 'Ünite 1: Sol Anahtarı',
    subtitle: 'Sağ elin notalarını tanı',
    color: '#58cc02',
    lessons: TREBLE_LESSONS,
    review: true,
  },
  {
    id: 'rhythm',
    title: 'Ünite 2: Ritim ve Tempo',
    subtitle: 'Zamanında çal',
    color: '#ce82ff',
    lessons: RHYTHM_LESSONS,
  },
  {
    id: 'bass',
    title: 'Ünite 3: Fa Anahtarı',
    subtitle: 'Sol elin notaları',
    color: '#1cb0f6',
    lessons: [],
    comingSoon: true,
  },
  {
    id: 'chords',
    title: 'Ünite 4: Akorlar',
    subtitle: 'Üçlüler, çevrimler, arpejler',
    color: '#ff9600',
    lessons: [],
    comingSoon: true,
  },
]

export const ALL_LESSONS: NoteLesson[] = UNITS.flatMap((u) => u.lessons)

export function findLesson(id: string): NoteLesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id)
}

/**
 * The first lesson of every unit is open (rhythm does not need note reading),
 * and each next one opens once the one before it in the unit has a star.
 */
export function isUnlocked(lessonId: string, bestStars: (id: string) => number): boolean {
  for (const unit of UNITS) {
    const i = unit.lessons.findIndex((l) => l.id === lessonId)
    if (i === 0) return true
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

/** A practice lesson built from the player's weakest notes. */
export function buildReviewLesson(clef: Clef, notes: number[]): NoteLesson {
  const base = TREBLE_LESSONS[TREBLE_LESSONS.length - 1]
  return {
    id: REVIEW_LESSON_ID,
    title: 'Zayıf Notalar',
    description: 'En çok zorlandığın notalarla kısa bir tekrar',
    clef,
    notes,
    length: 15,
    keyboard: base.keyboard,
  }
}
