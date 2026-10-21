// Tonlar yolculuğu: one unit per major key and its relative minor, in the
// order of the circle of fifths (C, G, F, D, B♭ ... F♯). Every unit is built
// from the same template so the learner meets the same steps in each key:
// the scale, the triads on its degrees, inversions and the inversion ladder,
// cadences, arpeggios, the relative minor, memory, a song in the key and a
// boss. Each level of three units asks a little more (contrary motion, two
// octaves, faster ladders, listening only). Pure data.

import {
  chordName,
  chordTarget,
  degreeChord,
  type Inversion,
  inversionLadder,
  keyTriads,
  MAJOR_DEGREES,
  progression,
  scaleChords,
} from '../../music/chords'
import { type Letter, midiFrom, SOLFEGE } from '../../music/notes'
import { keyAccidentals, parseTonic, type ScaleType, scaleOctave, type Tonic, tonicName } from '../../music/scales'
import { BRAHMS_LULLABY, GOING_HOME, MORNING_MOOD, ROW_BOAT, SUSANNA } from '../arcade/train/tunes'
import { FRERE_JACQUES, JINGLE_BELLS, LONDON_BRIDGE, MARY_LAMB, MINUET, ODE_SIMPLE, TWINKLE } from '../../rhythm/tunes'
import type { Tune } from '../../rhythm/plan'
import { type BossDef, type BossLook, buildBoss } from '../boss/bosses'
import type { ArpeggioPart } from '../chords/arpeggio'
import { arpeggioLesson, chordLesson, type ChordSpec } from '../chords/lessons'
import { stepsKeyboard, type ScalePart } from '../scales/steps'
import { ladderLesson, memoryLesson, scaleLesson } from '../scales/lessons'
import type { NoteLesson } from '../noteHunter/lessons'
import type { Question, TheorySpec } from '../theory/quiz'
import { pieceSteps, type PiecePart } from './piece'

export interface KeyDef {
  /** Unit id suffix: "g", "bb", "fs". */
  id: string
  /** The major key ("Bb") and its relative minor's tonic ("G"). */
  major: string
  minor: string
  /** The song carried into the key. */
  tune: Tune
  boss: { name: string; taunt: string; look: BossLook }
}

const look = (body: string, dark: string, belly: string, rest: Partial<BossLook> = {}): BossLook => ({
  body,
  dark,
  belly,
  shape: 'blob',
  eyes: 2,
  features: [],
  ...rest,
})

/** The twelve keys around the circle of fifths: sharps and flats alternate, one more each time. */
export const KEYS: KeyDef[] = [
  {
    id: 'c',
    major: 'C',
    minor: 'A',
    tune: ODE_SIMPLE,
    boss: {
      name: 'Beyaz Tuş Bekçisi',
      taunt: 'Burada yalnızca beyaz tuşlar var. Ama yedi akorumu tek tek bilmeden geçemezsin!',
      look: look('#f2f2f2', '#b5b5b5', '#ffffff', { features: ['crown'] }),
    },
  },
  {
    id: 'g',
    major: 'G',
    minor: 'E',
    tune: MARY_LAMB,
    boss: {
      name: 'Fa Diyez Faresi',
      taunt: 'Cik cik! Fa’ya beyaz tuştan basarsan peynirimi kaparım!',
      look: look('#9aa5b1', '#6b7785', '#dde3ea', { features: ['roundEars', 'tail'] }),
    },
  },
  {
    id: 'f',
    major: 'F',
    minor: 'D',
    tune: TWINKLE,
    boss: {
      name: 'Si Bemol Baykuşu',
      taunt: 'Huu huu! Gecenin bir yarısı Si’yi unutan çok gördüm.',
      look: look('#a0784e', '#6f4f2f', '#e9d3b0', { eyes: 2, features: ['wings', 'horns'] }),
    },
  },
  {
    id: 'd',
    major: 'D',
    minor: 'B',
    tune: LONDON_BRIDGE,
    boss: {
      name: 'İki Diyezli Ejder',
      taunt: 'İki diyezim, iki kanadım var. Köprüden geçmek için kadansımı çal!',
      look: look('#3fb27f', '#23805a', '#c9f1dd', { features: ['wings', 'spikes', 'tail'] }),
    },
  },
  {
    id: 'bb',
    major: 'Bb',
    minor: 'G',
    tune: FRERE_JACQUES,
    boss: {
      name: 'Bemol Bulutu',
      taunt: 'Fıssss... İki bemolümle her yeri sise boğarım. Gamını bulabilecek misin?',
      look: look('#8fa8d9', '#5d76ad', '#e3ebfb', { shape: 'ghost', eyes: 2 }),
    },
  },
  {
    id: 'a',
    major: 'A',
    minor: 'F#',
    tune: JINGLE_BELLS,
    boss: {
      name: 'Üç Diyez Kirpisi',
      taunt: 'Üç diyezim dikenlerim kadar sivri. Yanlış tuşa basan batar!',
      look: look('#c58b4c', '#8f5e2a', '#f3dcbc', { features: ['spikes', 'roundEars'] }),
    },
  },
  {
    id: 'eb',
    major: 'Eb',
    minor: 'C',
    tune: GOING_HOME,
    boss: {
      name: 'Mi Bemol Ahtapotu',
      taunt: 'Sekiz kolum var, sen ikiyle mi yetişeceksin? Üç bemolü unutma!',
      look: look('#b05cc6', '#7b3591', '#efd2f6', { features: ['tentacles'] }),
    },
  },
  {
    id: 'e',
    major: 'E',
    minor: 'C#',
    tune: ROW_BOAT,
    boss: {
      name: 'Dört Diyez Boğası',
      taunt: 'Dört diyezim dört boynuz gibi! Çevrimlerinle beni durdurabilir misin?',
      look: look('#d0533f', '#932f20', '#f8cfc6', { features: ['horns', 'tail'] }),
    },
  },
  {
    id: 'ab',
    major: 'Ab',
    minor: 'F',
    tune: MORNING_MOOD,
    boss: {
      name: 'La Bemol Sultanı',
      taunt: 'Sarayıma dört bemolle girilir. Arpejlerin yumuşak olsun!',
      look: look('#e0a526', '#a7760c', '#fbe6b0', { features: ['turban'] }),
    },
  },
  {
    id: 'b',
    major: 'B',
    minor: 'G#',
    tune: SUSANNA,
    boss: {
      name: 'Beş Diyez Robotu',
      taunt: 'Bip bop! Beş diyez yükleniyor... Sol diyez minörde Fa çift diyezi bilir misin?',
      look: look('#7b8a97', '#4f5c68', '#d5dde4', { eyes: 4, features: ['mask'] }),
    },
  },
  {
    id: 'db',
    major: 'Db',
    minor: 'Bb',
    tune: BRAHMS_LULLABY,
    boss: {
      name: 'Re Bemol Hayaleti',
      taunt: 'Bööö! Beş bemol, beş siyah tuş. Ninnimle uyumadan çalabilecek misin?',
      look: look('#6c5ce7', '#4434b8', '#d9d4ff', { shape: 'ghost', eyes: 1 }),
    },
  },
  {
    id: 'fs',
    major: 'F#',
    minor: 'D#',
    tune: MINUET,
    boss: {
      name: 'Çember Kralı',
      taunt: 'Altı diyez! Çemberin sonuna geldin. Tahtımı almak için her şeyi bilmelisin.',
      look: look('#ff8a3d', '#c85a12', '#ffe2c9', { features: ['crown', 'wings', 'teeth'] }),
    },
  },
]

/** Units 1–3 are level 0, 4–6 level 1, 7–9 level 2, 10–12 level 3. */
const levelOf = (index: number) => Math.floor(index / 3)

export const keyUnitId = (k: KeyDef) => `key-${k.id}`

const majorName = (k: KeyDef) => `${tonicName(parseTonic(k.major))} Majör`
const minorName = (k: KeyDef) => `${tonicName(parseTonic(k.minor))} Minör`
/** "Fa#", "Si♭": the key name without "Majör". */
const shortName = (key: string) => tonicName(parseTonic(key))

/** "Bb" from a tonic: the form `parseTonic` reads back. */
const tonicText = (t: Tonic) => `${t.letter.toUpperCase()}${t.acc === 1 ? '#' : t.acc === -1 ? 'b' : ''}`

const ACCIDENTAL_ORDER: Record<1 | -1, Letter[]> = {
  1: ['f', 'c', 'g', 'd', 'a', 'e', 'b'],
  [-1]: ['b', 'e', 'a', 'd', 'g', 'c', 'f'],
}

/** The key signature: +n sharps or −n flats, and the altered notes in the order they are written. */
export function signatureOf(key: string): { count: number; notes: string[] } {
  const acc = keyAccidentals(parseTonic(key), 'major')
  const sign = (Object.values(acc).find((a) => a !== 0) ?? 0) as 0 | 1 | -1
  if (sign === 0) return { count: 0, notes: [] }
  const letters = ACCIDENTAL_ORDER[sign].filter((l) => acc[l] === sign)
  return { count: sign * letters.length, notes: letters.map((l) => `${SOLFEGE[l]}${sign > 0 ? '#' : '♭'}`) }
}

const list = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`

/** "bir diyez", "üç bemol". */
function signatureText(count: number): string {
  const words = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi']
  return `${words[Math.abs(count)]} ${count > 0 ? 'diyez' : 'bemol'}`
}

/** Three options with the right one at `slot`: the learner can never learn "always the first". */
function options(right: string, wrong: string[], slot: number): { options: string[]; answer: number } {
  const out = [...wrong.slice(0, 2)]
  const answer = slot % 3
  out.splice(answer, 0, right)
  return { options: out, answer }
}

/** The tonic's octave for pictures: the scale from octave 4 up. */
const SCALE_ART_OCTAVE = 4

/** Tanışma: the key signature, the scale on the keys, the chords of its degrees and the relative minor. */
function introSpec(k: KeyDef, index: number): TheorySpec {
  const tonic = parseTonic(k.major)
  const minorTonic = parseTonic(k.minor)
  const M = majorName(k)
  const m = minorName(k)
  const sig = signatureOf(k.major)
  const scale = scaleOctave(tonic, 'major', SCALE_ART_OCTAVE)
  const minorScale = scaleOctave(minorTonic, 'harmonic', SCALE_ART_OCTAVE)
  const names = scale.map((n) => `${SOLFEGE[n.letter]}${n.acc === 1 ? '#' : n.acc === -1 ? '♭' : ''}`)
  const minorNames = minorScale.map((n) => `${SOLFEGE[n.letter]}${n.acc > 0 ? '#'.repeat(n.acc) : '♭'.repeat(-n.acc)}`)
  const chords = MAJOR_DEGREES.map((numeral) => {
    const c = degreeChord(k.major, numeral)
    return `${numeral} ${chordName(c.root, c.quality)}`
  })
  const low = midiFrom('c', SCALE_ART_OCTAVE)
  const sigText =
    sig.count === 0
      ? `${M}’ün donanımı boştur: hiç diyez ya da bemol yok. Gam yalnızca beyaz tuşlardan oluşur.`
      : `${M}’ün donanımında ${signatureText(sig.count)} var: ${list(sig.notes)}. Anahtarın hemen yanına yazılır ve parça boyunca geçerlidir: ${list(sig.notes.map((n) => n.replace(/[#♭]/, '')))} gördüğün her yerde ${sig.count > 0 ? 'diyezli' : 'bemollü'} çalarsın.`
  const raised = minorScale[6]
  const raisedName = minorNames[6]
  const naturalSeventh = scaleOctave(minorTonic, 'natural', 4)[6]
  const naturalSeventhName = `${SOLFEGE[naturalSeventh.letter]}${naturalSeventh.acc === 1 ? '#' : naturalSeventh.acc === -1 ? '♭' : ''}`
  const iv = scale[3]
  const v = scale[4]
  const ii = degreeChord(k.major, 'ii')
  const iii = degreeChord(k.major, 'iii')
  const dominant = parseTonic(tonicText(v))
  const questions: Question[] = [
    {
      type: 'choice',
      topic: 'donanim',
      prompt:
        sig.count === 0
          ? `${M}’ün donanımında kaç diyez ya da bemol var?`
          : `${M}’ün donanımında kaç ${sig.count > 0 ? 'diyez' : 'bemol'} var?`,
      ...options(
        sig.count === 0 ? 'Hiç yok' : String(Math.abs(sig.count)),
        sig.count === 0
          ? ['1', '2']
          : [String(Math.abs(sig.count) + 1), Math.abs(sig.count) === 1 ? 'Hiç yok' : String(Math.abs(sig.count) - 1)],
        index,
      ),
      art: { kind: 'staff', keySig: sig.count },
      explain: sigText,
    },
    {
      type: 'key',
      topic: 'basamak',
      prompt: `${M} gamının 4. basamağına (IV) bas.`,
      pitchClass: ((iv.midi % 12) + 12) % 12,
      explain: `${shortName(k.major)}’dan saymaya başla: ${names.slice(0, 4).join(', ')}. 4. basamak ${names[3]}.`,
    },
    {
      type: 'key',
      topic: 'basamak',
      prompt: `${M} gamının 5. basamağına (V) bas.`,
      pitchClass: ((v.midi % 12) + 12) % 12,
      explain: `${names.slice(0, 5).join(', ')}: 5. basamak ${names[4]}. V akoru bu notanın üstüne kurulur.`,
    },
    {
      type: 'choice',
      topic: 'akor',
      prompt: `${M}’de ii akoru hangisi?`,
      ...options(
        chordName(ii.root, ii.quality),
        [chordName(ii.root, 'major'), chordName(iii.root, iii.quality)],
        index + 1,
      ),
      explain: `ii, 2. basamağın (${names[1]}) üstündeki üçlüdür ve her majörde minördür: ${chordName(ii.root, ii.quality)}.`,
    },
    {
      type: 'choice',
      topic: 'minor',
      prompt: `${M}’ün göreceli minörü hangisi?`,
      ...options(m, [chordName(tonic, 'minor'), chordName(dominant, 'minor')], index + 2),
      explain: `Göreceli minör gamın 6. basamağından (${names[5]}) başlar ve aynı donanımı kullanır: ${m}.`,
    },
    {
      type: 'key',
      topic: 'minor',
      prompt: `${m} armonik minörde yükselen 7. basamağa bas.`,
      pitchClass: ((raised.midi % 12) + 12) % 12,
      explain: `Doğal minörde 7. basamak ${naturalSeventhName}; armonik minörde yarım ses yükselir: ${raisedName}.`,
    },
  ]
  return {
    cards: [
      {
        title: `${M}: donanım`,
        text: sigText,
        art: { kind: 'staff', keySig: sig.count, spelled: scale, captions: names },
      },
      {
        title: 'Klavyede',
        text: `${M} gamı: ${names.join(' ')}.${sig.count ? ` Siyah tuşlar: ${list(sig.notes)}.` : ''} Parmak numaraları gam derslerinde notaların üstünde yazar.`,
        art: { kind: 'keyboard', low, high: low + 24, marks: scale.map((n) => n.midi) },
      },
      {
        title: 'Gamın akorları',
        text: `Gamın her basamağına bir üçlü kurulur ve sıra her majörde aynıdır: majör, minör, minör, majör, majör, minör, eksik. ${M}’de: ${chords.join(', ')}. En önemlileri I, IV ve V: çoğu şarkı bu üçüyle çalınır.`,
        art: {
          kind: 'keyboard',
          low,
          high: low + 24,
          marks: scaleChords(k.major)[0].notes.map((n) => n.midi),
        },
      },
      {
        title: `Göreceli minör: ${m}`,
        text: `${m}, ${M}’ün göreceli minörüdür: aynı donanım ve aynı notalar, ama ${shortName(k.minor)}’dan başlar ve hüzünlü duyulur. Armonik minörde 7. basamak yarım ses yükselir: ${naturalSeventhName} yerine ${raisedName}. Böylece V akoru majör olur ve eve güçlü bir dönüş yapar.`,
        art: { kind: 'staff', keySig: sig.count, spelled: minorScale, captions: minorNames },
      },
    ],
    questions,
    topics: {
      donanim: 'Donanım',
      basamak: 'Gamın basamakları',
      akor: 'Gamın akorları',
      minor: 'Göreceli minör',
    },
  }
}

/** Arpeggio parts in the key: triads on white keys only, where 1-2-3-5 is the standard fingering. */
function arpeggioParts(k: KeyDef, level: number): ArpeggioPart[] {
  const picks: ArpeggioPart[] = []
  for (const numeral of ['I', 'vi', 'IV', 'V', 'ii', 'iii']) {
    const { root, quality } = degreeChord(k.major, numeral)
    if (root.acc !== 0 || (quality !== 'major' && quality !== 'minor')) continue
    picks.push({ root: tonicText(root), quality, hands: 'right' })
    if (picks.length === 2) break
  }
  const [first, second] = picks
  if (level === 0) return [first, ...(second ? [second] : []), { ...first, hands: 'left' }]
  if (level === 1)
    return [first, { ...first, hands: 'left' }, ...(second ? [{ ...second, hands: 'parallel' as const }] : [])]
  return [
    { ...first, octaves: 2 },
    { ...first, hands: 'parallel' },
    ...(second ? [{ ...second, hands: 'parallel' as const }] : []),
  ]
}

const MIDI_PER_OCTAVE = 12

/** I, IV and V of the major key in every inversion. */
function primaryInversions(k: KeyDef): ReturnType<typeof chordTarget>[] {
  return ['I', 'IV', 'V'].flatMap((numeral) => {
    const { root, quality } = degreeChord(k.major, numeral)
    return ([0, 1, 2] as Inversion[]).map((inv) => chordTarget(root, quality, inv, 'right', numeral))
  })
}

/** The lessons of one key unit, the boss last. */
export function keyLessons(k: KeyDef, index: number): NoteLesson[] {
  const level = levelOf(index)
  const M = majorName(k)
  const m = minorName(k)
  const id = (slug: string) => `key-${k.id}-${slug}`
  const majorKey: ChordSpec['key'] = { tonic: k.major }
  const minorKey: ChordSpec['key'] = { tonic: k.minor, minor: true }
  const part = (type: ScaleType, hands: ScalePart['hands'], octaves: 1 | 2 = 1, tonic = k.major): ScalePart => ({
    tonic,
    type,
    hands,
    ...(octaves === 2 && { octaves }),
  })

  const intro = introSpec(k, index)
  const introLow = midiFrom('c', SCALE_ART_OCTAVE)
  const lessons: NoteLesson[] = [
    {
      id: id('intro'),
      kind: 'theory',
      title: `${M} ve ${m}`,
      description: 'Donanım, gamın basamakları ve akorları, göreceli minör',
      clef: 'treble',
      notes: [],
      length: intro.questions.length,
      keyboard: { low: introLow, high: introLow + 2 * MIDI_PER_OCTAVE },
      theory: intro,
    },
    scaleLesson(
      id('scale'),
      `${M} Gamı`,
      level >= 2 ? 'Sağ el, bir sonra iki oktav' : 'Sağ el; parmak numaralarını takip et',
      level >= 2 ? [part('major', 'right'), part('major', 'right', 2)] : [part('major', 'right')],
    ),
    ladderLesson(
      id('ladder'),
      `Merdiven: ${M}`,
      level >= 1 ? 'Her vuruşta bir basamak, her turda daha hızlı' : 'Her vuruşta bir basamak tırman',
      54 + level * 6,
      [part('major', 'right')],
      level >= 1 ? { rounds: 3, stepBpm: 8 } : undefined,
    ),
    scaleLesson(
      id('hands'),
      `${M}: Sol El ve İki El`,
      [
        'Sol el, sonra iki el aynı yönde',
        'Sol el, iki el aynı ve zıt yönde',
        'Sol el iki oktav, iki el aynı ve zıt yönde',
        'İki el iki oktav, aynı ve zıt yönde',
      ][level],
      [
        part('major', 'left', level === 2 ? 2 : 1),
        part('major', 'parallel', level === 3 ? 2 : 1),
        ...(level >= 1 ? [part('major', 'contrary')] : []),
      ],
    ),
    chordLesson('chord', id('chords'), `${M} Akorları`, 'Gamın her basamağında bir üçlü: I’den vii°’ye ve geri', {
      chords: scaleChords(k.major),
      mode: 'exact',
      showName: true,
      progression: scaleChords(k.major).map((c) => c.numeral!),
      key: majorKey,
    }),
    chordLesson('chef', id('chef'), `Aşçı: ${M}`, 'Tarifler gamın akorlarıyla geliyor', {
      chords: keyTriads(k.major),
      draw: 10 + 2 * level,
      mode: 'pcs',
      showName: true,
      ...(level < 2 && { showNotes: true }),
    }),
    chordLesson(
      'chord',
      id('inversions'),
      `${M}: Çevrimler`,
      level < 2
        ? 'I, IV ve V üç şekilde: kök durum, 1. ve 2. çevrim'
        : 'I, IV ve V çevrimleri: adları yazmıyor, porteden oku',
      { chords: primaryInversions(k), draw: 12, mode: 'exact', showName: level < 2, key: majorKey },
    ),
    chordLesson(
      'chord',
      id('inv-ladder'),
      `Çevrim Merdiveni: ${shortName(k.major)}`,
      'Akor çevrim çevrim tırmanır, bir oktav yukarıda kök duruma varır ve geri iner',
      {
        chords: ['I', 'IV', 'V'].flatMap((numeral) => {
          const { root, quality } = degreeChord(k.major, numeral)
          return inversionLadder(root, quality, numeral)
        }),
        mode: 'exact',
        showName: true,
        key: majorKey,
      },
    ),
    chordLesson(
      'chord',
      id('cadence'),
      `${M}: Kadanslar`,
      'I – IV – V7 – I ve ii – V7 – I; sol el kök, sağ el yakın geçişler',
      {
        chords: progression(k.major, CADENCE, { hands: 'both' }),
        repeat: 2,
        mode: 'exact',
        showName: true,
        progression: CADENCE,
        key: majorKey,
      },
    ),
    arpeggioLesson(
      id('arpeggio'),
      `${M}: Arpejler`,
      'Akorların notaları sırayla; beyaz tuştan başlayanlar 1-2-3-5',
      arpeggioParts(k, level),
    ),
    scaleLesson(id('minor'), `${m} Gamı`, 'Doğal ve armonik minör; armonikte 7. basamak yükselir', [
      part('natural', 'right', 1, k.minor),
      part('harmonic', 'right', 1, k.minor),
      part('harmonic', 'left', 1, k.minor),
      ...(level >= 2 ? [part('harmonic', 'parallel', 1, k.minor)] : []),
    ]),
    chordLesson('chord', id('minor-chords'), `${m}: Akorlar`, 'i, iv ve majör V ile minör kadans; sol el kök', {
      chords: progression(k.minor, MINOR_CADENCE, { hands: 'both', minor: true }),
      repeat: 2,
      mode: 'exact',
      showName: true,
      progression: MINOR_CADENCE,
      key: minorKey,
    }),
    memoryLesson(
      id('memory'),
      `Hafıza: ${M}`,
      level >= 2 ? 'Tuşlar yanmaz: gamın parçalarını dinle ve çal' : 'Gamın parçalarını izle, dinle ve tekrar et',
      k.major,
      'major',
      4,
      6 + Math.min(level, 2),
      level >= 2,
    ),
    pieceLesson(id('piece'), { tune: k.tune, key: k.major }),
  ]
  return [...lessons, keyBoss(k, lessons)]
}

/** I – IV – V7 – I, then ii – V7 – I: the two cadences of the key, one chord flowing into the next. */
const CADENCE = ['I', 'IV', 'V7', 'I', 'ii', 'V7', 'I']
/** i – iv – V – i, then VI – ii° – V7 – i. */
const MINOR_CADENCE = ['i', 'iv', 'V', 'i', 'VI', 'ii°', 'V7', 'i']

function pieceLesson(lessonId: string, piece: PiecePart): NoteLesson {
  const M = `${shortName(piece.key)} Majör`
  return {
    id: lessonId,
    kind: 'melody',
    title: `${piece.tune.title} (${M})`,
    description: `${piece.tune.original}, ${piece.tune.origin}. ${M}’e taşındı: donanımı unutma.`,
    clef: 'treble',
    notes: [],
    length: 0,
    keyboard: stepsKeyboard(pieceSteps(piece)),
    piece,
  }
}

/** Three phases: the scale with both hands, the cadences, the chord game. */
function keyBoss(k: KeyDef, lessons: NoteLesson[]): NoteLesson {
  const def: BossDef = {
    unit: keyUnitId(k),
    name: k.boss.name,
    taunt: k.boss.taunt,
    look: k.boss.look,
    phases: [
      {
        from: `key-${k.id}-hands`,
        label: 'İki elle gam',
        patch: (l) => ({ scales: l.scales!.filter((p) => p.hands === 'parallel').slice(0, 1) }),
      },
      { from: `key-${k.id}-cadence`, label: 'Kadanslar', patch: (l) => ({ chords: { ...l.chords!, repeat: 1 } }) },
      {
        from: `key-${k.id}-chef`,
        label: 'Akor Aşçısı',
        patch: (l) => ({ chords: { ...l.chords!, draw: 8 }, length: 8 }),
      },
    ],
  }
  return buildBoss(def, lessons)
}

/** "Do Majör ve La Minör". */
export const keyUnitTitle = (k: KeyDef) => `${majorName(k)} ve ${minorName(k)}`

/** Subtitle: the key signature in words. */
export function keyUnitSubtitle(k: KeyDef): string {
  const sig = signatureOf(k.major)
  return sig.count === 0
    ? 'Donanım yok: gam, akorlar, çevrimler, kadanslar'
    : `Donanım: ${list(sig.notes)}; gam, akorlar, çevrimler, kadanslar`
}

/** A colour per key around the colour wheel, like the keys around the circle of fifths. */
export function keyColor(index: number): string {
  const hue = (index * 30 + 200) % 360
  return hslHex(hue, 68, 48)
}

function hslHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Lessons of the relative minor (the rest is the major key's). */
export const MINOR_SLUGS = ['minor', 'minor-chords']
