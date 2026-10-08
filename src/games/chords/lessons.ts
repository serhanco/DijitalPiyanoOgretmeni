import {
  type ChordHands,
  type ChordQuality,
  type ChordTarget,
  chordTarget,
  type Inversion,
  progression,
} from '../../music/chords'
import type { TempoLadderSpec } from '../../rhythm/tempoLadder'
import type { NoteLesson } from '../noteHunter/lessons'
import { stepsKeyboard } from '../scales/steps'
import { type ArpeggioPart, arpeggioSteps, SURF_BEATS_PER_BAR, surfPartBeats } from './arpeggio'
import type { ChordMatchMode } from './session'

export interface ChordSpec {
  chords: ChordTarget[]
  /** This many chords drawn at random from `chords`; otherwise `chords` in order, `repeat` times. */
  draw?: number
  repeat?: number
  mode: ChordMatchMode
  /** Show the chord's name and fingers while playing (otherwise it is read from the staff). */
  showName: boolean
  /** Akor Aşçısı: list the notes on the recipe too. */
  showNotes?: boolean
  /** Progressions: the degrees in order, shown above the staff. */
  progression?: string[]
  /** Heard, not read: the chord is played, its root lit; the player finds its kind. */
  byEar?: boolean
}

const same = (a: ChordTarget, b: ChordTarget) =>
  a.notes.length === b.notes.length && a.notes.every((n, i) => n.midi === b.notes[i].midi)

/** The chords of one play: drawn at random (never the same chord twice in a row) or in order. */
export function chordSequence(spec: ChordSpec, random: () => number = Math.random): ChordTarget[] {
  if (!spec.draw) return Array.from({ length: spec.repeat ?? 1 }, () => spec.chords).flat()
  const out: ChordTarget[] = []
  while (out.length < spec.draw) {
    const i = Math.floor(random() * spec.chords.length)
    const prev = out[out.length - 1]
    // The same chord again: take the next one in the list instead.
    out.push(prev && same(prev, spec.chords[i]) ? spec.chords[(i + 1) % spec.chords.length] : spec.chords[i])
  }
  return out
}

/** The keyboard for a lesson's chords. */
export const chordKeyboard = (chords: ChordTarget[]) =>
  stepsKeyboard([{ melody: 0, notes: chords.flatMap((c) => c.notes.map((n) => ({ midi: n.midi, clef: n.clef }))) }])

const triads = (names: string[], inversions: Inversion[] = [0], hands: ChordHands = 'right'): ChordTarget[] =>
  names.flatMap((name) => {
    const minor = name.endsWith('m')
    const root = minor ? name.slice(0, -1) : name
    return inversions.map((inv) => chordTarget(root, minor ? 'minor' : 'major', inv, hands))
  })

const sevenths = (list: [string, ChordQuality][]): ChordTarget[] => list.map(([root, q]) => chordTarget(root, q))

type Kind = 'chord' | 'chef' | 'space' | 'chordbar'

function chordLesson(kind: Kind, id: string, title: string, description: string, spec: ChordSpec): NoteLesson {
  const left = spec.chords.every((c) => c.hands === 'left')
  const both = spec.chords.some((c) => c.hands === 'both')
  return {
    id,
    kind,
    title,
    description,
    clef: left ? 'bass' : 'treble',
    ...(both && { grand: true }),
    notes: [],
    length: spec.draw ?? spec.chords.length * (spec.repeat ?? 1),
    keyboard: chordKeyboard(spec.chords),
    chords: spec,
  }
}

const progressionLesson = (
  id: string,
  title: string,
  description: string,
  keys: string[],
  numerals: string[],
  hands: 'right' | 'both',
  repeat = 1,
) =>
  chordLesson('chord', id, title, description, {
    chords: keys.flatMap((key) => progression(key, numerals, { hands })),
    repeat,
    mode: 'exact',
    showName: true,
    progression: numerals,
  })

function arpeggioLesson(id: string, title: string, description: string, arpeggios: ArpeggioPart[]): NoteLesson {
  return {
    id,
    kind: 'arpeggio',
    title,
    description,
    clef: arpeggios.every((a) => a.hands === 'left') ? 'bass' : 'treble',
    grand: arpeggios.some((a) => a.hands === 'parallel'),
    notes: [],
    length: 0,
    keyboard: stepsKeyboard(arpeggioSteps(arpeggios)),
    arpeggios,
  }
}

/** Arpej Sörfü: arpeggios on the metronome in 3/4, one note per beat. */
function surfLesson(
  id: string,
  title: string,
  description: string,
  bpm: number,
  arpeggios: ArpeggioPart[],
  tempoLadder?: TempoLadderSpec,
): NoteLesson {
  const beats = arpeggios.reduce((n, a) => n + surfPartBeats(a), 0)
  return {
    ...arpeggioLesson(id, title, description, arpeggios),
    kind: 'surf',
    rhythm: {
      bpm,
      beatsPerBar: SURF_BEATS_PER_BAR,
      bars: beats / SURF_BEATS_PER_BAR,
      values: ['q'],
      ...(tempoLadder && { tempoLadder }),
    },
  }
}

const arp = (
  root: string,
  quality: ArpeggioPart['quality'],
  hands: ArpeggioPart['hands'],
  octaves: 1 | 2 = 1,
): ArpeggioPart => ({ root, quality, hands, ...(octaves === 2 && { octaves }) })

const ALL_INVERSIONS: Inversion[] = [0, 1, 2]

/**
 * Unit 6: chords. Major then minor triads (right hand, then left), their
 * inversions, arpeggios, progressions with smooth voice leading for one and
 * two hands, and seventh chords. Akor Aşçısı, Uzay Savunması and Arpej
 * Sörfü play the same skills as games.
 */
export const CHORD_LESSONS: NoteLesson[] = [
  chordLesson('chord', 'chord-major', 'Majör Üçlüler', 'Do, Fa ve Sol Majör: üç notayı birlikte bas', {
    chords: triads(['C', 'F', 'G']),
    draw: 12,
    mode: 'exact',
    showName: true,
  }),
  chordLesson('chef', 'chord-chef-1', 'Akor Aşçısı', 'Tarifteki notaları aynı anda bas, yemek pişsin', {
    chords: triads(['C', 'F', 'G']),
    draw: 10,
    mode: 'pcs',
    showName: true,
    showNotes: true,
  }),
  chordLesson('chord', 'chord-minor', 'Minör Üçlüler', 'La, Re ve Mi Minör: ortadaki nota yarım ses aşağıda', {
    chords: triads(['Am', 'Dm', 'Em', 'C']),
    draw: 12,
    mode: 'exact',
    showName: true,
  }),
  chordLesson('chord', 'chord-left', 'Sol Elle Akorlar', 'Fa anahtarında 5-3-1 parmaklarıyla', {
    chords: triads(['C', 'F', 'G', 'Am'], [0], 'left'),
    draw: 10,
    mode: 'exact',
    showName: true,
  }),
  chordLesson('space', 'chord-space-1', 'Uzay Savunması', 'İstilacının akorunu çal, lazer ateşlensin', {
    chords: triads(['C', 'F', 'G', 'Am', 'Dm', 'Em']),
    draw: 14,
    mode: 'voicing',
    showName: true,
  }),
  chordLesson('chordbar', 'chord-bar-1', 'Akor Barmeni', 'Müşteriler akor ister: çal, içecek kaysın', {
    chords: triads(['C', 'F', 'G', 'Am', 'Dm', 'Em']),
    draw: 12,
    mode: 'voicing',
    showName: true,
  }),
  chordLesson('chord', 'chord-ear', 'Kulaktan Akor', 'Duyduğun akor majör mü minör mü? Kök notadan bul', {
    chords: triads(['C', 'Cm', 'F', 'Fm', 'G', 'Gm', 'A', 'Am', 'D', 'Dm']),
    draw: 12,
    mode: 'voicing',
    showName: false,
    byEar: true,
  }),
  chordLesson('chord', 'chord-inversions', 'Akor Çevrimleri', 'Aynı akor üç şekilde: kök durum, 1. ve 2. çevrim', {
    chords: triads(['C', 'F', 'G'], ALL_INVERSIONS),
    mode: 'exact',
    showName: true,
  }),
  chordLesson('chord', 'chord-inversions-read', 'Çevrimleri Oku', 'Adı yazmıyor: akoru portede tanı', {
    chords: triads(['C', 'F', 'G', 'Am'], ALL_INVERSIONS),
    draw: 12,
    mode: 'exact',
    showName: false,
  }),
  chordLesson('chef', 'chord-chef-2', 'Aşçı: Çevrimler', 'Tarif çevrimi söylüyor: en alttaki notaya dikkat', {
    chords: triads(['C', 'F', 'G', 'Am', 'Dm'], ALL_INVERSIONS),
    draw: 10,
    mode: 'voicing',
    showName: true,
  }),
  chordLesson('space', 'chord-space-2', 'Uzay: Çevrimler', 'İstilacılar çevrimlerle geliyor', {
    chords: triads(['C', 'F', 'G', 'Am'], ALL_INVERSIONS),
    draw: 16,
    mode: 'voicing',
    showName: false,
  }),
  arpeggioLesson('arpeggio-1', 'Arpejler', 'Akorun notaları sırayla: 1-2-3-5', [
    arp('C', 'major', 'right'),
    arp('G', 'major', 'right'),
    arp('C', 'major', 'left'),
  ]),
  surfLesson('surf-1', 'Arpej Sörfü', 'Her vuruşta bir nota, dalgada kal', 66, [
    arp('C', 'major', 'right'),
    arp('G', 'major', 'right'),
  ]),
  progressionLesson(
    'progression-1',
    'I – IV – V – I',
    'Çevrimlerle yakın geçişler: el neredeyse yerinde kalır',
    ['C'],
    ['I', 'IV', 'V', 'I'],
    'right',
    2,
  ),
  progressionLesson(
    'progression-hands',
    'İki El: I – IV – V – I',
    'Sol el kök notayı, sağ el akoru çalar',
    ['C', 'G'],
    ['I', 'IV', 'V', 'I'],
    'both',
  ),
  arpeggioLesson('arpeggio-hands', 'İki Elle Arpej', 'Do Majör ve La Minör, iki el birlikte', [
    arp('C', 'major', 'parallel'),
    arp('A', 'minor', 'parallel'),
  ]),
  progressionLesson(
    'progression-pop',
    'I – V – vi – IV',
    'Pop şarkılarının ilerlemesi, iki elle',
    ['C'],
    ['I', 'V', 'vi', 'IV'],
    'both',
    2,
  ),
  chordLesson('chord', 'chord-sevenths', 'Yedili Akorlar', 'Dört nota: Sol7, Do Majör 7, Re Minör 7', {
    chords: sevenths([
      ['G', 'dom7'],
      ['C', 'maj7'],
      ['D', 'min7'],
      ['F', 'maj7'],
      ['A', 'min7'],
    ]),
    draw: 10,
    mode: 'exact',
    showName: true,
  }),
  chordLesson('chord', 'chord-ear-7', 'Kulaktan Yedililer', 'Majör, minör ya da yedili: kulağın söylesin', {
    chords: [
      ...triads(['C', 'Dm', 'G', 'Am']),
      ...sevenths([
        ['G', 'dom7'],
        ['C', 'dom7'],
        ['D', 'min7'],
        ['C', 'maj7'],
      ]),
    ],
    draw: 12,
    mode: 'voicing',
    showName: false,
    byEar: true,
  }),
  progressionLesson(
    'progression-v7',
    'I – IV – V7 – I',
    'Sol7 ile eve dönüş, iki elle',
    ['C', 'F'],
    ['I', 'IV', 'V7', 'I'],
    'both',
  ),
  chordLesson('chef', 'chord-chef-3', 'Aşçı: Yedililer', 'Üçlüler ve yedililer, yalnızca adlarıyla', {
    chords: [
      ...sevenths([
        ['G', 'dom7'],
        ['C', 'maj7'],
        ['D', 'min7'],
      ]),
      ...triads(['Am', 'F', 'Em']),
    ],
    draw: 10,
    mode: 'pcs',
    showName: true,
  }),
  surfLesson(
    'surf-tempo',
    'Sörf: Tempo Merdiveni',
    'İki oktav arpej, her turda daha hızlı',
    60,
    [arp('C', 'major', 'right', 2)],
    { rounds: 3, stepBpm: 12 },
  ),
  surfLesson('surf-hands', 'Sörf: İki El', 'İki el aynı dalgada', 60, [
    arp('C', 'major', 'parallel'),
    arp('A', 'minor', 'parallel'),
  ]),
  chordLesson('chordbar', 'chord-bar-2', 'Barmen: İki El', 'Üst tezgâhlar sağ el, alt tezgâhlar sol el; çevrimlerle', {
    chords: [...triads(['C', 'F', 'G', 'Am'], ALL_INVERSIONS), ...triads(['C', 'F', 'G', 'Am'], [0], 'left')],
    draw: 14,
    mode: 'voicing',
    showName: false,
  }),
]
