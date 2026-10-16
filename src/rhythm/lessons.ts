// The rhythm units. Every pattern is taught in the same steps, easy to hard:
// a short theory card with the count, Yankı (the app plays a bar, the learner
// plays it back), the pattern repeated, a game with what is known so far, the
// rhythm of a well-known song on one key, then the song with its notes.
// Ritim 1: quarters, halves, wholes, rests. Ritim 2: eighths, 3/4, dotted notes.
// Lessons kept from the first rhythm unit keep their ids (stars and history).

import type { NoteLesson, RhythmSpec } from '../games/noteHunter/lessons'
import type { TheorySpec } from '../games/theory/quiz'
import { fitKeyboard, parseNote, whiteKeysBetween } from '../music/notes'
import { parseTune, type Tune } from './plan'
import type { RhythmValue } from './rhythm'
import {
  AU_CLAIR,
  BLUE_DANUBE,
  FRERE_JACQUES,
  FRERE_JACQUES_OPENING,
  HOT_CROSS_BUNS,
  HOT_CROSS_BUNS_RESTS,
  JINGLE_BELLS,
  LONDON_BRIDGE,
  MARY_LAMB,
  MINUET,
  ODE,
  ODE_SIMPLE,
  TWINKLE,
  TWINKLE_RESTS,
} from './tunes'

const SMALL_KEYBOARD = { low: parseNote('C4'), high: parseNote('C5') }
const C4 = [parseNote('C4')]
const DRUMS = ['C4', 'E4', 'G4'].map(parseNote)

type Kind = 'rhythm' | 'dino' | 'drum'

function beatLesson(
  id: string,
  kind: Kind,
  title: string,
  description: string,
  rhythm: Partial<RhythmSpec> & { bpm: number },
  notes: number[] = C4,
): NoteLesson {
  return {
    id,
    kind,
    title,
    description,
    clef: 'treble',
    notes,
    length: 0,
    keyboard: SMALL_KEYBOARD,
    rhythm: { beatsPerBar: 4, bars: 4, values: ['q'], anyKey: notes.length === 1, ...rhythm },
  }
}

/** Yankı: `pattern`'s bars, each played by the app and then by the learner. */
const echo = (id: string, title: string, pattern: string, bpm: number, beatsPerBar = 4) =>
  beatLesson(id, 'rhythm', `Yankı: ${title}`, 'Önce dinle, sonra aynısını çal', {
    bpm,
    beatsPerBar,
    bars: pattern.split('|').length * 2,
    values: [],
    pattern,
    echo: true,
  })

/** A pattern repeated until the hand knows it. */
const drill = (id: string, title: string, description: string, pattern: string, bpm: number, beatsPerBar = 4) =>
  beatLesson(id, 'rhythm', title, description, { bpm, beatsPerBar, bars: 8, values: [], pattern })

/** A song's rhythm on any key: only the timing counts. */
const songRhythm = (id: string, tune: Tune, bpm: number, beatsPerBar = 4) =>
  beatLesson(id, 'rhythm', `Ritmi: ${tune.title}`, `${tune.original} · tek tuşla, sadece ritim`, {
    bpm,
    beatsPerBar,
    bars: 8,
    values: [],
    tune,
  })

/** A song with its notes; the next key is lit. */
function song(id: string, tune: Tune, bpm: number, extra: Partial<RhythmSpec> = {}, beatsPerBar = 4): NoteLesson {
  const pitches = [...new Set(parseTune(tune, beatsPerBar).pitches.filter((p) => p !== null))]
  return {
    ...beatLesson(id, 'rhythm', tune.title, `${tune.original} · ${tune.origin}`, {
      bpm,
      beatsPerBar,
      bars: 8,
      values: [],
      tune,
      anyKey: false,
      guide: true,
      ...extra,
    }),
    notes: pitches.sort((a, b) => a - b),
    keyboard: fitKeyboard(pitches, { fromDo: true }),
  }
}

function intro(id: string, title: string, description: string, spec: TheorySpec): NoteLesson {
  return {
    id,
    kind: 'theory',
    title,
    description,
    clef: 'treble',
    notes: [],
    length: spec.questions.length,
    keyboard: SMALL_KEYBOARD,
    theory: spec,
  }
}

const QUARTER: TheorySpec = {
  topics: { beat: 'Vuruş', quarter: 'Dörtlük' },
  cards: [
    {
      title: 'Vuruş',
      text: 'Müziğin altında hiç durmayan eşit bir nabız vardır: vuruş. Saatin tik takı ya da yürürken adımların gibi. Metronom bu vuruşu tıklar.',
      art: { kind: 'rhythm', pattern: 'q q q q | q q q q' },
    },
    {
      title: 'Dörtlük nota',
      text: 'İçi dolu, saplı nota dörtlüktür ve tam bir vuruş sürer. Her tıkta bir kez bas, içinden "1, 2, 3, 4" diye say.',
      art: { kind: 'rhythm', pattern: 'q q q q' },
    },
    {
      title: 'Nasıl çalışacağız?',
      text: 'Önce Yankı: uygulama bir ölçü çalar, sen aynısını çalarsın. Sonra aynı kalıbı defalarca tekrar eder, en sonda bir şarkıda kullanırız.',
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'quarter',
      prompt: 'Dörtlük nota kaç vuruş sürer?',
      art: { kind: 'rhythm', pattern: 'q q q q' },
      options: ['1', '2', '4'],
      answer: 0,
      explain: 'Dörtlük tam bir vuruş sürer: her tıkta bir nota.',
    },
    {
      type: 'choice',
      topic: 'beat',
      prompt: 'Vuruşlar nasıl gelir?',
      options: ['Eşit aralıklarla', 'Gittikçe hızlanarak', 'Rastgele'],
      answer: 0,
      explain: 'Vuruş saat gibi eşittir; tempo değişmedikçe hep aynı hızda gelir.',
    },
    {
      type: 'choice',
      topic: 'quarter',
      prompt: 'Bir ölçüde dört dörtlük var. Kaç kez basarsın?',
      options: ['4', '2', '1'],
      answer: 0,
      explain: 'Her dörtlükte bir kez: 1, 2, 3, 4.',
    },
  ],
}

const HALF: TheorySpec = {
  topics: { half: 'İkilik', count: 'Sayma' },
  cards: [
    {
      title: 'İkilik nota',
      text: 'İçi boş, saplı nota ikiliktir: iki vuruş sürer. Birinci vuruşta bas, ikinci vuruşta bırakma; tuş basılıyken "2" diye say.',
      art: { kind: 'rhythm', pattern: 'q q h | h h' },
    },
    {
      title: 'Kalıplar',
      text: '"Ta ta taa": iki dörtlük ve bir ikilik. Şarkıların çoğu cümlesini böyle uzun bir notayla bitirir.',
      art: { kind: 'rhythm', pattern: 'q q h | h q q' },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'half',
      prompt: 'İkilik nota kaç vuruş sürer?',
      art: { kind: 'rhythm', pattern: 'h h' },
      options: ['2', '1', '4'],
      answer: 0,
      explain: 'İkilik iki vuruş sürer, iki dörtlük kadar.',
    },
    {
      type: 'choice',
      topic: 'count',
      prompt: 'Bu ölçüde kaç kez basarsın?',
      art: { kind: 'rhythm', pattern: 'q q h' },
      options: ['3', '4', '2'],
      answer: 0,
      explain: 'Dörtlük, dörtlük, ikilik: üç kez basarsın; ikilik 3. ve 4. vuruşu doldurur.',
    },
    {
      type: 'choice',
      topic: 'half',
      prompt: 'İkilikte tuşa ne zaman basarsın?',
      options: ['İlk vuruşta, ikincide basılı tutarım', 'İki vuruşta da basarım', 'İkinci vuruşta'],
      answer: 0,
      explain: 'Bir kez basar, ikinci vuruşun sonuna kadar tutarsın.',
    },
  ],
}

const WHOLE: TheorySpec = {
  topics: { whole: 'Birlik', count: 'Sayma' },
  cards: [
    {
      title: 'Birlik nota',
      text: 'İçi boş ve sapsız yuvarlak birliktir: bütün bir ölçü, dört vuruş sürer. Bas ve "1, 2, 3, 4" diye sayarken basılı tut.',
      art: { kind: 'rhythm', pattern: 'q q q q | w' },
    },
    {
      title: 'Uzun, uzun, en uzun',
      text: 'Dörtlük 1, ikilik 2, birlik 4 vuruş. İki ikilik bir birlik eder, dört dörtlük de.',
      art: { kind: 'rhythm', pattern: 'h h | w' },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'whole',
      prompt: 'Birlik nota kaç vuruş sürer?',
      art: { kind: 'rhythm', pattern: 'w' },
      options: ['4', '2', '3'],
      answer: 0,
      explain: 'Birlik dört vuruş, yani 4/4’lük bir ölçünün tamamı.',
    },
    {
      type: 'choice',
      topic: 'count',
      prompt: 'Kaç ikilik bir birlik eder?',
      options: ['2', '4', '1'],
      answer: 0,
      explain: '2 + 2 = 4 vuruş: iki ikilik bir birlik.',
    },
  ],
}

const REST: TheorySpec = {
  topics: { rest: 'Dörtlük es', count: 'Sayma' },
  cards: [
    {
      title: 'Dörtlük es',
      text: 'Es susmaktır. Bu zikzak işaret bir vuruş sus demek. Susarken de saymaya devam et; vuruş durmaz.',
      art: { kind: 'rhythm', pattern: 'q q q qr | q qr q qr' },
    },
    {
      title: 'Esde ne yaparım?',
      text: 'Parmağını kaldır ve bekle. Es sırasında tuşa basarsan es bozulur. Parantezli sayılar susacağın vuruşlar.',
      art: { kind: 'rhythm', pattern: 'h q qr' },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'rest',
      prompt: 'Dörtlük es ne kadar sürer?',
      art: { kind: 'rhythm', pattern: 'q qr q qr' },
      options: ['1 vuruş', '2 vuruş', 'Hiç'],
      answer: 0,
      explain: 'Dörtlük es, dörtlük nota kadar sürer: bir vuruş.',
    },
    {
      type: 'choice',
      topic: 'count',
      prompt: 'Bu ölçüde kaç kez basarsın?',
      art: { kind: 'rhythm', pattern: 'q q q qr' },
      options: ['3', '4', '2'],
      answer: 0,
      explain: 'Üç dörtlük çalınır, dördüncü vuruşta susulur.',
    },
    {
      type: 'choice',
      topic: 'rest',
      prompt: 'Es sırasında saymaya devam eder misin?',
      options: ['Evet', 'Hayır'],
      answer: 0,
      explain: 'Vuruş susarken de sürer; saymayı bırakırsan sonraki notayı geç çalarsın.',
    },
  ],
}

const EIGHTH: TheorySpec = {
  topics: { eighth: 'Sekizlik', count: 'Sayma' },
  cards: [
    {
      title: 'Sekizlik çifti',
      text: 'Bir vuruşa iki nota sığdırırız: sekizlikler. Saplarını bir kiriş bağlar. "1 ve 2 ve" diye say: rakamda ve "ve"de bas.',
      art: { kind: 'rhythm', pattern: 'e e e e q q' },
    },
    {
      title: 'Ti-ti ta',
      text: 'Sekizlik çifti dörtlükle aynı sürer, sadece ikiye bölünmüştür. Metronomun her tıkında iki eşit nota.',
      art: { kind: 'rhythm', pattern: 'q q e e q | e e q e e q' },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'eighth',
      prompt: 'Bir vuruşa kaç sekizlik sığar?',
      art: { kind: 'rhythm', pattern: 'e e e e e e e e' },
      options: ['2', '1', '4'],
      answer: 0,
      explain: 'İki sekizlik bir dörtlük eder: bir vuruş.',
    },
    {
      type: 'choice',
      topic: 'count',
      prompt: 'Bu ölçü nasıl sayılır?',
      art: { kind: 'rhythm', pattern: 'q q e e q' },
      options: ['1, 2, 3 ve 4', '1 ve 2 ve 3 ve 4 ve', '1, 2, 3, 4'],
      answer: 0,
      explain: 'Sekizlik çifti 3. vuruşta: "3 ve".',
    },
  ],
}

const WALTZ: TheorySpec = {
  topics: { meter: 'Üç dörtlük', dotted: 'Noktalı ikilik' },
  cards: [
    {
      title: 'Üç dörtlük ölçü',
      text: 'Valslerde ölçü üç vuruştur: "1, 2, 3". Birinci vuruş en güçlüsüdür; dans edenler o vuruşta adım atar.',
      art: { kind: 'rhythm', pattern: 'q q q | h q', beatsPerBar: 3 },
    },
    {
      title: 'Noktalı ikilik',
      text: 'Notanın yanındaki nokta onu yarısı kadar uzatır. İkilik 2 vuruş, noktalı ikilik 2 + 1 = 3 vuruş: üç dörtlükte bütün ölçü.',
      art: { kind: 'rhythm', pattern: 'q q q | hd', beatsPerBar: 3 },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'meter',
      prompt: 'Üç dörtlükte bir ölçü kaç vuruş?',
      options: ['3', '4', '2'],
      answer: 0,
      explain: 'Adı üstünde: üç dörtlük, üç vuruş.',
    },
    {
      type: 'choice',
      topic: 'dotted',
      prompt: 'Noktalı ikilik kaç vuruş sürer?',
      art: { kind: 'rhythm', pattern: 'hd', beatsPerBar: 3 },
      options: ['3', '2', '4'],
      answer: 0,
      explain: 'Nokta yarısını ekler: 2 + 1 = 3 vuruş.',
    },
  ],
}

const DOTTED: TheorySpec = {
  topics: { dotted: 'Noktalı dörtlük', count: 'Sayma' },
  cards: [
    {
      title: 'Noktalı dörtlük',
      text: 'Nokta dörtlüğü yarısı kadar uzatır: 1 + ½ = 1,5 vuruş. Ardından gelen sekizlik ölçüyü tamamlar: "1 (2) ve".',
      art: { kind: 'rhythm', pattern: 'qd e q q | qd e h' },
    },
    {
      title: 'Uzun-kısa',
      text: 'Noktalı dörtlük ve sekizlik birlikte iki vuruş sürer: uzun bas, ikinci vuruşun "ve"sinde kısacık bir nota.',
      art: { kind: 'rhythm', pattern: 'q q qd e' },
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'dotted',
      prompt: 'Noktalı dörtlük kaç vuruş sürer?',
      art: { kind: 'rhythm', pattern: 'qd e h' },
      options: ['1,5', '1', '2'],
      answer: 0,
      explain: 'Dörtlük 1 vuruş, nokta yarısını ekler: 1,5.',
    },
    {
      type: 'choice',
      topic: 'count',
      prompt: 'Noktalı dörtlükten sonraki sekizlik ne zaman çalınır?',
      art: { kind: 'rhythm', pattern: 'qd e q q' },
      options: ['2. vuruşun "ve"sinde', '2. vuruşta', '3. vuruşta'],
      answer: 0,
      explain: 'Noktalı dörtlük 1,5 vuruş sürer, sekizlik "2 ve"de gelir.',
    },
  ],
}

const values = (...v: RhythmValue[]) => v

/** Ritim 1: Temel Vuruş. */
export const RHYTHM_LESSONS: NoteLesson[] = [
  // Dörtlük
  intro('theory-rhythm-quarter', 'Vuruş ve Dörtlük', 'Eşit vuruşu say: 1, 2, 3, 4', QUARTER),
  echo('rhythm-echo-quarter', 'Dörtlükler', 'q q q q | q q q q', 66),
  drill('rhythm-1', 'Dörtlükler', 'Her vuruşta bir kez bas', 'q q q q', 70),
  beatLesson('rhythm-dino-quarter', 'dino', 'Dino: İlk Adımlar', 'Her vuruşta bir engel, Dino zıplasın', {
    bpm: 72,
    bars: 6,
    values: values('q'),
  }),
  songRhythm('rhythm-song-frere-opening', FRERE_JACQUES_OPENING, 72),
  song('rhythm-tune-frere-opening', FRERE_JACQUES_OPENING, 72),

  // İkilik
  intro('theory-rhythm-half', 'İkilik Nota', 'İki vuruş basılı tut', HALF),
  echo('rhythm-echo-half', 'İkilikler', 'q q h | h q q | h h | q q q q', 70),
  drill('rhythm-2', 'İkilikler', 'Ta ta taa: iki vuruş süren notalar', 'q q h | q q h | h q q | h h', 72),
  beatLesson('rhythm-dino-1', 'dino', 'Dino Koşusu', 'Engel vuruşa geldiğinde bas, Dino zıplasın', {
    bpm: 80,
    bars: 6,
    values: values('q', 'h'),
  }),
  songRhythm('rhythm-song-twinkle', TWINKLE, 76),
  song('rhythm-tune-twinkle', TWINKLE, 76),
  song('rhythm-tune-ode-simple', ODE_SIMPLE, 80),

  // Birlik
  intro('theory-rhythm-whole', 'Birlik Nota', 'Dört vuruş: bütün bir ölçü', WHOLE),
  echo('rhythm-echo-whole', 'Birlikler', 'q q q q | w | h h | w', 72),
  drill('rhythm-whole', 'Birlikler', 'Bas ve dört vuruş tut', 'h q q | w | q q h | w', 76),
  beatLesson(
    'rhythm-drum-whole',
    'drum',
    'Davulcu: Uzun Notalar',
    'Do, Mi ve Sol davullarında dörtlük, ikilik, birlik',
    { bpm: 76, bars: 6, values: values('q', 'h', 'w') },
    DRUMS,
  ),
  songRhythm('rhythm-song-au-clair', AU_CLAIR, 76),
  song('rhythm-tune-au-clair', AU_CLAIR, 76),
  song('rhythm-tune-mary', MARY_LAMB, 80),

  // Dörtlük es
  intro('theory-rhythm-rest', 'Dörtlük Es', 'Bir vuruş sus, saymaya devam et', REST),
  echo('rhythm-echo-rest', 'Esler', 'q q q qr | q qr q qr | h q qr | q qr h', 70),
  drill('rhythm-4', 'Esler', 'Susmak da ritmin parçası', 'q q q qr | q qr q qr | h q qr | q qr h', 72),
  beatLesson(
    'rhythm-drum-1',
    'drum',
    'Ritim Davulcusu',
    'Do, Mi ve Sol davullarını vuruşunda çal',
    { bpm: 76, bars: 6, values: values('q', 'h', 'qr') },
    DRUMS,
  ),
  songRhythm('rhythm-song-buns-rests', HOT_CROSS_BUNS_RESTS, 76),
  song('rhythm-tune-twinkle-rests', TWINKLE_RESTS, 76),
  beatLesson(
    'rhythm-dino-2',
    'dino',
    'Dino Koşusu: Notalı',
    'Engellerdeki notayı vuruşunda çal',
    { bpm: 70, bars: 6, values: values('q', 'h', 'qr') },
    whiteKeysBetween(parseNote('C4'), parseNote('G4')),
  ),
  beatLesson('rhythm-review-1', 'rhythm', 'Büyük Tekrar', 'Dörtlük, ikilik, birlik ve es; tempo yükselir', {
    bpm: 72,
    bars: 4,
    values: values('q', 'h', 'w', 'qr'),
    tempoLadder: { rounds: 3, stepBpm: 8 },
  }),
]

/** Ritim 2: Sekizlikler ve Noktalılar. */
export const RHYTHM2_LESSONS: NoteLesson[] = [
  // Sekizlik
  intro('theory-rhythm-eighth', 'Sekizlik Nota', 'Bir vuruşta iki nota: 1 ve 2 ve', EIGHTH),
  echo('rhythm-echo-eighth', 'Sekizlikler', 'q q e e q | e e e e h | e e q e e q | q e e h', 66),
  drill('rhythm-3', 'Sekizlikler', 'Bir vuruşta iki nota', 'q q e e q | e e q e e q | e e e e h | q e e q q', 66),
  beatLesson(
    'rhythm-drum-2',
    'drum',
    'Davulcu: Sekizlikler',
    'Hızlanan davul partisi',
    { bpm: 80, bars: 6, values: values('q', 'e', 'qr') },
    DRUMS,
  ),
  songRhythm('rhythm-song-buns', HOT_CROSS_BUNS, 72),
  song('rhythm-tune-buns', HOT_CROSS_BUNS, 72),
  song('rhythm-tune-frere', FRERE_JACQUES, 72),

  // Üç dörtlük ve noktalı ikilik
  intro('theory-rhythm-waltz', 'Vals Ölçüsü', 'Vals ölçüsü ve noktalı ikilik', WALTZ),
  echo('rhythm-echo-waltz', 'Üç Dörtlük', 'q q q | h q | hd | q h', 80, 3),
  drill('rhythm-waltz', 'Üç Dörtlük', 'Vals ölçüsü: bir, iki, üç', 'q q q | h q | q q q | hd', 84, 3),
  beatLesson('rhythm-dino-waltz', 'dino', 'Dino Valsi', 'Üç dörtlükte zıpla, eslerde dur', {
    bpm: 90,
    beatsPerBar: 3,
    bars: 6,
    values: values('q', 'h', 'qr'),
  }),
  songRhythm('rhythm-song-danube', BLUE_DANUBE, 84, 3),
  song('rhythm-tune-danube', BLUE_DANUBE, 84, {}, 3),
  song('rhythm-tune-minuet', MINUET, 72, {}, 3),

  // Noktalı dörtlük
  intro('theory-rhythm-dotted', 'Nokta Ne Yapar?', 'Bir buçuk vuruş, sonra bir sekizlik', DOTTED),
  echo('rhythm-echo-dotted', 'Noktalılar', 'qd e q q | qd e h | q q qd e | qd e qd e', 64),
  drill(
    'rhythm-dotted',
    'Noktalı Dörtlük',
    'Uzun-kısa: bir buçuk vuruş ve bir sekizlik',
    'qd e q q | qd e h | q q qd e | qd e qd e',
    66,
  ),
  beatLesson(
    'rhythm-drum-dotted',
    'drum',
    'Davulcu: Noktalılar',
    'Noktalı dörtlükleri Do, Mi ve Sol ile çal',
    { bpm: 72, bars: 6, values: values('q', 'qd', 'h') },
    DRUMS,
  ),
  songRhythm('rhythm-song-london', LONDON_BRIDGE, 72),
  song('rhythm-tune-london', LONDON_BRIDGE, 72),
  song('rhythm-tune-ode', ODE, 80),

  // Büyük tekrar
  beatLesson('rhythm-5', 'rhythm', 'Karışık Ritim', 'Dörtlük, ikilik, sekizlik ve es bir arada', {
    bpm: 76,
    values: values('q', 'h', 'e', 'qr'),
  }),
  song('rhythm-tune-jingle', JINGLE_BELLS, 84),
  {
    ...song('rhythm-tune-frere-ladder', FRERE_JACQUES, 72, { tempoLadder: { rounds: 3, stepBpm: 8 } }),
    title: 'Şarkı Merdiveni',
  },
  beatLesson('rhythm-review-2', 'rhythm', 'Ritim Ustası', 'Bütün kalıplar karışık; tempo yükselir', {
    bpm: 72,
    bars: 4,
    values: values('q', 'h', 'e', 'qr', 'qd'),
    tempoLadder: { rounds: 3, stepBpm: 8 },
  }),
]
