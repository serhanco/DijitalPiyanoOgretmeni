import { parseNote, whiteKeysBetween } from '../../music/notes'
import type { NoteLesson } from './lessons'
import { withKeyboards } from './keyboard'

const notes = (low: string, high: string) => whiteKeysBetween(parseNote(low), parseNote(high))

/** Unit 3: the bass clef, read and played with the left hand. */
export const BASS_LESSONS: NoteLesson[] = withKeyboards([
  {
    id: 'bass-1',
    title: 'Sol El: İlk Adımlar',
    description: 'Do, Re, Mi, Fa, Sol (fa anahtarı)',
    clef: 'bass',
    notes: notes('C3', 'G3'),
    length: 15,
  },
  {
    id: 'bass-2',
    title: "Orta Do'ya Kadar",
    description: "Do3'ten Orta Do'ya bir oktav",
    clef: 'bass',
    notes: notes('C3', 'C4'),
    length: 20,
  },
  {
    id: 'bass-bird-1',
    kind: 'bird',
    title: 'Nota Kuşu: Fa Anahtarı',
    description: 'Kuşu fa anahtarındaki boşluğa uçur',
    clef: 'bass',
    notes: notes('C3', 'C4'),
    length: 15,
  },
  {
    id: 'bass-melody-1',
    kind: 'melody',
    title: 'Sol El Melodileri',
    description: 'Ufak Kuzu ve Neşeye Övgü, sol elle',
    clef: 'bass',
    notes: notes('C3', 'G3'),
    length: 0,
    melodies: [
      { title: 'Ufak Kuzu', notes: 'E3 D3 C3 D3 E3 E3 E3 D3 D3 D3 E3 G3 G3' },
      { title: 'Neşeye Övgü', notes: 'E3 E3 F3 G3 G3 F3 E3 D3 C3 C3 D3 E3 E3 D3 D3' },
    ],
  },
  {
    id: 'bass-3',
    title: 'Fa Çizgileri',
    description: 'Sol, Si, Re, Fa, La',
    clef: 'bass',
    notes: ['G2', 'B2', 'D3', 'F3', 'A3'].map(parseNote),
    length: 20,
  },
  {
    id: 'bass-4',
    title: 'Fa Araları',
    description: 'La, Do, Mi, Sol',
    clef: 'bass',
    notes: ['A2', 'C3', 'E3', 'G3'].map(parseNote),
    length: 20,
  },
  {
    id: 'bass-balloon-1',
    kind: 'balloon',
    title: 'Balon: Fa Anahtarı',
    description: 'Fa anahtarındaki balonları patlat',
    clef: 'bass',
    notes: notes('G2', 'A3'),
    length: 20,
  },
  {
    id: 'bass-5',
    title: 'Fa Anahtarı Ustası',
    description: 'Mi2 ile Orta Do arasındaki tüm notalar',
    clef: 'bass',
    notes: notes('E2', 'C4'),
    length: 25,
  },
  {
    id: 'bass-melody-2',
    kind: 'melody',
    title: 'Sol El: Yeni Ezgiler',
    description: 'Küçük Yıldız ve Uyuyor musun?',
    clef: 'bass',
    notes: notes('C3', 'A3'),
    length: 0,
    melodies: [
      { title: 'Küçük Yıldız', notes: 'C3 C3 G3 G3 A3 A3 G3 F3 F3 E3 E3 D3 D3 C3' },
      { title: 'Uyuyor musun?', notes: 'C3 D3 E3 C3 C3 D3 E3 C3 E3 F3 G3 E3 F3 G3' },
    ],
  },
  {
    id: 'bass-bird-2',
    kind: 'bird',
    title: 'Nota Kuşu: Fa Ustası',
    description: 'Ek çizgiler dahil, daha hızlı borular',
    clef: 'bass',
    notes: notes('E2', 'C4'),
    length: 25,
  },
])
