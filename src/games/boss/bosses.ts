// Unit bosses: the last lesson of every unit, three short phases made of the
// unit's own lessons (a drill, a game, a song...). Each phase hits the boss
// as hard as it was played; the boss falls when the phases average
// BOSS_WIN or better.

import { CHORD_LESSONS } from '../chords/lessons'
import { EAR_LESSONS } from '../ear/lessons'
import { BASS_LESSONS } from '../noteHunter/bassLessons'
import { HANDS_LESSONS } from '../noteHunter/handsLessons'
import { type NoteLesson, TREBLE_LESSONS } from '../noteHunter/lessons'
import { SCALE_LESSONS } from '../scales/lessons'
import { SONG_LESSONS } from '../songs/lessons'
import { BASICS_LESSONS } from '../theory/lessons'
import { RHYTHM2_LESSONS, RHYTHM_LESSONS } from '../../rhythm/lessons'

/** Mean phase accuracy that beats the boss. */
export const BOSS_WIN = 0.75

export type BossFeature =
  'catEars' | 'roundEars' | 'horns' | 'wings' | 'spikes' | 'mask' | 'tail' | 'tentacles' | 'crown' | 'turban' | 'teeth'

export interface BossLook {
  body: string
  /** Darker shade for arms, ears, horns. */
  dark: string
  belly: string
  /** 'ghost' has a wavy hem instead of feet. */
  shape: 'blob' | 'ghost'
  eyes: 1 | 2 | 4
  features: BossFeature[]
}

export interface BossPhase {
  /** Topic of the phase in the report ("Nota okuma"). */
  label: string
  lesson: NoteLesson
}

export interface BossSpec {
  name: string
  /** What the boss says before the fight. */
  taunt: string
  look: BossLook
  phases: BossPhase[]
}

export interface PhaseDef {
  from: string
  label: string
  patch?: (l: NoteLesson) => Partial<NoteLesson>
}

export interface BossDef {
  unit: string
  name: string
  taunt: string
  look: BossLook
  phases: PhaseDef[]
}

const length = (n: number) => () => ({ length: n })
const bars = (n: number) => (l: NoteLesson) => ({ rhythm: { ...l.rhythm!, bars: n } })
const memory = (maxLength: number) => (l: NoteLesson) => ({ memory: { ...l.memory!, maxLength } })
const cases = (count: number) => (l: NoteLesson) => ({
  length: count,
  ear: { ...l.ear!, cases: l.ear!.cases.map((c) => ({ ...c, count })) },
})

const BOSSES: BossDef[] = [
  {
    unit: 'basics',
    name: 'Karışık Kedi',
    taunt: 'Miyav! Notaları birbirine karıştırdım, bul bakalım!',
    look: { body: '#ffb648', dark: '#e08a1e', belly: '#ffe0a8', shape: 'blob', eyes: 2, features: ['catEars', 'tail'] },
    phases: [
      {
        from: 'basics-notes-4',
        label: 'Nota okuma',
        patch: () => ({ length: 12, introduce: undefined, focus: undefined }),
      },
      { from: 'basics-balloon', label: 'Balonlar', patch: length(10) },
      { from: 'basics-bird', label: 'Nota Kuşu', patch: length(10) },
    ],
  },
  {
    unit: 'treble',
    name: 'Sol Ejderhası',
    taunt: 'Sol anahtarının bütün çizgileri benim! Geri almaya cesaretin var mı?',
    look: {
      body: '#58cc02',
      dark: '#3e9a00',
      belly: '#c8f59a',
      shape: 'blob',
      eyes: 2,
      features: ['horns', 'wings', 'spikes', 'teeth'],
    },
    phases: [
      { from: 'treble-5', label: 'Porte okuma', patch: length(12) },
      { from: 'treble-balloon-1', label: 'Balon Patlatma', patch: length(12) },
      { from: 'treble-bird-2', label: 'Nota Kuşu', patch: length(15) },
    ],
  },
  {
    unit: 'rhythm',
    name: 'Ritim Hırsızı',
    taunt: 'Hı hı! Vuruşları çaldım. Yakalayabilirsen al!',
    look: {
      body: '#9aa3b5',
      dark: '#6b7489',
      belly: '#dfe3ec',
      shape: 'blob',
      eyes: 2,
      features: ['roundEars', 'mask', 'tail'],
    },
    phases: [
      { from: 'rhythm-4', label: 'Esler', patch: bars(4) },
      { from: 'rhythm-dino-2', label: 'Dino Koşusu', patch: bars(4) },
      { from: 'rhythm-drum-whole', label: 'Uzun notalar', patch: bars(4) },
    ],
  },
  {
    unit: 'bass',
    name: 'Kalın Ses Devi',
    taunt: 'BUUM! Benim sesim en kalın. Sol elin bana yetişemez!',
    look: { body: '#1cb0f6', dark: '#0b84bd', belly: '#a6e2ff', shape: 'blob', eyes: 1, features: ['horns', 'teeth'] },
    phases: [
      { from: 'bass-5', label: 'Fa anahtarı okuma', patch: length(12) },
      { from: 'bass-balloon-1', label: 'Balon', patch: length(12) },
      { from: 'bass-bird-2', label: 'Nota Kuşu', patch: length(15) },
    ],
  },
  {
    unit: 'rhythm2',
    name: 'Hızlı Sincap',
    taunt: 'Tık tık tık! Sekizlikler kadar hızlıyım, noktalılar kadar sinsi!',
    look: {
      body: '#c27c4a',
      dark: '#93552b',
      belly: '#f2d2b5',
      shape: 'blob',
      eyes: 2,
      features: ['roundEars', 'tail', 'teeth'],
    },
    phases: [
      { from: 'rhythm-3', label: 'Sekizlikler', patch: bars(4) },
      { from: 'rhythm-dino-waltz', label: 'Üç dörtlük', patch: bars(4) },
      { from: 'rhythm-drum-dotted', label: 'Noktalılar', patch: bars(4) },
    ],
  },
  {
    unit: 'hands',
    name: 'Dört Gözlü Ejder',
    taunt: 'İki gözüm sağ elinde, iki gözüm sol elinde. Kaçış yok!',
    look: { body: '#ff4b8b', dark: '#d42a68', belly: '#ffc2d8', shape: 'blob', eyes: 4, features: ['horns', 'wings'] },
    phases: [
      { from: 'grand-2', label: 'Büyük porte', patch: length(12) },
      { from: 'grand-bar-2', label: 'Nota Barmeni', patch: length(15) },
      { from: 'grand-hands-2', label: 'İki el birlikte', patch: (l) => ({ melodies: l.melodies!.slice(0, 1) }) },
    ],
  },
  {
    unit: 'scales',
    name: 'Merdiven Cini',
    taunt: 'Lambamdan çıktım ve gamların basamaklarını karıştırdım!',
    look: { body: '#2bc4a8', dark: '#16927b', belly: '#b5f0e4', shape: 'ghost', eyes: 2, features: ['turban'] },
    phases: [
      { from: 'scale-parallel', label: 'İki elle gam' },
      { from: 'scale-ladder-minor', label: 'Gam Merdiveni', patch: (l) => ({ scales: l.scales!.slice(0, 1) }) },
      { from: 'scale-memory-2', label: 'Melodi Hafızası', patch: memory(6) },
    ],
  },
  {
    unit: 'chords',
    name: 'Akor Ahtapotu',
    taunt: 'Sekiz kolum var, sekiz tuşa birden basarım! Ya sen?',
    look: { body: '#ff9600', dark: '#d46f00', belly: '#ffd59a', shape: 'blob', eyes: 2, features: ['tentacles'] },
    phases: [
      { from: 'progression-hands', label: 'Akor yürüyüşü' },
      {
        from: 'chord-space-2',
        label: 'Uzay Savunması',
        patch: (l) => ({ length: 10, chords: { ...l.chords!, draw: 10 } }),
      },
      { from: 'surf-1', label: 'Arpej Sörfü', patch: (l) => ({ arpeggios: l.arpeggios!.slice(0, 1) }) },
    ],
  },
  {
    unit: 'ear',
    name: 'Fısıltı Hayaleti',
    taunt: 'Şşşt... Seslerimi duyabiliyor musun? Göremezsin, ancak duyarsın!',
    look: { body: '#b9a6ff', dark: '#8a72e8', belly: '#e7defd', shape: 'ghost', eyes: 2, features: [] },
    phases: [
      { from: 'ear-int-all', label: 'Aralıklar', patch: cases(8) },
      { from: 'ear-chord-2', label: 'Akor renkleri', patch: cases(6) },
      { from: 'ear-memory-reverse', label: 'Ters hafıza', patch: memory(5) },
    ],
  },
  {
    unit: 'songs',
    name: 'Sessizlik Kralı',
    taunt: 'Benim krallığımda hiç şarkı çalınmaz! Sen beni susturamazsın... değil mi?',
    look: { body: '#4b5d8a', dark: '#33426a', belly: '#b8c4e6', shape: 'blob', eyes: 2, features: ['crown'] },
    phases: [
      { from: 'song-ode-left', label: 'Sol el' },
      { from: 'song-mary', label: 'Ritimli şarkı' },
      { from: 'song-saints-a', label: 'İki el birlikte' },
    ],
  },
]

const UNIT_LESSONS: Record<string, NoteLesson[]> = {
  basics: BASICS_LESSONS,
  treble: TREBLE_LESSONS,
  rhythm: RHYTHM_LESSONS,
  bass: BASS_LESSONS,
  rhythm2: RHYTHM2_LESSONS,
  hands: HANDS_LESSONS,
  scales: SCALE_LESSONS,
  chords: CHORD_LESSONS,
  ear: EAR_LESSONS,
  songs: SONG_LESSONS,
}

export const bossId = (unit: string) => `boss-${unit}`

/** A unit's boss from its definition; `lessons` are the unit's own (the built-in units' by default). */
export function buildBoss(def: BossDef, lessons: NoteLesson[] = UNIT_LESSONS[def.unit]): NoteLesson {
  const id = bossId(def.unit)
  const phases = def.phases.map((p, i): BossPhase => {
    const base = lessons.find((l) => l.id === p.from)
    if (!base) throw new Error(`Boss ${id}: no lesson ${p.from}`)
    const lesson: NoteLesson = { ...base, ...p.patch?.(base), id: `${id}-${i + 1}` }
    // A boss phase is one go: no tempo ladder.
    if (lesson.rhythm?.tempoLadder) lesson.rhythm = { ...lesson.rhythm, tempoLadder: undefined }
    lesson.title = `Aşama ${i + 1}/${def.phases.length}: ${base.title}`
    return { label: p.label, lesson }
  })
  const first = phases[0].lesson
  return {
    id,
    kind: 'boss',
    title: `Boss: ${def.name}`,
    description: phases.map((p) => p.label).join(', '),
    clef: first.clef,
    notes: first.notes,
    length: phases.length,
    keyboard: first.keyboard,
    boss: { name: def.name, taunt: def.taunt, look: def.look, phases },
  }
}

/** The boss lesson of each unit, by unit id. */
export const BOSS_LESSONS: Record<string, NoteLesson> = Object.fromEntries(BOSSES.map((b) => [b.unit, buildBoss(b)]))
