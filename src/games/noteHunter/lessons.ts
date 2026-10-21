import type { PiecePart } from '../keys/piece'
import { type Clef, parseNote, whiteKeysBetween } from '../../music/notes'
import type { RhythmValue } from '../../rhythm/rhythm'
import type { Tune } from '../../rhythm/plan'
import type { TempoLadderSpec } from '../../rhythm/tempoLadder'
import type { BossSpec } from '../boss/bosses'
import type { MixSpec } from '../../progress/mix'
import type { ArpeggioPart } from '../chords/arpeggio'
import type { ChordSpec } from '../chords/lessons'
import type { EarSpec } from '../ear/session'
import type { DuetSpec } from '../duet/session'
import type { MemorySpec } from '../memory/engine'
import type { ScalePart } from '../scales/steps'
import type { SongSpec } from '../songs/song'
import type { TheorySpec } from '../theory/quiz'
import { withKeyboards } from './keyboard'
import {
  ALOUETTE,
  BRAHMS_LULLABY,
  GOING_HOME,
  MORNING_MOOD,
  OLD_MACDONALD,
  ROW_BOAT,
  SUSANNA,
  tunePitches,
} from '../arcade/train/tunes'

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
  | 'ear'
  | 'waterfall'
  | 'etude'
  | 'boss'
  | 'mix'
  | 'train'
  | 'chirp'
  | 'frog'
  | 'duet'

/** Kinds played against a metronome. */
export const BEAT_KINDS: LessonKind[] = ['rhythm', 'dino', 'drum', 'ladder', 'surf']

/**
 * Kinds whose notes are known in advance (scales, memory runs, arpeggios) or
 * that are judged per chord: kept out of the note-reading statistics.
 */
export const PATTERN_KINDS: LessonKind[] = [
  'boss',
  'mix',
  'waterfall',
  'etude',
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
  'ear',
  'chirp',
  'frog',
  'duet',
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
  /** Fixed bars ("q q h | h h") played in turn until `bars` is filled, instead of random ones. */
  pattern?: string
  /** Yankı: the app plays each bar of `pattern` first, then the learner plays it back. `bars` counts the learner's bars. */
  echo?: boolean
  /** A song: its rhythm, and with `anyKey` off its notes, instead of random bars; `bars` is unused. */
  tune?: Tune
  /** Light the next note's key on the keyboard (songs played with their notes). */
  guide?: boolean
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
  /** Ton parçası: a song carried into a key, read from the staff with the key signature. */
  piece?: PiecePart
  /** Kulak Dedektifi: the cases to solve by ear. */
  ear?: EarSpec
  /** Nota Şelalesi: the song, the hands and the mode. Rhythm mode also has `rhythm` (tempo, metronome). */
  song?: SongSpec
  /** Unit boss: the boss and its phases (lessons of the unit, shortened). */
  boss?: BossSpec
  /** Günün Karışımı: the phases built from the due spaced-repetition cards. */
  mix?: MixSpec
  /** Theory lessons: the explanation cards and the quiz. */
  theory?: TheorySpec
  /** Drill: new notes shown one by one (staff, key, where it sits) before the drill starts. */
  introduce?: number[]
  /** Drill: notes asked twice as often (the ones just introduced). */
  focus?: number[]
  /** Çift Kişilik Davul: Notiş's calls and the turns (copy or answer freely). */
  duet?: DuetSpec
  /** Kurbağa Atlayışı: the note the frog starts on and the jump sizes (2 = to the neighbour, 3 = a third...). */
  frog?: { start: number; sizes: number[] }
  /** Nota Treni: songs whose notes ride the wagons, in order (otherwise `notes` are drawn at random). */
  tunes?: Tune[]
  /** Semitones the songs are moved by (Oyun Salonu plays them an octave down on the bass staff). */
  tuneShift?: number
  /** Oyun Salonu: the game and skill picked; endless games run until the hearts are gone. */
  salon?: { game: LessonKind; skill: string; endless: boolean }
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

/** Nota Treni: the songs' notes ride the wagons in order. */
function trainLesson(id: string, title: string, tunes: Tune[]): Omit<NoteLesson, 'keyboard'> {
  const pitches = tunes.flatMap(tunePitches)
  return {
    id,
    kind: 'train',
    title,
    description: `Vagonlardaki notaları sırayla çal, şarkı çıksın: ${tunes.map((t) => t.original).join(', ')}`,
    clef: 'treble',
    notes: [...new Set(pitches)].sort((a, b) => a - b),
    length: pitches.length,
    tunes,
  }
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
  trainLesson('treble-train-1', 'Nota Treni', [GOING_HOME, ROW_BOAT, OLD_MACDONALD]),
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
  trainLesson('treble-train-2', 'Nota Treni: Ekspres', [MORNING_MOOD, SUSANNA, ALOUETTE, BRAHMS_LULLABY]),
])
