// What the ear lessons ask about: intervals (with a copyright-free song that
// starts with each one, to remember it by) and chord colours. Chords here are
// only heard, so they are plain semitone shapes, not spelled chords.

export interface IntervalInfo {
  semitones: number
  /** Turkish name ("Büyük üçlü"). */
  name: string
  short: string
  /** A copyright-free song whose first two notes make this interval (going up unless `way` says otherwise). */
  song?: { title: string; original: string; origin: string; way?: 'down' | 'together' }
}

export const INTERVALS: IntervalInfo[] = [
  {
    semitones: 1,
    name: 'Küçük ikili',
    short: 'k2',
    song: { title: 'Elise İçin', original: 'Für Elise', origin: 'Ludwig van Beethoven, 1810', way: 'down' },
  },
  {
    semitones: 2,
    name: 'Büyük ikili',
    short: 'B2',
    song: { title: 'Uyuyor musun?', original: 'Frère Jacques', origin: 'Fransız halk şarkısı, 18. yüzyıl' },
  },
  {
    semitones: 3,
    name: 'Küçük üçlü',
    short: 'k3',
    song: { title: 'Yeşil Yenler', original: 'Greensleeves', origin: 'İngiliz halk ezgisi, 16. yüzyıl' },
  },
  {
    semitones: 4,
    name: 'Büyük üçlü',
    short: 'B3',
    song: {
      title: 'Azizler Yürürken',
      original: 'When the Saints Go Marching In',
      origin: 'Amerikan ilahisi (spiritüel), 19. yüzyıl',
    },
  },
  {
    semitones: 5,
    name: 'Tam dörtlü',
    short: 'T4',
    song: { title: 'Gelin Korosu', original: 'Treulich geführt', origin: 'Richard Wagner, Lohengrin, 1850' },
  },
  {
    semitones: 6,
    name: 'Artık dörtlü',
    short: 'A4',
    song: { title: 'Ölüm Dansı', original: 'Danse macabre', origin: 'Camille Saint-Saëns, 1874', way: 'together' },
  },
  {
    semitones: 7,
    name: 'Tam beşli',
    short: 'T5',
    song: { title: 'Küçük Yıldız', original: 'Ah ! vous dirai-je, maman', origin: 'Fransız halk ezgisi, 1761' },
  },
  {
    semitones: 9,
    name: 'Büyük altılı',
    short: 'B6',
    song: {
      title: 'Bonnie Okyanusun Ötesinde',
      original: 'My Bonnie Lies over the Ocean',
      origin: 'İskoç halk şarkısı, 19. yüzyıl',
    },
  },
  { semitones: 12, name: 'Oktav', short: '8' },
]

export function intervalInfo(semitones: number): IntervalInfo {
  const info = INTERVALS.find((i) => i.semitones === semitones)
  if (!info) throw new Error(`Unknown interval: ${semitones}`)
  return info
}

/** Melodic going up, melodic going down, or both notes together. */
export type Direction = 'up' | 'down' | 'together'

export const DIRECTION_LABELS: Record<Direction, string> = {
  up: 'Çıkan aralıklar',
  down: 'İnen aralıklar',
  together: 'Aynı anda çalınan aralıklar',
}

export type ChordColour = 'major' | 'minor' | 'dim' | 'aug' | 'dom7' | 'maj7' | 'min7'

export const CHORD_SHAPES: Record<ChordColour, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
}

export const COLOUR_LABELS: Record<ChordColour, string> = {
  major: 'Majör',
  minor: 'Minör',
  dim: 'Eksik',
  aug: 'Artık',
  dom7: 'Dominant yedili',
  maj7: 'Majör yedili',
  min7: 'Minör yedili',
}

/** How each colour sounds, said after a wrong answer. */
export const COLOUR_HINTS: Record<ChordColour, string> = {
  major: 'Majör parlak ve neşeli duyulur.',
  minor: 'Minör hüzünlü, düşünceli duyulur.',
  dim: 'Eksik akor gergin ve dar duyulur, sanki bir yere sıkışmış gibi.',
  aug: 'Artık akor havada asılı, rüya gibi duyulur; hiçbir yere oturmaz.',
  dom7: 'Dominant yedili bir soru gibidir: bir yere çözülmek ister.',
  maj7: 'Majör yedili yumuşak ve caz gibi duyulur; en üstte bir ışıltı var.',
  min7: 'Minör yedili hüzünlü ama yumuşak, sakin duyulur.',
}
