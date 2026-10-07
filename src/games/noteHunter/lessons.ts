import { type Clef, parseNote, whiteKeysBetween } from '../../music/notes'
import type { RhythmValue } from '../../rhythm/rhythm'

/**
 * How a lesson is played: the staff drill, a melody read note by note, a
 * rhythm exercise or one of the arcade games.
 */
export type LessonKind = 'drill' | 'melody' | 'bird' | 'balloon' | 'bar' | 'rhythm' | 'dino' | 'drum'

/** Kinds played against a metronome. */
export const BEAT_KINDS: LessonKind[] = ['rhythm', 'dino', 'drum']

export interface RhythmSpec {
  bpm: number
  beatsPerBar: number
  bars: number
  /** Values the random bars are made of. */
  values: RhythmValue[]
  /** Any key counts; only the timing is judged. */
  anyKey?: boolean
}

export interface NoteLesson {
  id: string
  /** Defaults to 'drill'. */
  kind?: LessonKind
  title: string
  description: string
  clef: Clef
  notes: number[]
  length: number
  /** Range of the on-screen keyboard shown under the staff. */
  keyboard: { low: number; high: number }
  /** Rhythm lessons: tempo and the note values to practise. `length` is unused. */
  rhythm?: RhythmSpec
  /** Read from the grand staff (treble + bass); `clef` is then only the default. */
  grand?: boolean
  /** Grand staff: notes around middle C that may be written on either staff. */
  bothStaves?: number[]
  /** Melody lessons: the pieces, played in order. `notes` and `length` are unused. */
  melodies?: Melody[]
}

export interface Melody {
  title: string
  /**
   * Space separated steps; "C3+E4" plays two keys together. A trailing L or
   * R ("C4L") writes the note on the left hand's (bass) or right hand's
   * (treble) staff; otherwise middle C and up go to treble.
   */
  notes: string
}

const TREBLE_KEYBOARD = { low: parseNote('C4'), high: parseNote('G5') }

export const TREBLE_LESSONS: NoteLesson[] = [
  {
    id: 'treble-1',
    title: 'İlk Adımlar',
    description: 'Do, Re, Mi, Fa, Sol',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('G4')),
    length: 15,
    keyboard: TREBLE_KEYBOARD,
  },
  {
    id: 'treble-2',
    title: 'Bir Oktav',
    description: "Orta Do'dan bir üst Do'ya",
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('C5')),
    length: 20,
    keyboard: TREBLE_KEYBOARD,
  },
  {
    id: 'treble-bird-1',
    kind: 'bird',
    title: 'Nota Kuşu',
    description: 'Kuşu borulardaki boşluğun notasına uçur',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('C5')),
    length: 15,
    keyboard: TREBLE_KEYBOARD,
  },
  {
    id: 'treble-3',
    title: 'Çizgiler',
    description: 'Mi, Sol, Si, Re, Fa',
    clef: 'treble',
    notes: ['E4', 'G4', 'B4', 'D5', 'F5'].map(parseNote),
    length: 20,
    keyboard: TREBLE_KEYBOARD,
  },
  {
    id: 'treble-4',
    title: 'Aralar',
    description: 'Fa, La, Do, Mi',
    clef: 'treble',
    notes: ['F4', 'A4', 'C5', 'E5'].map(parseNote),
    length: 20,
    keyboard: TREBLE_KEYBOARD,
  },
  {
    id: 'treble-balloon-1',
    kind: 'balloon',
    title: 'Balon Patlatma',
    description: 'Balonlar kaçmadan notalarını çal',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('E4'), parseNote('F5')),
    length: 20,
    keyboard: TREBLE_KEYBOARD,
  },
  {
    id: 'treble-5',
    title: 'Porte Ustası',
    description: 'Do4 ile Sol5 arasındaki tüm notalar',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('G5')),
    length: 25,
    keyboard: TREBLE_KEYBOARD,
  },
  {
    id: 'treble-bird-2',
    kind: 'bird',
    title: 'Nota Kuşu: Usta',
    description: 'Ek çizgiler dahil, daha hızlı borular',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('G5')),
    length: 25,
    keyboard: TREBLE_KEYBOARD,
  },
]
