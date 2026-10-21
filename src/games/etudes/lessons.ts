// The Etüt Kitaplığı: classical pieces read from the score, in levels. Every
// piece is learnt in short phrases with one hand in the waiting mode, then with
// both hands, then on the metronome. A level opens with a star in the level
// before it; inside a level the lessons open in order.

import type { NoteLesson } from '../noteHunter/lessons'
import { waterfall } from '../songs/lessons'
import type { Song, SongSpec } from '../songs/song'
import type { TheorySpec } from '../theory/quiz'
import { ARIA, CZERNY_17, CZERNY_2, CZERNY_8, MENUET_BB, MENUET_G, MENUET_GM, MUSETTE, PLEYEL_MENUETT } from './catalog'

export const ETUDE_PREFIX = 'etude-'

const HANDS = { right: 'sağ el', left: 'sol el', both: 'iki el' }

/** Bars given from 1, as printed; the lesson keeps them from 0. */
function part(
  slug: string,
  song: Song,
  hands: SongSpec['hands'],
  mode: SongSpec['mode'],
  [from, to]: [number, number],
  title: string,
): NoteLesson {
  const bars: [number, number] = [from - 1, to - 1]
  const how = mode === 'wait' ? 'notalar seni bekler' : 'metronomla'
  const lesson = waterfall(
    `${ETUDE_PREFIX}${slug}`,
    title,
    `${song.title}: ${HANDS[hands]}, ölçü ${from}–${to}, ${how}`,
    { songs: [song], hands, mode, bars },
    // On the metronome the suggested tempo starts slower than the piece.
    mode === 'tempo' ? { bpm: Math.round(((song.bpm ?? 80) * 0.7) / 2) * 2 } : {},
  )
  return { ...lesson, kind: 'etude' }
}

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

export const ETUDE_LEVELS: EtudeLevel[] = [
  {
    level: 1,
    title: 'Tek elle ilk cümleler',
    text: 'Menüetlerin ilk ölçüleri, her el ayrı. Partisyon sen basana kadar bekler.',
    lessons: [
      intro,
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
    level: 2,
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
    level: 3,
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
