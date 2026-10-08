// Unit 0 "Başlangıç": theory basics with short quizzes, then the treble notes of
// one octave taught two at a time (Do and Sol first, then two more, and so on).

import {
  type Clef,
  isBlackKey,
  PLACEMENT_LABELS,
  parseNote,
  solfegeName,
  staffPlacement,
  whiteKeysBetween,
} from '../../music/notes'
import type { NoteLesson } from '../noteHunter/lessons'
import type { ChoiceQuestion, TheorySpec } from './quiz'

const n = parseNote
/** One octave from middle C: the keyboard of every lesson in this unit. */
export const BASICS_KEYBOARD = { low: n('C4'), high: n('C5') }

/** The white key a staff step above (+1) or below (−1). */
function stepFrom(midi: number, dir: 1 | -1): number {
  let m = midi + dir
  while (isBlackKey(m)) m += dir
  return m
}

/**
 * "Bu nota hangisi?": a note on the staff, its name and the names of its two
 * neighbours to choose from. The topic is where it sits (line, space, outside).
 */
export function nameQuestion(midi: number, clef: Clef = 'treble'): ChoiceQuestion {
  const name = (m: number) => solfegeName(m, false)
  const placement = staffPlacement(midi, clef)
  const where = placement === 'line' ? 'çizgide' : placement === 'space' ? 'aralıkta' : 'portenin dışında'
  return {
    type: 'choice',
    topic: placement,
    prompt: 'Bu nota hangisi?',
    art: { kind: 'staff', notes: [midi], ...(clef === 'bass' && { bass: true }) },
    options: [name(midi), name(stepFrom(midi, -1)), name(stepFrom(midi, 1))],
    answer: 0,
    explain: `Bu nota ${where}: ${name(midi)}.`,
  }
}

const PLACEMENT_TOPICS = {
  line: PLACEMENT_LABELS.line,
  space: PLACEMENT_LABELS.space,
  outside: PLACEMENT_LABELS.outside,
}

const KEYS_WIDE = { kind: 'keyboard', low: n('C3'), high: n('B4') } as const

const PIANO: TheorySpec = {
  topics: { keys: 'Tuşlar ve gruplar', names: 'Nota adları', pitch: 'Kalın ve ince sesler' },
  cards: [
    {
      title: 'Beyaz ve siyah tuşlar',
      text: 'Piyanoda beyaz ve siyah tuşlar var. Siyah tuşlar hep ikili ve üçlü gruplar halinde dizilir: iki, üç, iki, üç… Bu gruplar klavyedeki yol işaretlerin.',
      art: { ...KEYS_WIDE, groups: true },
    },
    {
      title: "Do'yu bul",
      text: "İki siyah tuşlu grubun hemen solundaki beyaz tuş Do'dur. Klavyedeki her ikili grubun solunda bir Do var.",
      art: { ...KEYS_WIDE, marks: [n('C3'), n('C4')], groups: true },
    },
    {
      title: 'Yedi nota adı',
      text: "Beyaz tuşlar soldan sağa Do, Re, Mi, Fa, Sol, La, Si diye adlandırılır. Si'den sonra yine Do gelir; bu yeni Do bir oktav yukarıdadır.",
      art: { kind: 'keyboard', low: n('C4'), high: n('C5'), labels: true },
    },
    {
      title: 'Kalın ve ince sesler',
      text: "Sağa gittikçe sesler incelir, sola gittikçe kalınlaşır. Orta Do, klavyenin ortasına en yakın Do'dur; derslerimiz oradan başlar.",
      art: { ...KEYS_WIDE, marks: [n('C4')] },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'keys',
      prompt: 'Siyah tuşlar nasıl gruplanır?',
      options: ['İkili ve üçlü', 'Dörtlü', 'Hep tek tek'],
      answer: 0,
      explain: 'Siyah tuşlar ikili ve üçlü gruplar halinde dizilir.',
    },
    {
      type: 'choice',
      topic: 'keys',
      prompt: 'Işıklı tuş hangisi?',
      art: { ...KEYS_WIDE, marks: [n('C4')] },
      options: ['Do', 'Fa', 'Re'],
      answer: 0,
      explain: "İki siyah tuşlu grubun hemen solundaki beyaz tuş Do'dur.",
    },
    {
      type: 'key',
      topic: 'keys',
      prompt: "Klavyede bir Do'ya bas.",
      pitchClass: 0,
      explain: 'Do, iki siyah tuşlu grubun hemen solundaki beyaz tuştur.',
    },
    {
      type: 'choice',
      topic: 'names',
      prompt: "Do, Re, Mi'den sonra hangi nota gelir?",
      options: ['Fa', 'Sol', 'La'],
      answer: 0,
      explain: 'Notaların sırası: Do, Re, Mi, Fa, Sol, La, Si.',
    },
    {
      type: 'choice',
      topic: 'names',
      prompt: "Si'den sonra hangi nota gelir?",
      options: ['Do', 'La', 'Re'],
      answer: 0,
      explain: "Si'den sonra yeniden Do gelir; bu Do bir oktav yukarıdadır.",
    },
    {
      type: 'key',
      topic: 'names',
      prompt: "Bir Re'ye bas. İpucu: Do'nun hemen sağındaki beyaz tuş.",
      pitchClass: 2,
      explain: 'Re, iki siyah tuşun arasında kalan beyaz tuştur.',
    },
    {
      type: 'choice',
      topic: 'pitch',
      prompt: 'Klavyede sağa doğru gidince ses nasıl değişir?',
      options: ['İncelir', 'Kalınlaşır', 'Değişmez'],
      answer: 0,
      explain: 'Sağa gittikçe sesler incelir, sola gittikçe kalınlaşır.',
    },
    {
      type: 'choice',
      topic: 'pitch',
      prompt: 'Işıklı iki Do’dan hangisi daha kalın ses verir?',
      art: { ...KEYS_WIDE, marks: [n('C3'), n('C4')] },
      options: ['Soldaki', 'Sağdaki'],
      answer: 0,
      explain: 'Soldaki tuşlar daha kalın sesler çıkarır.',
    },
  ],
}

const FINGERS: TheorySpec = {
  topics: { numbers: 'Parmak numaraları', position: 'Do pozisyonu' },
  cards: [
    {
      title: 'Parmakların numarası var',
      text: 'Piyanoda parmaklar numarayla söylenir: başparmak 1, işaret parmağı 2, orta parmak 3, yüzük parmağı 4, serçe parmak 5. Notaların üstündeki küçük sayılar hangi parmakla çalacağını gösterir.',
      art: { kind: 'hand', hand: 'right' },
    },
    {
      title: 'İki elde de aynı',
      text: 'Sol elde de başparmak 1, serçe parmak 5. Sağ elde 1 solda kalır, sol elde sağda: iki başparmak birbirine bakar.',
      art: { kind: 'hand', hand: 'left' },
    },
    {
      title: 'Do pozisyonu',
      text: "Sağ elinin başparmağını Orta Do'ya koy. Öteki parmaklar sırayla Re, Mi, Fa, Sol'a düşer; 5. parmak Sol'da. İlk notalarımız Do ve Sol: bu iki parmağın notaları.",
      art: { kind: 'keyboard', low: n('C4'), high: n('C5'), marks: [n('C4'), n('G4')], labels: true, fingers: 'right' },
    },
    {
      title: 'Rahat bir el',
      text: 'Elini küçük bir top tutar gibi hafifçe yuvarlak tut. Tuşlara parmak uçlarınla bas, bileğini gevşek bırak.',
      art: { kind: 'hand', hand: 'right', highlight: 1 },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'numbers',
      prompt: 'Başparmak kaç numara?',
      options: ['1', '5', '2'],
      answer: 0,
      explain: 'Başparmak iki elde de 1 numaradır.',
    },
    {
      type: 'choice',
      topic: 'numbers',
      prompt: 'Işıklı parmak kaç numara?',
      art: { kind: 'hand', hand: 'right', highlight: 3, hideNumbers: true },
      options: ['3', '2', '4'],
      answer: 0,
      explain: 'Orta parmak 3 numaradır.',
    },
    {
      type: 'choice',
      topic: 'numbers',
      prompt: 'Işıklı parmak kaç numara?',
      art: { kind: 'hand', hand: 'right', highlight: 5, hideNumbers: true },
      options: ['5', '4', '1'],
      answer: 0,
      explain: 'Serçe parmak 5 numaradır.',
    },
    {
      type: 'choice',
      topic: 'numbers',
      prompt: 'Sol elde ışıklı parmak kaç numara?',
      art: { kind: 'hand', hand: 'left', highlight: 2, hideNumbers: true },
      options: ['2', '4', '3'],
      answer: 0,
      explain: 'Sol elde de başparmaktan sayılır: işaret parmağı 2 numaradır.',
    },
    {
      type: 'choice',
      topic: 'position',
      prompt: 'Do pozisyonunda sağ elin başparmağı hangi notada?',
      options: ['Do', 'Sol', 'Mi'],
      answer: 0,
      explain: "Do pozisyonunda başparmak (1) Orta Do'dadır.",
    },
    {
      type: 'choice',
      topic: 'position',
      prompt: 'Do pozisyonunda 5. parmak hangi notada?',
      options: ['Sol', 'La', 'Fa'],
      answer: 0,
      explain: "1 Do, 2 Re, 3 Mi, 4 Fa, 5 Sol: serçe parmak Sol'dadır.",
    },
    {
      type: 'key',
      topic: 'position',
      prompt: 'Do pozisyonunda 3. parmağın notasına bas.',
      pitchClass: 4,
      explain: "1 Do, 2 Re, 3 Mi: orta parmak Mi'ye düşer.",
    },
  ],
}

const STAFF: TheorySpec = {
  topics: { staff: 'Porte', place: 'Çizgi ve ara', clef: 'Sol anahtarı', read: 'Nota okuma' },
  cards: [
    {
      title: 'Porte',
      text: 'Notalar porteye yazılır: beş çizgi ve aralarındaki dört aralık. Çizgiler alttan yukarıya 1’den 5’e sayılır.',
      art: { kind: 'staff', numbers: 'lines', clef: false },
    },
    {
      title: 'Çizgide ya da arada',
      text: 'Bir nota ya çizginin üstüne oturur (çizgi notanın ortasından geçer) ya da iki çizginin arasındaki boşluğa yerleşir.',
      art: {
        kind: 'staff',
        notes: [n('E4'), n('F4'), n('G4'), n('A4')],
        clef: false,
        captions: ['çizgi', 'ara', 'çizgi', 'ara'],
      },
    },
    {
      title: 'Yukarısı ince',
      text: 'Portede yukarıdaki nota daha ince, aşağıdaki daha kalın sestir. Notalar çizgi, ara, çizgi, ara diye basamak basamak çıkar.',
      art: { kind: 'staff', notes: whiteKeysBetween(n('C4'), n('C5')), names: true },
    },
    {
      title: 'Sol anahtarı',
      text: 'Porte başındaki işaret sol anahtarıdır. Kıvrımı 2. çizgiyi sarar ve o çizgiye Sol adını verir. Sol anahtarı sağ elin notalarını gösterir.',
      art: { kind: 'staff', notes: [n('G4')], names: true, highlight: 2 },
    },
    {
      title: 'Orta Do',
      text: 'Orta Do portenin altında, kendine ait kısa bir ek çizginin üstüne yazılır. Ek çizgiler porteyi aşağı ve yukarı uzatır.',
      art: { kind: 'staff', notes: [n('C4')], names: true },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'staff',
      prompt: 'Portede kaç çizgi var?',
      options: ['5', '4', '6'],
      answer: 0,
      explain: 'Porte beş çizgiden oluşur.',
    },
    {
      type: 'choice',
      topic: 'staff',
      prompt: 'Çizgilerin arasında kaç aralık var?',
      options: ['4', '5', '3'],
      answer: 0,
      explain: 'Beş çizginin arasında dört aralık vardır.',
    },
    {
      type: 'choice',
      topic: 'place',
      prompt: 'Bu nota çizgide mi, arada mı?',
      art: { kind: 'staff', notes: [n('G4')] },
      options: ['Çizgide', 'Arada'],
      answer: 0,
      explain: 'Çizgi notanın ortasından geçiyorsa nota çizgidedir.',
    },
    {
      type: 'choice',
      topic: 'place',
      prompt: 'Bu nota çizgide mi, arada mı?',
      art: { kind: 'staff', notes: [n('A4')] },
      options: ['Çizgide', 'Arada'],
      answer: 1,
      explain: 'İki çizginin arasındaki boşluğa oturan nota aradadır.',
    },
    {
      type: 'choice',
      topic: 'staff',
      prompt: 'Hangisi daha ince ses?',
      art: { kind: 'staff', notes: [n('E4'), n('C5')] },
      options: ['Soldaki', 'Sağdaki'],
      answer: 1,
      explain: 'Portede yukarıdaki nota daha ince sestir.',
    },
    {
      type: 'choice',
      topic: 'clef',
      prompt: 'Sol anahtarı hangi çizgiye Sol adını verir?',
      options: ['2. çizgi', '1. çizgi', '3. çizgi'],
      answer: 0,
      explain: "Sol anahtarının kıvrımı 2. çizgiyi sarar: o çizgideki nota Sol'dür.",
    },
    {
      type: 'choice',
      topic: 'clef',
      prompt: 'Orta Do nereye yazılır?',
      options: ['Portenin altındaki ek çizgiye', 'En alt çizgiye', 'Ortadaki çizgiye'],
      answer: 0,
      explain: 'Orta Do portenin altında, kendi kısa ek çizgisinin üstüne yazılır.',
    },
    { ...nameQuestion(n('G4')), topic: 'read' },
    { ...nameQuestion(n('C4')), topic: 'read' },
  ],
}

/** Klavyesiz okuma: the octave learnt so far, read by name only. */
const READ_TREBLE: TheorySpec = {
  topics: PLACEMENT_TOPICS,
  cards: [
    {
      title: 'Klavyesiz okuma',
      text: "Bu testte klavye yok: portedeki notaya bak ve adını seç. Takılırsan Do'dan ya da Sol çizgisinden basamak basamak say.",
      art: { kind: 'staff', notes: whiteKeysBetween(n('C4'), n('C5')), names: true },
    },
  ],
  questions: ['G4', 'C4', 'E4', 'A4', 'D4', 'C5', 'F4', 'B4', 'E4', 'G4'].map((x) => nameQuestion(n(x))),
}

const DURATIONS: TheorySpec = {
  topics: { shapes: 'Nota şekilleri', beats: 'Vuruş sayma' },
  cards: [
    {
      title: 'Sesin uzunluğu',
      text: 'Notanın şekli sesin ne kadar süreceğini söyler. Müzik eşit vuruşlarla akar; içinden 1, 2, 3, 4 diye sayarız.',
      art: { kind: 'durations' },
    },
    {
      title: 'Birlik, ikilik, dörtlük',
      text: 'İçi boş, sapsız birlik 4 vuruş; içi boş, saplı ikilik 2 vuruş; içi dolu, saplı dörtlük 1 vuruş sürer.',
      art: { kind: 'durations', beats: true },
    },
    {
      title: 'Ritim ünitesinde',
      text: 'Ritim ünitesinde bu süreleri metronomla çalacaksın. Şimdilik şekilleri tanımak ve saymak yeter.',
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'shapes',
      prompt: 'İçi dolu, saplı nota hangisi?',
      options: ['Dörtlük', 'İkilik', 'Birlik'],
      answer: 0,
      explain: 'Dörtlüğün içi dolu ve sapı var.',
    },
    {
      type: 'choice',
      topic: 'shapes',
      prompt: 'Birlik notanın sapı var mı?',
      options: ['Yok', 'Var'],
      answer: 0,
      explain: 'Birlik nota içi boş bir yuvarlaktır, sapı yoktur.',
    },
    {
      type: 'choice',
      topic: 'beats',
      prompt: 'Birlik nota kaç vuruş sürer?',
      options: ['4', '2', '1'],
      answer: 0,
      explain: 'Birlik 4 vuruş sürer.',
    },
    {
      type: 'choice',
      topic: 'beats',
      prompt: 'İkilik nota kaç vuruş sürer?',
      options: ['2', '4', '1'],
      answer: 0,
      explain: 'İkilik 2 vuruş sürer.',
    },
    {
      type: 'choice',
      topic: 'beats',
      prompt: 'İki dörtlük kaç vuruş eder?',
      options: ['2', '1', '4'],
      answer: 0,
      explain: 'Her dörtlük 1 vuruş: 1 + 1 = 2.',
    },
  ],
}

/** Where each new note sits, said when it is introduced. */
const TREBLE_INTRO: Record<number, string> = {
  [n('C4')]:
    'Portenin altında, kendi kısa ek çizgisinde. Klavyede iki siyah tuşun solundaki beyaz tuş, başparmağının (1) yeri.',
  [n('D4')]: 'Portenin hemen altında, ilk çizgiye asılı. Klavyede iki siyah tuşun arasında, 2. parmağın yeri.',
  [n('E4')]: 'Birinci (en alt) çizgide. Klavyede iki siyah tuşun sağında, 3. parmağın yeri.',
  [n('F4')]: 'Birinci aralıkta, 1. ve 2. çizginin arasında. Klavyede üç siyah tuşun solunda, 4. parmağın yeri.',
  [n('G4')]: 'İkinci çizgide: sol anahtarının sardığı çizgi. Do pozisyonunda serçe parmağın (5) yeri.',
  [n('A4')]: "İkinci aralıkta, Sol'ün hemen üstünde. Klavyede Sol'ün sağındaki beyaz tuş.",
  [n('B4')]: "Üçüncü (orta) çizgide. Klavyede üç siyah tuşun sağında, Do'dan hemen önce.",
  [n('C5')]: "Üçüncü aralıkta: Orta Do'dan bir oktav yukarıda, aynı ad daha ince bir ses.",
}

const BASS_INTRO: Record<number, string> = {
  [n('C3')]: "İkinci aralıkta. Klavyede Orta Do'nun bir oktav altındaki Do: sol elin serçe parmağının (5) yeri.",
  [n('D3')]: 'Üçüncü (orta) çizgide. Sol elin 4. parmağının yeri.',
  [n('E3')]: 'Üçüncü aralıkta. Sol elin orta parmağının (3) yeri.',
  [n('F3')]: 'Dördüncü çizgide: fa anahtarının iki noktası bu çizgiyi sarar. Sol elin 2. parmağının yeri.',
  [n('G3')]: 'Dördüncü (en üst) aralıkta. Sol elin başparmağının (1) yeri.',
  [n('A3')]: "Beşinci (en üst) çizgide, Sol'ün hemen üstünde.",
  [n('B3')]: 'Portenin hemen üstünde, en üst çizgiye oturur.',
  [n('C4')]: 'Portenin üstünde, kendi kısa ek çizgisinde: Orta Do, bu kez fa anahtarında.',
}

/** Where a note sits on its staff, said when it is introduced. */
export function noteIntro(midi: number, clef: Clef): string | undefined {
  return (clef === 'bass' ? BASS_INTRO : TREBLE_INTRO)[midi]
}

const theory = (
  id: string,
  title: string,
  description: string,
  spec: TheorySpec,
  keyboard = BASICS_KEYBOARD,
  clef: Clef = 'treble',
): NoteLesson => ({
  id,
  kind: 'theory',
  title,
  description,
  clef,
  notes: [],
  length: spec.questions.length,
  keyboard,
  theory: spec,
})

const C4_C5 = whiteKeysBetween(n('C4'), n('C5'))
const upTo = (top: string) => whiteKeysBetween(n('C4'), n(top))

export const BASICS_LESSONS: NoteLesson[] = [
  theory('basics-piano', 'Piyanoyla Tanışma', 'Tuşlar, siyah tuş grupları, Do’yu bulmak', PIANO),
  theory('basics-fingers', 'Parmak Numaraları', 'Parmaklar 1’den 5’e, Do pozisyonu', FINGERS),
  theory('basics-staff', 'Porte ve Sol Anahtarı', 'Çizgiler, aralar, Orta Do', STAFF),
  {
    id: 'basics-notes-1',
    title: 'Do ve Sol',
    description: 'İlk iki nota: başparmak ve serçe parmak',
    clef: 'treble',
    notes: ['C4', 'G4'].map(n),
    introduce: ['C4', 'G4'].map(n),
    length: 10,
    keyboard: BASICS_KEYBOARD,
  },
  {
    id: 'basics-notes-2',
    title: 'Re ve Mi',
    description: 'Do ile Sol arasına iki nota daha',
    clef: 'treble',
    notes: ['C4', 'D4', 'E4', 'G4'].map(n),
    introduce: ['D4', 'E4'].map(n),
    focus: ['D4', 'E4'].map(n),
    length: 14,
    keyboard: BASICS_KEYBOARD,
  },
  {
    id: 'basics-balloon',
    kind: 'balloon',
    title: 'Balonlar: Do Re Mi Sol',
    description: 'Öğrendiğin dört notayla balon patlat',
    clef: 'treble',
    notes: ['C4', 'D4', 'E4', 'G4'].map(n),
    length: 12,
    keyboard: BASICS_KEYBOARD,
  },
  {
    id: 'basics-notes-3',
    title: 'Fa ve La',
    description: "Sol'ün iki komşusu",
    clef: 'treble',
    notes: upTo('A4'),
    introduce: ['F4', 'A4'].map(n),
    focus: ['F4', 'A4'].map(n),
    length: 16,
    keyboard: BASICS_KEYBOARD,
  },
  {
    id: 'basics-notes-4',
    title: 'Si ve İnce Do',
    description: 'Oktavı tamamla',
    clef: 'treble',
    notes: C4_C5,
    introduce: ['B4', 'C5'].map(n),
    focus: ['B4', 'C5'].map(n),
    length: 18,
    keyboard: BASICS_KEYBOARD,
  },
  theory('basics-read', 'Klavyesiz Okuma', 'Portedeki notanın adını seç', READ_TREBLE),
  {
    id: 'basics-bird',
    kind: 'bird',
    title: 'Nota Kuşu: İlk Oktav',
    description: 'Sekiz notanın hepsiyle uç',
    clef: 'treble',
    notes: C4_C5,
    length: 12,
    keyboard: BASICS_KEYBOARD,
  },
  theory('basics-durations', 'Nota Süreleri', 'Birlik, ikilik, dörtlük: ritme hazırlık', DURATIONS),
]

/** The left hand's five-finger position, from Do3 (little finger) to Orta Do. */
export const LEFT_HAND_C = { low: n('C3'), high: n('C4') }

const BASS_CLEF: TheorySpec = {
  topics: { clef: 'Fa anahtarı', position: 'Sol elde Do pozisyonu', read: 'Nota okuma' },
  cards: [
    {
      title: 'Fa anahtarı',
      text: 'Sol elin notaları fa anahtarıyla yazılır. İşaretin iki noktası 4. çizgiyi sarar ve o çizgiye Fa adını verir.',
      art: { kind: 'staff', bass: true, notes: [n('F3')], names: true, highlight: 4 },
    },
    {
      title: "Orta Do'nun altı",
      text: "Fa anahtarı Orta Do'nun altındaki kalın sesleri gösterir. Orta Do burada portenin üstündeki kısa ek çizgiye yazılır.",
      art: { kind: 'staff', bass: true, notes: [n('C4')], names: true },
    },
    {
      title: 'Sol elde Do pozisyonu',
      text: "Sol elinin serçe parmağını (5) Orta Do'nun bir oktav altındaki Do'ya koy. Başparmağın (1) Sol'e düşer. İlk iki notamız yine Do ve Sol.",
      art: { kind: 'keyboard', low: n('C3'), high: n('C4'), marks: [n('C3'), n('G3')], labels: true, fingers: 'left' },
    },
    {
      title: 'Basamak basamak',
      text: 'Fa anahtarında da notalar çizgi, ara diye sırayla çıkar: Do ikinci aralıkta, Sol en üst aralıkta.',
      art: { kind: 'staff', bass: true, notes: whiteKeysBetween(n('C3'), n('C4')), names: true },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'clef',
      prompt: 'Fa anahtarı hangi çizgiye Fa adını verir?',
      options: ['4. çizgi', '2. çizgi', '3. çizgi'],
      answer: 0,
      explain: 'Fa anahtarının iki noktası 4. çizgiyi sarar: o çizgideki nota Fa’dır.',
    },
    {
      type: 'choice',
      topic: 'clef',
      prompt: 'Fa anahtarı genelde hangi elin notalarını gösterir?',
      options: ['Sol el', 'Sağ el'],
      answer: 0,
      explain: 'Sol anahtarı sağ eli, fa anahtarı sol eli gösterir.',
    },
    {
      type: 'choice',
      topic: 'position',
      prompt: 'Sol elde Do pozisyonunda serçe parmak (5) hangi notada?',
      options: ['Do', 'Sol', 'Mi'],
      answer: 0,
      explain: "Sol elde serçe parmak Do'da, başparmak Sol'dedir.",
    },
    {
      type: 'choice',
      topic: 'position',
      prompt: 'Sol elde Do pozisyonunda başparmak (1) hangi notada?',
      options: ['Sol', 'Do', 'Fa'],
      answer: 0,
      explain: "5 Do, 4 Re, 3 Mi, 2 Fa, 1 Sol: başparmak Sol'dedir.",
    },
    {
      type: 'key',
      topic: 'position',
      prompt: "Sol elin serçe parmağıyla Do'ya bas.",
      pitchClass: 0,
      explain: 'Do, iki siyah tuşlu grubun hemen solundaki beyaz tuştur.',
    },
    { ...nameQuestion(n('F3'), 'bass'), topic: 'read' },
    { ...nameQuestion(n('C3'), 'bass'), topic: 'read' },
    { ...nameQuestion(n('G3'), 'bass'), topic: 'read' },
  ],
}

const READ_BASS: TheorySpec = {
  topics: PLACEMENT_TOPICS,
  cards: [
    {
      title: 'Fa anahtarında klavyesiz okuma',
      text: "Portedeki notaya bak ve adını seç. Takılırsan Fa çizgisinden (4. çizgi) ya da ikinci aralıktaki Do'dan say.",
      art: { kind: 'staff', bass: true, notes: whiteKeysBetween(n('C3'), n('C4')), names: true },
    },
  ],
  questions: ['F3', 'C3', 'A3', 'D3', 'G3', 'C4', 'E3', 'B3', 'D3', 'F3'].map((x) => nameQuestion(n(x), 'bass')),
}

const bassUpTo = (top: string) => whiteKeysBetween(n('C3'), n(top))

/** The start of the bass unit: the clef, then the left hand's octave two notes at a time. */
export const BASS_START_LESSONS: NoteLesson[] = [
  theory('bass-theory', 'Fa Anahtarı', 'Fa çizgisi, sol elde Do pozisyonu', BASS_CLEF, LEFT_HAND_C, 'bass'),
  {
    id: 'bass-intro-1',
    title: 'Sol El: Do ve Sol',
    description: 'Serçe parmak ve başparmak',
    clef: 'bass',
    notes: ['C3', 'G3'].map(n),
    introduce: ['C3', 'G3'].map(n),
    length: 10,
    keyboard: LEFT_HAND_C,
  },
  {
    id: 'bass-intro-2',
    title: 'Sol El: Re ve Mi',
    description: 'Do ile Sol arasına iki nota',
    clef: 'bass',
    notes: ['C3', 'D3', 'E3', 'G3'].map(n),
    introduce: ['D3', 'E3'].map(n),
    focus: ['D3', 'E3'].map(n),
    length: 14,
    keyboard: LEFT_HAND_C,
  },
  {
    id: 'bass-intro-3',
    title: 'Sol El: Fa ve La',
    description: "Fa çizgisi ve Sol'ün üstü",
    clef: 'bass',
    notes: bassUpTo('A3'),
    introduce: ['F3', 'A3'].map(n),
    focus: ['F3', 'A3'].map(n),
    length: 16,
    keyboard: LEFT_HAND_C,
  },
  {
    id: 'bass-intro-4',
    title: 'Sol El: Si ve Orta Do',
    description: "Orta Do'ya kadar bir oktav",
    clef: 'bass',
    notes: bassUpTo('C4'),
    introduce: ['B3', 'C4'].map(n),
    focus: ['B3', 'C4'].map(n),
    length: 18,
    keyboard: LEFT_HAND_C,
  },
  theory('bass-read', 'Fa: Klavyesiz Okuma', 'Fa anahtarındaki notanın adını seç', READ_BASS, LEFT_HAND_C, 'bass'),
]
