// Unit 8 "Kulak Eğitimi": hearing high and low, finding notes from the
// reference Do, intervals (each remembered by a copyright-free song), chord
// colours, and the harder Melodi Hafızası games (leaps, songs phrase by
// phrase, by ear, backwards). Kulak Dedektifi lessons are `kind: 'ear'`.

import { fitKeyboard, parseNote, whiteKeysBetween } from '../../music/notes'
import type { Tune } from '../../rhythm/plan'
import { MARY_LAMB, ODE_SIMPLE, TWINKLE } from '../../rhythm/tunes'
import { songMemory } from '../memory/engine'
import type { NoteLesson } from '../noteHunter/lessons'
import type { TheoryCard, TheorySpec } from '../theory/quiz'
import { CHORD_SHAPES, type ChordColour, COLOUR_HINTS, COLOUR_LABELS, intervalInfo } from './intervals'
import { earNotes, type EarSpec } from './session'

const n = parseNote
const C4 = n('C4')
const OCTAVE = whiteKeysBetween(C4, n('C5'))

function earLesson(id: string, title: string, description: string, ear: EarSpec): NoteLesson {
  const notes = earNotes(ear)
  return {
    id,
    kind: 'ear',
    title,
    description,
    clef: 'treble',
    notes,
    length: ear.cases.reduce((k, c) => k + c.count, 0),
    keyboard: fitKeyboard(notes, { fromDo: true }),
    ear,
  }
}

function theoryLesson(id: string, title: string, description: string, theory: TheorySpec): NoteLesson {
  return {
    id,
    kind: 'theory',
    title,
    description,
    clef: 'treble',
    notes: OCTAVE,
    length: theory.questions.length,
    keyboard: { low: C4, high: n('C5') },
    theory,
  }
}

function memoryLesson(
  id: string,
  title: string,
  description: string,
  notes: number[],
  memory: NoteLesson['memory'] & object,
): NoteLesson {
  return {
    id,
    kind: 'memory',
    title,
    description,
    clef: 'treble',
    notes,
    length: 0,
    keyboard: fitKeyboard(notes),
    memory,
  }
}

function songLesson(id: string, title: string, description: string, tune: Tune, listenOnly = false): NoteLesson {
  const notes = [...new Set(songMemory(tune).notes.map((s) => s.midi))].sort((a, b) => a - b)
  return memoryLesson(id, title, description, notes, {
    startLength: 0,
    maxLength: 0,
    tune,
    ...(listenOnly && { listenOnly }),
  })
}

/** A card about one interval: its name, its song, its keys and its sound. */
function intervalCard(semitones: number, from = C4): TheoryCard {
  const info = intervalInfo(semitones)
  const song = info.song
  const way = song?.way ?? 'up'
  const notes = way === 'down' ? [from + semitones, from] : [from, from + semitones]
  return {
    title: info.name,
    text: song
      ? `${semitones} yarım ses. “${song.title}” (${song.original}, ${song.origin}) ${
          way === 'down'
            ? 'bu aralıkla iner'
            : way === 'together'
              ? 'bu iki notayı birlikte çalarak açılır'
              : 'bu aralıkla başlar'
        }: aralığı duyunca şarkının başını hatırla.`
      : `${semitones} yarım ses: iki nota aynı adı taşır, ikincisi bir oktav incedir.`,
    art: { kind: 'keyboard', low: Math.min(...notes) < C4 ? C4 - 12 : C4, high: n('C5'), marks: notes, labels: true },
    sound: [{ notes, together: way === 'together' }],
  }
}

const INTRO: TheorySpec = {
  topics: { pitch: 'Kalın ve ince sesler', interval: 'Aralık', chord: 'Akorun rengi' },
  cards: [
    {
      title: 'Kulak da çalışır',
      text: 'Kulağın da parmakların gibi çalıştıkça gelişir. Bu ünitede sesleri dinleyip bulacağız: Notiş dedektif oldu, her soru çözülecek bir vaka!',
    },
    {
      title: 'Kalın ve ince',
      text: 'Klavyede sağa gittikçe ses incelir, sola gittikçe kalınlaşır. Dinle: önce Orta Do, sonra bir oktav yukarıdaki Do.',
      art: { kind: 'keyboard', low: C4, high: n('C5'), marks: [C4, n('C5')], labels: true },
      sound: [{ notes: [C4, n('C5')] }],
    },
    {
      title: 'Aralık',
      text: 'İki nota arasındaki uzaklığa aralık denir. Do ile Mi arası bir üçlü, Do ile Sol arası bir beşlidir. Her aralığın kendine has bir sesi var.',
      art: { kind: 'keyboard', low: C4, high: n('C5'), marks: [C4, n('E4'), n('G4')], labels: true },
      sound: [{ notes: [C4, n('E4')] }, { notes: [C4, n('G4')] }],
    },
    {
      title: 'Akorun rengi',
      text: 'Akorların da renkleri var: majör parlak ve neşeli, minör hüzünlü duyulur. Dinle: önce Do Majör, sonra Do Minör.',
      art: { kind: 'keyboard', low: C4, high: n('C5'), marks: [C4, n('E4'), n('G4')], labels: true },
      sound: [
        { notes: [C4, n('E4'), n('G4')], together: true },
        { notes: [C4, n('D#4'), n('G4')], together: true },
      ],
    },
    {
      title: 'Dedektif nasıl çalışır?',
      text: 'Her vakada önce dinle. İstediğin kadar “Tekrar dinle” diyebilirsin. Yanlış cevapta Notiş önce senin seçtiğini, sonra doğrusunu çalar: farkı duymak en iyi öğretmendir.',
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'pitch',
      prompt: 'Klavyede sağa doğru gidince ses nasıl değişir?',
      options: ['İncelir', 'Kalınlaşır', 'Değişmez'],
      answer: 0,
      explain: 'Sağdaki tuşlar daha ince, soldakiler daha kalın ses verir.',
    },
    {
      type: 'choice',
      topic: 'interval',
      prompt: 'İki nota arasındaki uzaklığa ne denir?',
      options: ['Aralık', 'Akor', 'Ritim'],
      answer: 0,
      explain: 'İki nota arasındaki uzaklık aralıktır; aynı anda çalınan üç ya da daha fazla nota ise akordur.',
    },
    {
      type: 'choice',
      topic: 'chord',
      prompt: 'Hüzünlü duyulan akor hangisi?',
      sound: [{ notes: [C4, n('D#4'), n('G4')], together: true }],
      options: ['Minör', 'Majör'],
      answer: 0,
      explain: 'Minör akorlar hüzünlü, majör akorlar parlak ve neşeli duyulur.',
    },
  ],
}

const INTERVALS: TheorySpec = {
  topics: { songs: 'Aralıkların şarkıları', size: 'Aralıkların büyüklüğü' },
  cards: [
    {
      title: 'Aralıkları şarkılarla hatırla',
      text: 'Müzisyenler aralıkları tanımak için onlarla başlayan şarkıları kullanır. Bu şarkıların hepsi yüzyıllık, herkesin bildiği ezgiler. Yan yana iki tuş arası (siyah tuşlar da sayılır) bir yarım sestir.',
    },
    intervalCard(2),
    intervalCard(1, n('D#4')),
    intervalCard(4),
    intervalCard(3, n('A4') - 12),
    intervalCard(5),
    intervalCard(7),
    intervalCard(9, n('G4') - 12),
    intervalCard(12),
    intervalCard(6, n('A4') - 12),
  ],
  questions: [
    {
      type: 'choice',
      topic: 'songs',
      prompt: '“Küçük Yıldız” (Ah ! vous dirai-je, maman) hangi aralıkla başlar?',
      sound: [{ notes: [C4, C4, n('G4')] }],
      options: ['Tam beşli', 'Büyük üçlü', 'Oktav'],
      answer: 0,
      explain: 'Do Do Sol Sol: Do ile Sol arası tam beşlidir (7 yarım ses).',
    },
    {
      type: 'choice',
      topic: 'songs',
      prompt: '“Uyuyor musun?” (Frère Jacques) ilk iki notası hangi aralık?',
      sound: [{ notes: [C4, n('D4')] }],
      options: ['Büyük ikili', 'Tam dörtlü', 'Küçük üçlü'],
      answer: 0,
      explain: 'Do’dan Re’ye bir büyük ikili (2 yarım ses): bir tuş atlayarak komşu beyaz tuşa.',
    },
    {
      type: 'choice',
      topic: 'size',
      prompt: 'Hangisi daha geniş bir aralık?',
      options: ['Tam beşli', 'Büyük üçlü'],
      answer: 0,
      explain: 'Tam beşli 7, büyük üçlü 4 yarım sestir.',
    },
    {
      type: 'choice',
      topic: 'size',
      prompt: 'Do ile bir üstteki Do arası hangi aralık?',
      options: ['Oktav', 'Tam beşli', 'Büyük altılı'],
      answer: 0,
      explain: 'Aynı adı taşıyan iki nota arası oktavdır (12 yarım ses).',
    },
  ],
}

/** Names of the notes of a chord on Do, spelled as written (Mi♭, not Re#). */
const ON_C: Record<number, string> = { 0: 'Do', 3: 'Mi♭', 4: 'Mi', 6: 'Sol♭', 7: 'Sol', 8: 'Sol#', 10: 'Si♭', 11: 'Si' }
const spelledOnC = (semitones: number) => ON_C[semitones]

const COLOUR_ORDER: ChordColour[] = ['major', 'minor', 'dim', 'aug', 'dom7', 'maj7', 'min7']

const CHORDS: TheorySpec = {
  topics: { colour: 'Akor renkleri' },
  cards: [
    {
      title: 'Üçlülerin dört rengi',
      text: 'Bir akoru oluşturan aralıklar ona rengini verir. Kök sesin üstünde büyük üçlü varsa majör, küçük üçlü varsa minör olur. Aşağıdaki kartlarda her rengi Do üzerinde dinle.',
    },
    ...COLOUR_ORDER.map((c): TheoryCard => ({
      title: `${COLOUR_LABELS[c]} akor`,
      text: `${COLOUR_HINTS[c]} Do üzerinde: ${CHORD_SHAPES[c].map((s) => spelledOnC(s)).join('-')}.`,
      art: { kind: 'keyboard', low: C4, high: n('C5'), marks: CHORD_SHAPES[c].map((s) => C4 + s), labels: true },
      sound: [{ notes: CHORD_SHAPES[c].map((s) => C4 + s), together: true }],
    })),
  ],
  questions: [
    {
      type: 'choice',
      topic: 'colour',
      prompt: 'Bu akor hangi renkte?',
      sound: [{ notes: [n('F4'), n('A4'), n('C5')], together: true }],
      options: ['Majör', 'Minör'],
      answer: 0,
      explain: 'Fa-La-Do: kökün üstünde büyük üçlü var, parlak duyulur: majör.',
    },
    {
      type: 'choice',
      topic: 'colour',
      prompt: 'Bu akor hangi renkte?',
      sound: [{ notes: [n('A3'), C4, n('E4')], together: true }],
      options: ['Minör', 'Majör'],
      answer: 0,
      explain: 'La-Do-Mi: kökün üstünde küçük üçlü var, hüzünlü duyulur: minör.',
    },
    {
      type: 'choice',
      topic: 'colour',
      prompt: 'Bir yere çözülmek isteyen, soru gibi duyulan yedili hangisi?',
      sound: [{ notes: [n('G3'), n('B3'), n('D4'), n('F4')], together: true }],
      options: ['Dominant yedili', 'Majör yedili'],
      answer: 0,
      explain: 'Dominant yedili (Sol7) gerilim taşır ve Do’ya çözülmek ister.',
    },
  ],
}

const OCTAVE_RANGE = { low: C4, high: n('C5') }
const WIDE_RANGE = { low: n('G3'), high: n('G5') }
const CHORD_RANGE = { low: n('F3'), high: n('E5') }

/** Unit 8: ear training and memory. */
export const EAR_LESSONS: NoteLesson[] = [
  theoryLesson('ear-intro', 'Kulağa Giriş', 'Kalın ve ince, aralık, akorun rengi', INTRO),
  earLesson('ear-direction', 'Yüksek mi Alçak mı?', 'İkinci nota yükseldi mi, alçaldı mı?', {
    cases: [{ task: 'direction', pool: OCTAVE, count: 10 }],
  }),
  earLesson('ear-pitch-1', 'Dedektif: Do ve Sol', 'Önce Do çalar, sonra gizli nota: hangisi?', {
    cases: [{ task: 'pitch', pool: [C4, n('G4')], count: 8 }],
  }),
  earLesson('ear-pitch-2', 'Dedektif: Do, Mi, Sol', 'Üç notadan gizli olanı bul', {
    cases: [{ task: 'pitch', pool: [C4, n('E4'), n('G4')], count: 10 }],
  }),
  memoryLesson(
    'ear-memory-leaps',
    'Atlamalı Hafıza',
    'Do Majör akorunun notalarıyla sıçrayan diziler',
    [n('G3'), C4, n('E4'), n('G4'), n('C5'), n('E5')],
    { startLength: 3, maxLength: 7, leaps: true },
  ),
  earLesson('ear-pitch-3', 'Dedektif: Do Pozisyonu', "Do'dan Sol'a beş nota", {
    cases: [{ task: 'pitch', pool: whiteKeysBetween(C4, n('G4')), count: 10 }],
  }),
  earLesson('ear-pitch-4', 'Dedektif: Bütün Oktav', "Do'dan ince Do'ya sekiz nota", {
    cases: [{ task: 'pitch', pool: OCTAVE, count: 12 }],
  }),
  songLesson('ear-song-1', 'Şarkı Hafızası: Küçük Yıldız', 'Cümle cümle dinle ve ezberden çal', TWINKLE),
  theoryLesson('ear-intervals', 'Aralıklar ve Şarkıları', 'Her aralığı bir şarkıyla hatırla', INTERVALS),
  earLesson('ear-int-1', 'İkili mi Üçlü mü?', 'Büyük ikili ve büyük üçlü, çıkan', {
    cases: [{ task: 'interval', intervals: [2, 4], ways: ['up'], ...OCTAVE_RANGE, count: 10 }],
  }),
  earLesson('ear-int-2', 'Büyük mü Küçük mü?', 'Büyük üçlü ve küçük üçlü', {
    cases: [{ task: 'interval', intervals: [3, 4], ways: ['up'], ...OCTAVE_RANGE, count: 10 }],
  }),
  earLesson('ear-int-3', 'Dörtlü, Beşli, Oktav', 'Geniş aralıklar, çıkan', {
    cases: [{ task: 'interval', intervals: [5, 7, 12], ways: ['up'], ...OCTAVE_RANGE, count: 12 }],
  }),
  earLesson('ear-sing-1', 'Aralık Avı', 'İlk nota yanar; ikincisini kulağınla bul', {
    cases: [{ task: 'sing', intervals: [2, 4, 5, 7], ways: ['up'], ...OCTAVE_RANGE, count: 10 }],
  }),
  songLesson('ear-song-2', 'Şarkı Hafızası: Neşeye Övgü', 'Dört cümle, sonunda bütün şarkı', ODE_SIMPLE),
  earLesson('ear-int-down', 'İnen Aralıklar', 'Aynı aralıklar bu kez aşağı doğru', {
    cases: [{ task: 'interval', intervals: [2, 4, 7, 12], ways: ['down'], ...OCTAVE_RANGE, count: 12 }],
  }),
  earLesson('ear-int-together', 'Aynı Anda', 'İki nota birlikte: aralığı duy', {
    cases: [{ task: 'interval', intervals: [3, 4, 7, 12], ways: ['together'], ...OCTAVE_RANGE, count: 12 }],
  }),
  earLesson('ear-int-all', 'Bütün Aralıklar', 'Küçük ikiliden oktava, çıkan ve inen', {
    cases: [
      { task: 'interval', intervals: [1, 2, 3, 4, 5, 6, 7, 9, 12], ways: ['up', 'down'], ...WIDE_RANGE, count: 14 },
    ],
  }),
  memoryLesson('ear-memory-reverse', 'Ters Hafıza', 'Diziyi dinle, sondan başa çal', whiteKeysBetween(C4, n('C5')), {
    startLength: 3,
    maxLength: 6,
    reverse: true,
  }),
  theoryLesson('ear-chords', 'Akorların Renkleri', 'Majör, minör, eksik, artık ve yedililer', CHORDS),
  earLesson('ear-chord-1', 'Majör mü Minör mü?', 'Parlak mı, hüzünlü mü?', {
    cases: [{ task: 'chord', colours: ['major', 'minor'], ...CHORD_RANGE, count: 10 }],
  }),
  earLesson('ear-chord-2', 'Eksik ve Artık', 'Dört üçlü rengi', {
    cases: [{ task: 'chord', colours: ['major', 'minor', 'dim', 'aug'], ...CHORD_RANGE, count: 12 }],
  }),
  earLesson('ear-chord-3', 'Yedili Akorlar', 'Dominant, majör ve minör yedili', {
    cases: [{ task: 'chord', colours: ['dom7', 'maj7', 'min7'], ...CHORD_RANGE, count: 10 }],
  }),
  songLesson('ear-song-3', 'Kulaktan Şarkı: Ufak Kuzu', 'Tuşlar yanmaz, yalnızca ilk nota gösterilir', MARY_LAMB, true),
  earLesson('ear-final', 'Büyük Vaka', 'Her şeyden biraz: ünitenin finali', {
    mix: true,
    cases: [
      { task: 'direction', pool: OCTAVE, count: 2 },
      { task: 'pitch', pool: OCTAVE, count: 3 },
      { task: 'interval', intervals: [2, 3, 4, 5, 7, 12], ways: ['up', 'down', 'together'], ...OCTAVE_RANGE, count: 4 },
      { task: 'sing', intervals: [3, 4, 7], ways: ['up'], ...OCTAVE_RANGE, count: 2 },
      { task: 'chord', colours: ['major', 'minor', 'dim', 'dom7'], ...CHORD_RANGE, count: 3 },
    ],
  }),
]
