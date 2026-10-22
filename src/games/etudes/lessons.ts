// The Etüt Kitaplığı: classical pieces read from the score, in levels. Every
// piece is learnt in short phrases with one hand in the waiting mode, then with
// both hands, then on the metronome. A level opens with a star in the level
// before it; inside a level the lessons open in order.

import type { NoteLesson } from '../noteHunter/lessons'
import type { Song, SongSpec } from '../songs/song'
import type { TheorySpec } from '../theory/quiz'
import {
  ARIA,
  BURG_ARABESQUE,
  BURG_BERGERONNETTE,
  BURG_CANDEUR,
  BURG_CONSOLATION,
  BURG_FLEUR,
  BURG_GRACIEUSE,
  BURG_INNOCENCE,
  BURG_PASTORALE,
  BURG_PLAINTE,
  BURG_PROGRES,
  BURG_REUNION,
  CZERNY_17,
  CZERNY_2,
  CZERNY_8,
  CZERNY_840_1,
  CZERNY_840_6,
  KUHLAU_ANDANTE,
  MENUET_BB,
  MENUET_G,
  MENUET_GM,
  MORNING_PRAYER,
  MUSETTE,
  OLD_FRENCH_SONG,
  PLEYEL_MENUETT,
  WOODEN_SOLDIERS,
} from './catalog'
import { etudePart, fivePiece, hanonPiece } from './part'

export const ETUDE_PREFIX = 'etude-'

/** An étude lesson on bars given from 1, as printed. */
const part = (
  slug: string,
  song: Song,
  hands: SongSpec['hands'],
  mode: SongSpec['mode'],
  bars: [number, number],
  title: string,
) => etudePart(`${ETUDE_PREFIX}${slug}`, song, hands, mode, bars, title)

const INTRO: TheorySpec = {
  cards: [
    {
      title: 'Partisyon',
      text: 'Piyano müziği iki porteye yazılır: üstteki Sol anahtarlı porte sağ elin, alttaki Fa anahtarlı porte sol elin. Soldaki büyük parantez ikisini birlikte okuyacağını söyler.',
      art: { kind: 'score', piece: MENUET_G.id, bars: [0, 1] },
    },
    {
      title: 'Ölçüler',
      text: 'Dikey çizgiler müziği ölçülere böler. Baştaki 3/4 her ölçüde üç dörtlük vuruş olduğunu söyler; 2/4 iki vuruş, 4/4 dört vuruş.',
      art: { kind: 'rhythm', pattern: 'q e e e e | q q q', beatsPerBar: 3 },
    },
    {
      title: 'On altılıklar',
      text: 'Kuyruğunda iki çizgi olan nota on altılıktır: bir vuruşa dört tane sığar. Czerny’nin alıştırmaları bu hızlı notalarla parmakları eşitler.',
      art: { kind: 'score', piece: CZERNY_8.id, bars: [0, 1] },
    },
    {
      title: 'Yaylar',
      text: 'Farklı notaları birleştiren yay legato demektir: notaları kesmeden, birbirine bağlayarak çal. Aynı iki notayı birleştiren yay uzatma bağıdır: ikinci notaya yeniden basma, ilkini uzat. Notanın üstündeki nokta ise kısa, kesik çal demek.',
    },
    {
      title: 'Parmak numaraları',
      text: 'Notanın yanındaki küçük sayı hangi parmakla çalacağını söyler: 1 başparmak, 5 serçe parmak. Eski ustaların önerisidir; parmaklar doğru olunca zor yerler kolaylaşır.',
      art: { kind: 'hand', hand: 'right' },
    },
    {
      title: 'Notalar seni bekler',
      text: 'Önce her el ayrı, kısa cümlelerle: partisyon sen doğru tuşlara basana kadar bekler, çaldığın notalar yeşile döner. Sonra iki elle, en son metronomla. İstersen 🌊 Şelale düğmesiyle düşen notalara geçebilirsin.',
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'staves',
      prompt: 'Alttaki Fa anahtarlı porteyi hangi elle çalarsın?',
      options: ['Sağ el', 'Sol el'],
      answer: 1,
      explain: 'Üst porte sağ elin, alt porte sol elin.',
    },
    {
      type: 'choice',
      topic: 'bars',
      prompt: '3/4 ölçünün her ölçüsünde kaç vuruş var?',
      options: ['İki', 'Üç', 'Dört'],
      answer: 1,
      explain: 'Üstteki sayı vuruş sayısıdır: 3/4, her ölçüde üç dörtlük vuruş.',
    },
    {
      type: 'choice',
      topic: 'sixteenths',
      prompt: 'Bir vuruşa kaç on altılık sığar?',
      options: ['İki', 'Dört', 'Sekiz'],
      answer: 1,
      explain: 'Bir dörtlük iki sekizlik, bir sekizlik iki on altılık eder: bir vuruşta dört on altılık.',
    },
    {
      type: 'choice',
      topic: 'ties',
      prompt: 'Aynı iki notayı birleştiren yay (uzatma bağı) ne demek?',
      options: ['İkinci notaya yeniden bas', 'İlk notayı uzat, ikinciye basma', 'Notaları kesik çal'],
      answer: 1,
      explain: 'Uzatma bağı iki notanın süresini toplar: tuş basılı kalır.',
    },
    {
      type: 'choice',
      topic: 'fingers',
      prompt: 'Notanın yanındaki 1 hangi parmak?',
      options: ['Başparmak', 'İşaret parmağı', 'Serçe parmak'],
      answer: 0,
      explain: 'Parmaklar başparmaktan serçeye 1’den 5’e sayılır.',
    },
  ],
  topics: {
    staves: 'İki porte',
    bars: 'Ölçüler',
    sixteenths: 'On altılıklar',
    ties: 'Uzatma bağı',
    fingers: 'Parmak numaraları',
  },
}

const intro: NoteLesson = {
  id: `${ETUDE_PREFIX}intro`,
  kind: 'theory',
  title: 'Partisyonu Okumak',
  description: 'İki porte, ölçüler, on altılıklar, yaylar ve parmaklar',
  clef: 'treble',
  notes: [],
  length: INTRO.questions.length,
  keyboard: { low: 60, high: 72 },
  theory: INTRO,
}

export interface EtudeLevel {
  level: number
  title: string
  text: string
  lessons: NoteLesson[]
}

const C = { tonic: 'C', type: 'major' } as const
const STEPS_C = fivePiece('steps', C)
const THIRDS_C = fivePiece('thirds', C)
const EIGHTHS_C = fivePiece('eighths', C)

/** The whole piece (or its first `bars`) given as printed bars. */
const all = (song: Song, bars = song.score!.bars): [number, number] => [1, Math.min(bars, song.score!.bars)]

const hanon = (no: number, hands: SongSpec['hands'], mode: SongSpec['mode'], octaves: 1 | 2 = 1) => {
  const song = hanonPiece(no, 'C', octaves)
  const how = hands === 'both' ? (mode === 'tempo' ? 'Metronomla' : 'İki El') : 'Sağ El'
  return part(
    `hanon-${no}${octaves === 2 ? '-2' : ''}-${hands}-${mode}`,
    song,
    hands,
    mode,
    all(song),
    `${song.title}: ${how}`,
  )
}

export const ETUDE_LEVELS: EtudeLevel[] = [
  {
    level: 1,
    title: 'Beş parmak pozisyonu',
    text: 'Her parmak kendi tuşunda: önce her el ayrı, sonra iki el birlikte, aynı ve ters yönde.',
    lessons: [
      intro,
      part('five-c-steps-right', STEPS_C, 'right', 'wait', all(STEPS_C), 'Basamaklar: Sağ El'),
      part('five-c-steps-left', STEPS_C, 'left', 'wait', all(STEPS_C), 'Basamaklar: Sol El'),
      part('five-c-steps-both', STEPS_C, 'both', 'wait', all(STEPS_C), 'Basamaklar: İki El'),
      part('five-c-thirds-right', THIRDS_C, 'right', 'wait', all(THIRDS_C), 'Üçlü Atlamalar: Sağ El'),
      part('five-c-thirds-both', THIRDS_C, 'both', 'wait', all(THIRDS_C), 'Üçlü Atlamalar: İki El'),
      part('five-c-mirror', fivePiece('mirror', C), 'both', 'wait', [1, 8], 'Ayna: Ters Yönde İki El'),
      part('five-c-song', fivePiece('song', C), 'both', 'wait', [1, 8], 'Melodi ve Eşlik'),
      part('five-c-eighths', EIGHTHS_C, 'both', 'wait', all(EIGHTHS_C), 'Sekizlik Merdiven'),
      part('five-c-eighths-tempo', EIGHTHS_C, 'both', 'tempo', all(EIGHTHS_C), 'Sekizlik Merdiven: Metronomla'),
      part(
        'five-g-steps',
        fivePiece('steps', { tonic: 'G', type: 'major' }),
        'both',
        'wait',
        [1, 8],
        'Sol Pozisyonu: Basamaklar',
      ),
      part(
        'five-f-thirds',
        fivePiece('thirds', { tonic: 'F', type: 'major' }),
        'both',
        'wait',
        [1, 8],
        'Fa Pozisyonu: Üçlüler',
      ),
      part(
        'five-d-waltz',
        fivePiece('waltz', { tonic: 'D', type: 'major' }),
        'both',
        'wait',
        [1, 8],
        'Re Pozisyonu: Küçük Vals',
      ),
      part(
        'five-am-song',
        fivePiece('song', { tonic: 'A', type: 'natural' }),
        'both',
        'wait',
        [1, 8],
        'La Minör: Melodi ve Eşlik',
      ),
    ],
  },
  {
    level: 2,
    title: 'Tek elle ilk cümleler',
    text: 'Menüetlerin ilk ölçüleri, her el ayrı. Partisyon sen basana kadar bekler.',
    lessons: [
      part('menuet-g-right', MENUET_G, 'right', 'wait', [1, 8], 'Sol Majör Menüet: Sağ El'),
      part('menuet-g-left', MENUET_G, 'left', 'wait', [1, 8], 'Sol Majör Menüet: Sol El'),
      part('menuet-g-right-2', MENUET_G, 'right', 'wait', [9, 16], 'Menüetin İkinci Cümlesi'),
      part('menuet-gm-right', MENUET_GM, 'right', 'wait', [1, 8], 'Sol Minör Menüet: Sağ El'),
      part('menuet-gm-left', MENUET_GM, 'left', 'wait', [1, 8], 'Sol Minör Menüet: Sol El'),
      part('aria-right', ARIA, 'right', 'wait', [1, 8], 'Tütün Pipası Aryası: Sağ El'),
      part('aria-left', ARIA, 'left', 'wait', [1, 8], 'Tütün Pipası Aryası: Sol El'),
      part('pleyel-right', PLEYEL_MENUETT, 'right', 'wait', [1, 8], 'Pleyel Menüeti: Sağ El'),
    ],
  },
  {
    level: 3,
    title: 'İki elle menüetler',
    text: 'Aynı parçalar iki elle, önce bekleyen modda, sonra metronomla.',
    lessons: [
      part('menuet-g-both', MENUET_G, 'both', 'wait', [1, 8], 'Sol Majör Menüet: İki El'),
      part('menuet-g-both-2', MENUET_G, 'both', 'wait', [9, 16], 'Sol Majör Menüet: İkinci Cümle'),
      part('menuet-g-b', MENUET_G, 'both', 'wait', [33, 48], 'Sol Majör Menüet: B Bölümü'),
      part('menuet-g-tempo', MENUET_G, 'both', 'tempo', [1, 16], 'Sol Majör Menüet: Metronomla'),
      part('menuet-gm-both', MENUET_GM, 'both', 'wait', [1, 16], 'Sol Minör Menüet: İki El'),
      part('menuet-gm-b', MENUET_GM, 'both', 'wait', [33, 48], 'Sol Minör Menüet: B Bölümü'),
      part('menuet-gm-tempo', MENUET_GM, 'both', 'tempo', [1, 16], 'Sol Minör Menüet: Metronomla'),
      part('aria-both', ARIA, 'both', 'wait', [1, 8], 'Tütün Pipası Aryası: İki El'),
      part('aria-b', ARIA, 'both', 'wait', [17, 24], 'Tütün Pipası Aryası: B Bölümü'),
      part('aria-tempo', ARIA, 'both', 'tempo', [1, 8], 'Tütün Pipası Aryası: Metronomla'),
      part('pleyel-both', PLEYEL_MENUETT, 'both', 'wait', [1, 16], 'Pleyel Menüeti: İki El'),
      part('pleyel-tempo', PLEYEL_MENUETT, 'both', 'tempo', [1, 16], 'Pleyel Menüeti: Metronomla'),
    ],
  },
  {
    level: 4,
    title: 'On altılıklar ve 2/4',
    text: 'İki vuruşlu Musette, hızlı notalarla Si♭ Menüet ve Czerny’nin sekiz ölçülük alıştırmaları.',
    lessons: [
      part('musette-right', MUSETTE, 'right', 'wait', [1, 8], 'Musette: Sağ El'),
      part('musette-left', MUSETTE, 'left', 'wait', [1, 8], 'Musette: Sol El'),
      part('musette-both', MUSETTE, 'both', 'wait', [1, 8], 'Musette: İki El'),
      part('musette-b', MUSETTE, 'both', 'wait', [17, 28], 'Musette: B Bölümü'),
      part('musette-tempo', MUSETTE, 'both', 'tempo', [1, 8], 'Musette: Metronomla'),
      part('menuet-bb-right', MENUET_BB, 'right', 'wait', [1, 8], 'Si♭ Majör Menüet: Sağ El'),
      part('menuet-bb-both', MENUET_BB, 'both', 'wait', [1, 16], 'Si♭ Majör Menüet: İki El'),
      part('menuet-bb-b', MENUET_BB, 'both', 'wait', [17, 32], 'Si♭ Majör Menüet: B Bölümü'),
      part('czerny-2-right', CZERNY_2, 'right', 'wait', [1, 8], 'Czerny 2: Sağ El'),
      part('czerny-2-both', CZERNY_2, 'both', 'wait', [1, 8], 'Czerny 2: İki El'),
      part('czerny-2-tempo', CZERNY_2, 'both', 'tempo', [1, 8], 'Czerny 2: Metronomla'),
      part('czerny-8-both', CZERNY_8, 'both', 'wait', [1, 8], 'Czerny 8: İki El'),
      part('czerny-8-tempo', CZERNY_8, 'both', 'tempo', [1, 8], 'Czerny 8: Metronomla'),
      part('czerny-17-right', CZERNY_17, 'right', 'wait', [1, 8], 'Czerny 17: Sağ El'),
      part('czerny-17-both', CZERNY_17, 'both', 'wait', [1, 8], 'Czerny 17: İki El'),
      part('czerny-17-tempo', CZERNY_17, 'both', 'tempo', [1, 8], 'Czerny 17: Metronomla'),
    ],
  },
  {
    level: 5,
    title: 'Hanon: parmak bağımsızlığı',
    text: 'Hanon’un ilk on alıştırması, bir oktav çıkıp inerek: her kalıp bir basamak yukarıda yinelenir, iki el aynı notaları çalar.',
    lessons: [
      hanon(1, 'right', 'wait'),
      hanon(1, 'both', 'wait'),
      hanon(1, 'both', 'tempo'),
      hanon(2, 'both', 'wait'),
      hanon(3, 'both', 'wait'),
      hanon(3, 'both', 'tempo'),
      hanon(4, 'both', 'wait'),
      hanon(5, 'both', 'wait'),
      hanon(5, 'both', 'tempo'),
      hanon(6, 'both', 'wait'),
      hanon(7, 'both', 'wait'),
      hanon(8, 'both', 'wait'),
      hanon(9, 'both', 'wait'),
      hanon(10, 'both', 'wait'),
      hanon(10, 'both', 'tempo'),
      hanon(1, 'both', 'tempo', 2),
    ],
  },
  {
    level: 6,
    title: 'Burgmüller: ilk hikâyeler',
    text: 'Burgmüller’in adı olan etütleri: Saflık, Masumiyet, İlerleme, Arabesk ve Teselli.',
    lessons: [
      part('burg-candeur-right', BURG_CANDEUR, 'right', 'wait', [1, 8], 'Saflık: Sağ El'),
      part('burg-candeur-both', BURG_CANDEUR, 'both', 'wait', [1, 8], 'Saflık: İki El'),
      part('burg-candeur-tempo', BURG_CANDEUR, 'both', 'tempo', [1, 16], 'Saflık: Metronomla'),
      part('burg-innocence-both', BURG_INNOCENCE, 'both', 'wait', [1, 8], 'Masumiyet: İki El'),
      part('burg-innocence-2', BURG_INNOCENCE, 'both', 'wait', [9, 16], 'Masumiyet: İkinci Cümle'),
      part('burg-innocence-tempo', BURG_INNOCENCE, 'both', 'tempo', [1, 16], 'Masumiyet: Metronomla'),
      part('burg-progres-both', BURG_PROGRES, 'both', 'wait', [1, 8], 'İlerleme: İki El'),
      part('burg-progres-tempo', BURG_PROGRES, 'both', 'tempo', [1, 8], 'İlerleme: Metronomla'),
      part('burg-arabesque-left', BURG_ARABESQUE, 'left', 'wait', [1, 8], 'Arabesk: Sol El'),
      part('burg-arabesque-both', BURG_ARABESQUE, 'both', 'wait', [1, 8], 'Arabesk: İki El'),
      part('burg-arabesque-tempo', BURG_ARABESQUE, 'both', 'tempo', [1, 16], 'Arabesk: Metronomla'),
      part('burg-consolation-both', BURG_CONSOLATION, 'both', 'wait', [1, 8], 'Teselli: İki El'),
      part('burg-consolation-tempo', BURG_CONSOLATION, 'both', 'tempo', [1, 8], 'Teselli: Metronomla'),
    ],
  },
  {
    level: 7,
    title: 'Burgmüller: kuşlar ve çiçekler',
    text: 'Zarafet, Küçük Buluşma, Narin Çiçek, Kuyruksallayan Kuşu, Tatlı Yakınma ve 6/8’lik Kır Şarkısı.',
    lessons: [
      part('burg-gracieuse-both', BURG_GRACIEUSE, 'both', 'wait', [1, 8], 'Zarafet: İki El'),
      part('burg-gracieuse-tempo', BURG_GRACIEUSE, 'both', 'tempo', [1, 8], 'Zarafet: Metronomla'),
      part('burg-reunion-both', BURG_REUNION, 'both', 'wait', [1, 8], 'Küçük Buluşma: İki El'),
      part('burg-reunion-tempo', BURG_REUNION, 'both', 'tempo', [1, 8], 'Küçük Buluşma: Metronomla'),
      part('burg-fleur-both', BURG_FLEUR, 'both', 'wait', [1, 8], 'Narin Çiçek: İki El'),
      part('burg-fleur-tempo', BURG_FLEUR, 'both', 'tempo', [1, 8], 'Narin Çiçek: Metronomla'),
      part('burg-bergeronnette-both', BURG_BERGERONNETTE, 'both', 'wait', [1, 8], 'Kuyruksallayan Kuşu: İki El'),
      part('burg-bergeronnette-2', BURG_BERGERONNETTE, 'both', 'wait', [9, 16], 'Kuyruksallayan Kuşu: İkinci Cümle'),
      part('burg-bergeronnette-tempo', BURG_BERGERONNETTE, 'both', 'tempo', [1, 16], 'Kuyruksallayan Kuşu: Metronomla'),
      part('burg-plainte-both', BURG_PLAINTE, 'both', 'wait', [1, 8], 'Tatlı Yakınma: İki El'),
      part('burg-plainte-tempo', BURG_PLAINTE, 'both', 'tempo', [1, 8], 'Tatlı Yakınma: Metronomla'),
      part('burg-pastorale-both', BURG_PASTORALE, 'both', 'wait', [1, 8], 'Kır Şarkısı: İki El'),
      part('burg-pastorale-tempo', BURG_PASTORALE, 'both', 'tempo', [1, 8], 'Kır Şarkısı: Metronomla'),
    ],
  },
  {
    level: 8,
    title: 'Küçük konser parçaları',
    text: 'Çaykovski’nin Çocuk Albümü’nden üç parça, Czerny’nin melodik alıştırmaları ve Kuhlau’nun sonatininden bir Andante.',
    lessons: [
      part('tchaik-prayer-both', MORNING_PRAYER, 'both', 'wait', [1, 8], 'Sabah Duası: İki El'),
      part('tchaik-prayer-2', MORNING_PRAYER, 'both', 'wait', [9, 24], 'Sabah Duası: Sonu'),
      part('tchaik-prayer-tempo', MORNING_PRAYER, 'both', 'tempo', [1, 16], 'Sabah Duası: Metronomla'),
      part('tchaik-french-both', OLD_FRENCH_SONG, 'both', 'wait', [1, 8], 'Eski Fransız Şarkısı: İki El'),
      part('tchaik-french-2', OLD_FRENCH_SONG, 'both', 'wait', [9, 16], 'Eski Fransız Şarkısı: İkinci Cümle'),
      part('tchaik-french-tempo', OLD_FRENCH_SONG, 'both', 'tempo', [1, 16], 'Eski Fransız Şarkısı: Metronomla'),
      part('tchaik-soldiers-both', WOODEN_SOLDIERS, 'both', 'wait', [1, 8], 'Tahta Askerler: İki El'),
      part('tchaik-soldiers-tempo', WOODEN_SOLDIERS, 'both', 'tempo', [1, 16], 'Tahta Askerler: Metronomla'),
      part('czerny-840-1-both', CZERNY_840_1, 'both', 'wait', [1, 8], 'Czerny Melodik 1: İki El'),
      part('czerny-840-1-tempo', CZERNY_840_1, 'both', 'tempo', [1, 8], 'Czerny Melodik 1: Metronomla'),
      part('czerny-840-6-both', CZERNY_840_6, 'both', 'wait', [1, 8], 'Czerny Melodik 6: İki El'),
      part('czerny-840-6-tempo', CZERNY_840_6, 'both', 'tempo', [1, 8], 'Czerny Melodik 6: Metronomla'),
      part('kuhlau-andante-both', KUHLAU_ANDANTE, 'both', 'wait', [1, 8], 'Kuhlau Andante: İki El'),
      part('kuhlau-andante-tempo', KUHLAU_ANDANTE, 'both', 'tempo', [1, 8], 'Kuhlau Andante: Metronomla'),
    ],
  },
]

export const ETUDE_LESSONS: NoteLesson[] = ETUDE_LEVELS.flatMap((l) => l.lessons)

export const isEtudeId = (id: string) => id.startsWith(ETUDE_PREFIX)

/**
 * A level's first lesson opens with a star anywhere in the level before it
 * (the first level is always open); the next lessons open in order, and a
 * lesson whose later neighbours have stars stays open.
 */
export function etudeOpen(lessonId: string, bestStars: (id: string) => number): boolean {
  const starred = (ls: NoteLesson[]) => ls.some((l) => bestStars(l.id) >= 1)
  for (const [n, level] of ETUDE_LEVELS.entries()) {
    const i = level.lessons.findIndex((l) => l.id === lessonId)
    if (i < 0) continue
    if (i === 0) return n === 0 || starred(ETUDE_LEVELS[n - 1].lessons) || starred(level.lessons)
    return starred(level.lessons.slice(i - 1))
  }
  return false
}
