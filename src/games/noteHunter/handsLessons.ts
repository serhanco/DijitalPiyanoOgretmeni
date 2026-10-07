import { parseNote, whiteKeysBetween } from '../../music/notes'
import type { NoteLesson } from './lessons'

const notes = (low: string, high: string) => whiteKeysBetween(parseNote(low), parseNote(high))

/** Both hands in C position: left Do3–Sol3, right Do4–Sol4 (and up to Do5). */
export const GRAND_KEYBOARD = { low: parseNote('C3'), high: parseNote('C5') }

/** The notes around middle C that are written on either staff. */
const MIDDLE = ['A3', 'B3', 'C4', 'D4', 'E4'].map(parseNote)

/** Unit 4: the grand staff, middle C and the two hands together. */
export const HANDS_LESSONS: NoteLesson[] = [
  {
    id: 'grand-1',
    title: 'Büyük Porte',
    description: 'Üst porte sağ el, alt porte sol el',
    clef: 'treble',
    grand: true,
    notes: [...notes('C3', 'G3'), ...notes('C4', 'G4')],
    length: 20,
    keyboard: GRAND_KEYBOARD,
  },
  {
    id: 'grand-2',
    title: 'Orta Do Köprüsü',
    description: 'Orta Do çevresi iki portede de yazılabilir',
    clef: 'treble',
    grand: true,
    notes: notes('F3', 'G4'),
    bothStaves: MIDDLE,
    length: 24,
    keyboard: GRAND_KEYBOARD,
  },
  {
    id: 'grand-bar-1',
    kind: 'bar',
    title: 'Nota Barmeni',
    description: 'Üst tezgahlar sağ el, alt tezgahlar sol el',
    clef: 'treble',
    grand: true,
    notes: [...notes('C3', 'G3'), ...notes('C4', 'G4')],
    length: 20,
    keyboard: GRAND_KEYBOARD,
  },
  {
    id: 'grand-melody-1',
    kind: 'melody',
    title: 'Eller Sırayla',
    description: 'Bir el sorar, öbür el cevap verir',
    clef: 'treble',
    grand: true,
    notes: [],
    length: 0,
    keyboard: GRAND_KEYBOARD,
    melodies: [
      { title: 'Merdiven', notes: 'C3 D3 E3 F3 G3 C4 D4 E4 F4 G4 F4 E4 D4 C4 G3 F3 E3 D3 C3' },
      {
        title: 'Ufak Kuzu ve Yankısı',
        notes: 'E4 D4 C4 D4 E4 E4 E4 E3 D3 C3 D3 E3 E3 E3 D4 D4 D4 E4 G4 G4 D3 D3 D3 E3 G3 G3',
      },
    ],
  },
  {
    id: 'grand-hands-1',
    kind: 'melody',
    title: 'İki El Birlikte',
    description: 'İki tuşa aynı anda bas',
    clef: 'treble',
    grand: true,
    notes: [],
    length: 0,
    keyboard: GRAND_KEYBOARD,
    melodies: [
      { title: 'Ayna', notes: 'C3+C4 D3+D4 E3+E4 F3+F4 G3+G4 F3+F4 E3+E4 D3+D4 C3+C4' },
      { title: 'Zıt Yön', notes: 'G3+C4 F3+D4 E3+E4 D3+F4 C3+G4 D3+F4 E3+E4 F3+D4 G3+C4' },
    ],
  },
  {
    id: 'grand-bar-2',
    kind: 'bar',
    title: 'Barmen: Yoğun Akşam',
    description: 'Orta Do iki tezgaha da gelir, müşteriler hızlı',
    clef: 'treble',
    grand: true,
    notes: notes('C3', 'C5'),
    bothStaves: [parseNote('C4')],
    length: 30,
    keyboard: GRAND_KEYBOARD,
  },
  {
    id: 'grand-hands-2',
    kind: 'melody',
    title: 'Melodi ve Bas',
    description: 'Sağ el melodi, sol el bas notaları',
    clef: 'treble',
    grand: true,
    notes: [],
    length: 0,
    keyboard: GRAND_KEYBOARD,
    melodies: [
      { title: 'Neşeye Övgü', notes: 'E4+C3 E4 F4 G4 G4+G3 F4 E4 D4 C4+C3 C4 D4 E4 E4+G3 D4 D4' },
      {
        title: 'Küçük Yıldız',
        notes: 'C4+C3 C4 G4+E3 G4 A4+F3 A4 G4+E3 F4+D3 F4 E4+C3 E4 D4+G3 D4 C4+C3',
      },
    ],
  },
]
