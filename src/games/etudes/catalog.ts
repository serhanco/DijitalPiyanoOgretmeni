// The pieces of the Etüt Kitaplığı: scores imported from the Mutopia Project
// (all Public Domain, see scripts/etudes/import.mjs), each with its Turkish
// title, its original title and where it comes from. Repeats are written out,
// so the bar numbers below count the piece as it is played.

import type { Song } from '../songs/song'
import { score as anh114 } from './data/bach-anh114'
import { score as anh115 } from './data/bach-anh115'
import { score as anh118 } from './data/bach-anh118'
import { score as anh126 } from './data/bach-anh126'
import { score as bwv515 } from './data/bach-bwv515'
import { score as czerny2 } from './data/czerny-821-2'
import { score as czerny8 } from './data/czerny-821-8'
import { score as czerny17 } from './data/czerny-821-17'
import { score as pleyel } from './data/pleyel-menuett'
import type { ScoreSource } from './score'

const NOTEBOOK = 'Anna Magdalena Bach için Nota Defteri, 1725'
const CZERNY = 'Carl Czerny (1791–1857), 160 sekiz ölçülük alıştırma, Op. 821'
const CZERNY_FACT =
  'Czerny, Beethoven’ın öğrencisi ve Liszt’in öğretmeniydi. Binlerce alıştırma yazdı; bugün de dünyanın her yerinde piyano öğrencileri onun etütleriyle çalışır.'

/** Sections of eight bars (the last one may be shorter). */
function eights(bars: number): number[] {
  const out: number[] = []
  for (let left = bars; left > 0; left -= 8) out.push(Math.min(8, left))
  return out
}

function etude(score: ScoreSource, info: Omit<Song, 'id' | 'notes' | 'beatsPerBar' | 'score'>): Song {
  const [num, den] = score.time
  return { id: score.id, notes: '', beatsPerBar: (num * 4) / den, score, sections: eights(score.bars), ...info }
}

export const MENUET_G = etude(anh114, {
  title: 'Sol Majör Menüet',
  original: 'Menuet in G, BWV Anh. 114',
  origin: `${NOTEBOOK}; bugün Christian Petzold’a (1677–1733) atfedilir`,
  fact: 'Yıllarca Bach’ın sanıldı. 1965’te bu ezgiden “A Lover’s Concerto” adlı bir pop şarkısı yapıldı ve listelerin başına çıktı.',
  bpm: 96,
})

export const MENUET_GM = etude(anh115, {
  title: 'Sol Minör Menüet',
  original: 'Menuet in g, BWV Anh. 115',
  origin: `${NOTEBOOK}; bugün Christian Petzold’a (1677–1733) atfedilir`,
  fact: 'Sol Majör Menüet’in eşidir: deftere hemen ardından yazılmış. Aynı dans, minör tonda daha hüzünlü bir renkle.',
  bpm: 92,
})

export const MENUET_BB = etude(anh118, {
  title: 'Si♭ Majör Menüet',
  original: 'Menuet in B♭, BWV Anh. 118',
  origin: `${NOTEBOOK}; bestecisi bilinmiyor`,
  fact: 'Menüet, 17. ve 18. yüzyıl saraylarında küçük adımlarla dans edilen üç vuruşlu bir danstı.',
  bpm: 88,
})

export const MUSETTE = etude(anh126, {
  title: 'Musette',
  original: 'Musette in D, BWV Anh. 126',
  origin: `${NOTEBOOK}; bestecisi bilinmiyor`,
  fact: 'Musette küçük bir Fransız gaydasıdır. Sol elin yinelenen notaları, gaydanın hiç susmayan kalın sesini taklit eder.',
  bpm: 80,
})

export const ARIA = etude(bwv515, {
  title: 'Tütün Pipası Aryası',
  original: 'So oft ich meine Tobackspfeife, BWV 515',
  origin: `${NOTEBOOK}; Bach ailesinden`,
  fact: 'Şarkının sözleri bir tütün pipası üzerine: pipodan kalan küle bakıp insanın da bir gün toprağa döneceğini düşünür.',
  bpm: 80,
})

export const PLEYEL_MENUETT = etude(pleyel, {
  title: 'Pleyel Menüeti',
  original: 'Menuett',
  origin: 'Ignaz Pleyel (1757–1831); 19. yüzyıl sonu bir baskıdan',
  fact: 'Pleyel, Haydn’ın öğrencisiydi. 1807’de Paris’te kurduğu piyano firması ünlendi; Chopin en çok Pleyel piyanolarını sevdi.',
  bpm: 100,
})

export const CZERNY_2 = etude(czerny2, {
  title: 'Czerny: Alıştırma 2',
  original: '160 achttaktige Übungen, Op. 821 Nr. 2',
  origin: CZERNY,
  fact: CZERNY_FACT,
  bpm: 72,
})

export const CZERNY_8 = etude(czerny8, {
  title: 'Czerny: Alıştırma 8',
  original: '160 achttaktige Übungen, Op. 821 Nr. 8',
  origin: CZERNY,
  fact: 'Op. 821’in her alıştırması yalnızca sekiz ölçü: kısa ama tek bir tekniği, burada iki elin dengesini çalıştırır.',
  bpm: 66,
})

export const CZERNY_17 = etude(czerny17, {
  title: 'Czerny: Alıştırma 17',
  original: '160 achttaktige Übungen, Op. 821 Nr. 17',
  origin: CZERNY,
  fact: CZERNY_FACT,
  bpm: 66,
})

export const ETUDE_PIECES: Song[] = [
  MENUET_G,
  MENUET_GM,
  MENUET_BB,
  MUSETTE,
  ARIA,
  PLEYEL_MENUETT,
  CZERNY_2,
  CZERNY_8,
  CZERNY_17,
]
