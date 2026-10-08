import { type Clef, parseNote, whiteKeysBetween } from '../../music/notes'
import type { RhythmValue } from '../../rhythm/rhythm'
import type { TempoLadderSpec } from '../../rhythm/tempoLadder'
import type { ArpeggioPart } from '../chords/arpeggio'
import type { ChordSpec } from '../chords/lessons'
import type { MemorySpec } from '../memory/engine'
import type { ScalePart } from '../scales/steps'
import type { TheorySpec } from '../theory/quiz'
import { withKeyboards } from './keyboard'

/**
 * How a lesson is played: the staff drill, a melody read note by note, a
 * rhythm exercise, one of the arcade games or a theory lesson with a quiz.
 */
export type LessonKind =
  | 'theory'
  | 'drill'
  | 'melody'
  | 'bird'
  | 'balloon'
  | 'bar'
  | 'rhythm'
  | 'dino'
  | 'drum'
  | 'scale'
  | 'ladder'
  | 'memory'
  | 'chord'
  | 'chef'
  | 'space'
  | 'chordbar'
  | 'arpeggio'
  | 'surf'

/** Kinds played against a metronome. */
export const BEAT_KINDS: LessonKind[] = ['rhythm', 'dino', 'drum', 'ladder', 'surf']

/**
 * Kinds whose notes are known in advance (scales, memory runs, arpeggios) or
 * that are judged per chord: kept out of the note-reading statistics.
 */
export const PATTERN_KINDS: LessonKind[] = [
  'theory',
  'scale',
  'ladder',
  'memory',
  'chord',
  'chef',
  'space',
  'chordbar',
  'arpeggio',
  'surf',
]

/** Chord kinds: judged per chord, reported with the chord card. */
export const CHORD_KINDS: LessonKind[] = ['chord', 'chef', 'space', 'chordbar']

export interface RhythmSpec {
  bpm: number
  beatsPerBar: number
  bars: number
  /** Values the random bars are made of. */
  values: RhythmValue[]
  /** Any key counts; only the timing is judged. */
  anyKey?: boolean
  /** Tempo merdiveni: the same plan again at rising tempos. */
  tempoLadder?: TempoLadderSpec
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
  /** Scale and Gam Merdiveni lessons: the scales, played in order. */
  scales?: ScalePart[]
  /** Melodi Hafızası: run lengths; `notes` is the scale the runs are made of. */
  memory?: MemorySpec
  /** Chord lessons (drill, Akor Aşçısı, Uzay Savunması): the chords and how they are judged. */
  chords?: ChordSpec
  /** Arpeggio and Arpej Sörfü lessons: the arpeggios, played in order. */
  arpeggios?: ArpeggioPart[]
  /** Theory lessons: the explanation cards and the quiz. */
  theory?: TheorySpec
  /** Drill: new notes shown one by one (staff, key, where it sits) before the drill starts. */
  introduce?: number[]
  /** Drill: notes asked twice as often (the ones just introduced). */
  focus?: number[]
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

export const TREBLE_LESSONS: NoteLesson[] = withKeyboards([
  {
    id: 'treble-1',
    title: 'İlk Adımlar',
    description: 'Do, Re, Mi, Fa, Sol',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('G4')),
    length: 15,
  },
  {
    id: 'treble-2',
    title: 'Bir Oktav',
    description: "Orta Do'dan bir üst Do'ya",
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('C5')),
    length: 20,
  },
  {
    id: 'treble-bird-1',
    kind: 'bird',
    title: 'Nota Kuşu',
    description: 'Kuşu borulardaki boşluğun notasına uçur',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('C5')),
    length: 15,
  },
  {
    id: 'treble-3',
    title: 'Çizgiler',
    description: 'Mi, Sol, Si, Re, Fa',
    clef: 'treble',
    notes: ['E4', 'G4', 'B4', 'D5', 'F5'].map(parseNote),
    length: 20,
  },
  {
    id: 'treble-4',
    title: 'Aralar',
    description: 'Fa, La, Do, Mi',
    clef: 'treble',
    notes: ['F4', 'A4', 'C5', 'E5'].map(parseNote),
    length: 20,
  },
  {
    id: 'treble-balloon-1',
    kind: 'balloon',
    title: 'Balon Patlatma',
    description: 'Balonlar kaçmadan notalarını çal',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('E4'), parseNote('F5')),
    length: 20,
  },
  {
    id: 'treble-5',
    title: 'Porte Ustası',
    description: 'Do4 ile Sol5 arasındaki tüm notalar',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('G5')),
    length: 25,
  },
  {
    id: 'treble-bird-2',
    kind: 'bird',
    title: 'Nota Kuşu: Usta',
    description: 'Ek çizgiler dahil, daha hızlı borular',
    clef: 'treble',
    notes: whiteKeysBetween(parseNote('C4'), parseNote('G5')),
    length: 25,
  },
])
