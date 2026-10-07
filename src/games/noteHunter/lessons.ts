import { type Clef, parseNote, whiteKeysBetween } from '../../music/notes'

export interface NoteLesson {
  id: string
  title: string
  description: string
  clef: Clef
  notes: number[]
  length: number
  /** Range of the on-screen keyboard shown under the staff. */
  keyboard: { low: number; high: number }
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
    id: 'treble-5',
    title: 'Porte Ustası',
    description: 'Do4 ile Sol5 arasındaki tüm notalar',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('G5')),
    length: 25,
    keyboard: TREBLE_KEYBOARD,
  },
]
