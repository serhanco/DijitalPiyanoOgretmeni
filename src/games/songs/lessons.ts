// Unit 9 "Şarkılar": Nota Şelalesi with copyright-free songs, easy to hard.
// Each song is first learnt in the waiting mode (the notes stop until the
// keys are down), section by section where it is long, then played on the
// metronome; one hand first, then the left hand, then both.

import { fitKeyboard, parseNote } from '../../music/notes'
import type { Tune } from '../../rhythm/plan'
import type { TempoLadderSpec } from '../../rhythm/tempoLadder'
import type { NoteLesson } from '../noteHunter/lessons'
import type { TheorySpec } from '../theory/quiz'
import { CANON, HANSCHEN, JINGLE_SONG, MARY, MINUET_SONG, ODE_SONG, SAINTS, TWINKLE_SONG, YANKEE } from './catalog'
import { lessonPart, partKeys, type Song, type SongSpec } from './song'

const n = parseNote

interface Extra {
  /** Rhythm mode: a slower or faster suggested tempo than the song's. */
  bpm?: number
  tempoLadder?: TempoLadderSpec
  /** Rhythm mode: light the next key. */
  guide?: boolean
}

/** The start card's song: one song, or the concert's songs together. */
function infoTune(songs: Song[]): Tune {
  if (songs.length === 1) return songs[0]
  return {
    title: 'Konser',
    original: songs.map((s) => s.original).join(' · '),
    origin: songs.map((s) => s.origin).join('; '),
    fact: 'Öğrendiğin şarkılar art arda, iki elle: bir piyanistin ilk küçük konseri.',
    notes: '',
  }
}

function waterfall(id: string, title: string, description: string, spec: SongSpec, extra: Extra = {}): NoteLesson {
  const part = lessonPart(spec)
  const notes = partKeys(part)
  const song = spec.songs[0]
  return {
    id,
    kind: 'waterfall',
    title,
    description,
    clef: spec.hands === 'left' ? 'bass' : 'treble',
    notes,
    length: part.notes.length,
    keyboard: fitKeyboard(notes),
    song: spec,
    rhythm: {
      bpm: extra.bpm ?? song.bpm,
      beatsPerBar: part.beatsPerBar,
      bars: part.bars,
      values: [],
      tune: infoTune(spec.songs),
      ...(extra.guide && { guide: true }),
      ...(extra.tempoLadder && { tempoLadder: extra.tempoLadder }),
    },
  }
}

const wait = (songs: Song | Song[], hands: SongSpec['hands'], bars?: [number, number]): SongSpec => ({
  songs: Array.isArray(songs) ? songs : [songs],
  hands,
  mode: 'wait',
  ...(bars && { bars }),
})
const tempo = (songs: Song | Song[], hands: SongSpec['hands'], bars?: [number, number]): SongSpec => ({
  ...wait(songs, hands, bars),
  mode: 'tempo',
})

const INTRO: TheorySpec = {
  cards: [
    {
      title: 'Nota Şelalesi',
      text: 'Notalar yukarıdan klavyeye doğru akar. Her nota çalacağın tuşun tam üstünden iner; sarı çizgiye değdiği an tuşa bas.',
      art: { kind: 'waterfall', low: n('C4'), high: n('G4'), notes: 'E4/q D4/q C4/q D4/q E4/q E4/q E4/h' },
    },
    {
      title: 'Uzun nota, uzun bas',
      text: 'Notanın boyu, ne kadar süreceğini gösterir. Kısa bir dörtlük bir vuruş, uzun bir ikilik iki vuruş basılı kalır.',
      art: { kind: 'waterfall', low: n('C4'), high: n('G4'), notes: 'C4/q D4/q E4/h G4/w' },
    },
    {
      title: 'İki el, iki renk',
      text: 'Mavi notalar sağ elin, pembe notalar sol elin. İkisi aynı yükseklikteyse iki eli birlikte indir.',
      art: {
        kind: 'waterfall',
        low: n('C3'),
        high: n('G4'),
        notes: 'E4/q D4/q C4/h',
        left: 'C3/h G3/h',
      },
    },
    {
      title: 'Önce bekle, sonra akış',
      text: 'Bekleyen modda şelale sen doğru tuşa basana kadar durur: acele yok. Hatalı biten bölüm bir kez daha akar. Ritimli modda şelale metronomla akar; başlamadan tempoyu yavaşlatabilirsin.',
    },
  ],
  questions: [
    {
      type: 'choice',
      topic: 'when',
      prompt: 'Bir notayı ne zaman çalarsın?',
      options: ['Ekranın üstünde belirince', 'Sarı çizgiye değdiği an', 'Çizgiyi geçtikten sonra'],
      answer: 1,
      explain: 'Nota sarı çizgiye değdiği an tuşa basılır; o an klavyeye "iner".',
    },
    {
      type: 'choice',
      topic: 'length',
      prompt: 'Uzun bir nota ne demek?',
      options: ['Daha yüksek çal', 'Tuşu daha uzun basılı tut', 'İki kez çal'],
      answer: 1,
      explain: 'Notanın boyu süresidir: uzun nota, tuşun daha uzun basılı kalması demek.',
    },
    {
      type: 'choice',
      topic: 'hands',
      prompt: 'Pembe notaları hangi elle çalarsın?',
      options: ['Sağ el', 'Sol el'],
      answer: 1,
      explain: 'Mavi sağ el, pembe sol el.',
    },
  ],
  topics: { when: 'Ne zaman çalınır', length: 'Notanın uzunluğu', hands: 'Eller ve renkler' },
}

export const SONG_LESSONS: NoteLesson[] = [
  {
    id: 'song-intro',
    kind: 'theory',
    title: 'Nota Şelalesi',
    description: 'Notalar yukarıdan klavyeye akar',
    clef: 'treble',
    notes: [n('C4'), n('D4'), n('E4'), n('F4'), n('G4')],
    length: INTRO.questions.length,
    keyboard: { low: n('C4'), high: n('C5') },
    theory: INTRO,
  },
  waterfall('song-mary-wait', 'Ufak Kuzu: Öğren', 'Bekleyen mod: notalar seni bekler', wait(MARY, 'right')),
  waterfall('song-mary', 'Ufak Kuzu: Ritimli', 'Şelale metronomla akar', tempo(MARY, 'right'), { guide: true }),
  waterfall('song-twinkle-wait', 'Küçük Yıldız: Öğren', 'Üç bölüm, bekleyen mod', wait(TWINKLE_SONG, 'right')),
  waterfall('song-twinkle', 'Küçük Yıldız: Ritimli', 'Bütün şarkı, metronomla', tempo(TWINKLE_SONG, 'right')),
  waterfall('song-hans-wait', 'Küçük Hans: Öğren', 'Dört bölüm, bekleyen mod', wait(HANSCHEN, 'right')),
  waterfall('song-hans', 'Küçük Hans: Ritimli', 'Bütün şarkı, metronomla', tempo(HANSCHEN, 'right')),
  waterfall('song-ode', 'Neşeye Övgü: Sağ El', 'Sağ el, ritimli', tempo(ODE_SONG, 'right')),
  waterfall('song-ode-left', 'Neşeye Övgü: Sol El', 'Sol elde bas notaları, bekleyen mod', wait(ODE_SONG, 'left')),
  waterfall('song-ode-both-wait', 'Neşeye Övgü: İki El', 'İki el birlikte, bekleyen mod', wait(ODE_SONG, 'both')),
  waterfall('song-ode-both', 'Neşeye Övgü: İki El Ritimli', 'İki el, metronomla', tempo(ODE_SONG, 'both'), {
    bpm: 72,
  }),
  waterfall('song-yankee', 'Yankee Doodle: Sağ El', 'Sağ el, ritimli', tempo(YANKEE, 'right')),
  waterfall('song-yankee-both', 'Yankee Doodle: İki El', 'İki el, bekleyen mod', wait(YANKEE, 'both')),
  waterfall(
    'song-saints-a',
    'Azizler Yürürken: 1. Yarı',
    'Ölçü 1–8, iki el, bekleyen mod',
    wait(SAINTS, 'both', [0, 7]),
  ),
  waterfall(
    'song-saints-b',
    'Azizler Yürürken: 2. Yarı',
    'Ölçü 9–16, iki el, bekleyen mod',
    wait(SAINTS, 'both', [8, 15]),
  ),
  waterfall('song-saints', 'Azizler Yürürken', 'Bütün şarkı, iki el, ritimli', tempo(SAINTS, 'both'), { bpm: 80 }),
  waterfall('song-canon-left', 'Kanon: Bas', 'Sekiz bas notası, sol el, ritimli', tempo(CANON, 'left')),
  waterfall('song-canon', 'Kanon', 'İki el, tempo merdiveni', tempo(CANON, 'both'), {
    bpm: 56,
    tempoLadder: { rounds: 3, stepBpm: 8 },
  }),
  waterfall(
    'song-jingle-wait',
    'Çanlar Çalıyor: Öğren',
    'Nakaratın tamamı, iki el, bekleyen mod',
    wait(JINGLE_SONG, 'both'),
  ),
  waterfall('song-jingle', 'Çanlar Çalıyor: Ritimli', 'İki el, metronomla', tempo(JINGLE_SONG, 'both'), { bpm: 84 }),
  waterfall('song-minuet-wait', 'Menüet: Öğren', '3/4, iki el, bekleyen mod', wait(MINUET_SONG, 'both')),
  waterfall('song-minuet', 'Menüet: Ritimli', '3/4, iki el, metronomla', tempo(MINUET_SONG, 'both'), { bpm: 72 }),
  waterfall(
    'song-concert',
    'Konser',
    'Neşeye Övgü, Küçük Hans ve Azizler Yürürken art arda, iki el',
    tempo([ODE_SONG, HANSCHEN, SAINTS], 'both'),
    { bpm: 80 },
  ),
]
