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
import { score as burg1 } from './data/burgmuller-100-1'
import { score as burg10 } from './data/burgmuller-100-10'
import { score as burg11 } from './data/burgmuller-100-11'
import { score as burg13 } from './data/burgmuller-100-13'
import { score as burg16 } from './data/burgmuller-100-16'
import { score as burg2 } from './data/burgmuller-100-2'
import { score as burg3 } from './data/burgmuller-100-3'
import { score as burg4 } from './data/burgmuller-100-4'
import { score as burg5 } from './data/burgmuller-100-5'
import { score as burg6 } from './data/burgmuller-100-6'
import { score as burg8 } from './data/burgmuller-100-8'
import { score as czerny2 } from './data/czerny-821-2'
import { score as czerny8 } from './data/czerny-821-8'
import { score as czerny17 } from './data/czerny-821-17'
import { score as czerny840a } from './data/czerny-840-1'
import { score as czerny840f } from './data/czerny-840-6'
import { score as kuhlau } from './data/kuhlau-20-1-andante'
import { score as pleyel } from './data/pleyel-menuett'
import { score as tchaik1 } from './data/tchaikovsky-39-1'
import { score as tchaik16 } from './data/tchaikovsky-39-16'
import { score as tchaik5 } from './data/tchaikovsky-39-5'
import { etude } from './part'
import type { ScoreSource } from './score'

const NOTEBOOK = 'Anna Magdalena Bach için Nota Defteri, 1725'
const CZERNY = 'Carl Czerny (1791–1857), 160 sekiz ölçülük alıştırma, Op. 821'
const CZERNY_FACT =
  'Czerny, Beethoven’ın öğrencisi ve Liszt’in öğretmeniydi. Binlerce alıştırma yazdı; bugün de dünyanın her yerinde piyano öğrencileri onun etütleriyle çalışır.'

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

// ---- Burgmüller, Tchaikovsky and more (Mutopia) ------------------------------

const BURGMULLER = 'Friedrich Burgmüller (1806–1874), 25 kolay ve ilerleyen etüt, Op. 100'
const BURG_FACT =
  'Burgmüller Almanya’da doğdu, Paris’te yaşadı. Op. 100’ün her etüdünün bir adı var: tekniği küçük hikâyeler ve duygularla öğretir.'

const burg = (score: ScoreSource, no: number, title: string, original: string, bpm: number, fact = BURG_FACT) =>
  etude(score, {
    title,
    original: `25 Études faciles et progressives, Op. 100 No. ${no}: ${original}`,
    origin: BURGMULLER,
    fact,
    bpm,
  })

export const BURG_CANDEUR = burg(burg1, 1, 'Saflık', 'La Candeur', 96)
export const BURG_ARABESQUE = burg(
  burg2,
  2,
  'Arabesk',
  'L’Arabesque',
  100,
  'Arabesk, kıvrılan süslemeler demektir. Burada süs, iki elin sırayla çaldığı hızlı on altılıklardır.',
)
export const BURG_PASTORALE = burg(
  burg3,
  3,
  'Kır Şarkısı',
  'La Pastorale',
  96,
  'Pastoral, çobanların kırlardaki müziğini anlatır. 6/8’lik sallanan ritim bir kaval ezgisini andırır.',
)
export const BURG_REUNION = burg(burg4, 4, 'Küçük Buluşma', 'La Petite Réunion', 100)
export const BURG_INNOCENCE = burg(burg5, 5, 'Masumiyet', 'Innocence', 100)
export const BURG_PROGRES = burg(burg6, 6, 'İlerleme', 'Progrès', 96)
export const BURG_GRACIEUSE = burg(burg8, 8, 'Zarafet', 'La Gracieuse', 100)
export const BURG_FLEUR = burg(burg10, 10, 'Narin Çiçek', 'La Tendre Fleur', 88)
export const BURG_BERGERONNETTE = burg(
  burg11,
  11,
  'Kuyruksallayan Kuşu',
  'La Bergeronnette',
  100,
  'Bergeronnette, kuyruğunu durmadan sallayan küçük bir kuştur (kuyruksallayan). Hızlı notalar kuşun sekişini anlatır.',
)
export const BURG_CONSOLATION = burg(burg13, 13, 'Teselli', 'Consolation', 80)
export const BURG_PLAINTE = burg(burg16, 16, 'Tatlı Yakınma', 'Douce Plainte', 84)

const TCHAIKOVSKY = 'Pyotr İlyiç Çaykovski (1840–1893), Çocuk Albümü, Op. 39 (1878)'
const TCHAIK_FACT =
  'Çaykovski bu 24 küçük parçayı yeğeni Volodya için yazdı. Schumann’ın Gençlik Albümü’nden esinlendi; her parça bir çocuğun gününden bir sahne.'

export const MORNING_PRAYER = etude(tchaik1, {
  title: 'Sabah Duası',
  original: 'Детский альбом, Op. 39 No. 1: Утренняя молитва (Morning Prayer)',
  origin: TCHAIKOVSKY,
  fact: TCHAIK_FACT,
  bpm: 72,
})

export const WOODEN_SOLDIERS = etude(tchaik5, {
  title: 'Tahta Askerlerin Marşı',
  original: 'Детский альбом, Op. 39 No. 5: Марш деревянных солдатиков (March of the Wooden Soldiers)',
  origin: TCHAIKOVSKY,
  fact: 'Kesik kesik çalınan notalar oyuncak askerlerin tahta adımlarıdır. Çaykovski sonra Fındıkkıran balesinde de oyuncak askerleri dans ettirdi.',
  bpm: 100,
})

export const OLD_FRENCH_SONG = etude(tchaik16, {
  title: 'Eski Fransız Şarkısı',
  original: 'Детский альбом, Op. 39 No. 16: Старинная французская песенка (Old French Song)',
  origin: TCHAIKOVSKY,
  fact: TCHAIK_FACT,
  bpm: 76,
})

const CZERNY_840 = 'Carl Czerny (1791–1857), 50 melodik alıştırma, Op. 840'

export const CZERNY_840_1 = etude(czerny840a, {
  title: 'Czerny: Melodik Alıştırma 1',
  original: '50 Melodische Übungsstücke, Op. 840 Nr. 1',
  origin: CZERNY_840,
  fact: 'Op. 840’ta Czerny parmak çalışmasını şarkı gibi ezgilerin içine sakladı: teknik çalışırken müzik yaparsın.',
  bpm: 88,
})

export const CZERNY_840_6 = etude(czerny840f, {
  title: 'Czerny: Melodik Alıştırma 6',
  original: '50 Melodische Übungsstücke, Op. 840 Nr. 6',
  origin: CZERNY_840,
  fact: CZERNY_FACT,
  bpm: 108,
})

export const KUHLAU_ANDANTE = etude(kuhlau, {
  title: 'Kuhlau: Sonatin, Andante',
  original: 'Sonatine Op. 20 Nr. 1, II. Andante',
  origin: 'Friedrich Kuhlau (1786–1832)',
  fact: 'Kuhlau Almanya’da doğdu, Danimarka’da yaşadı. Sonatinleri, büyük sonatlara geçmeden önce piyano öğrencilerinin klasiğidir.',
  bpm: 84,
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
  BURG_CANDEUR,
  BURG_ARABESQUE,
  BURG_PASTORALE,
  BURG_REUNION,
  BURG_INNOCENCE,
  BURG_PROGRES,
  BURG_GRACIEUSE,
  BURG_FLEUR,
  BURG_BERGERONNETTE,
  BURG_CONSOLATION,
  BURG_PLAINTE,
  MORNING_PRAYER,
  WOODEN_SOLDIERS,
  OLD_FRENCH_SONG,
  CZERNY_840_1,
  CZERNY_840_6,
  KUHLAU_ANDANTE,
]
