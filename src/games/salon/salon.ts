// Oyun Salonu: every arcade game the learner has met, played with any skill
// they have opened (Nota Kuşu with bass notes, Uzay Savunması with minor
// chords...). Note and chord games are endless: they speed up until the
// hearts run out, and the score is the record to beat. Beat games play a
// round of random bars and keep the best timing. Pure.

import {
  ALOUETTE,
  BRAHMS_LULLABY,
  GOING_HOME,
  MORNING_MOOD,
  OLD_MACDONALD,
  ROW_BOAT,
  SUSANNA,
  tunePitches,
} from '../arcade/train/tunes'
import { fitKeyboard } from '../../music/notes'
import { parseTonic, tonicName } from '../../music/scales'
import { KEYS } from '../keys/units'
import type { Tune } from '../../rhythm/plan'
import {
  AU_CLAIR,
  BLUE_DANUBE,
  FRERE_JACQUES,
  HOT_CROSS_BUNS,
  JINGLE_BELLS,
  LONDON_BRIDGE,
  MARY_LAMB,
  MINUET,
  ODE,
  TWINKLE,
} from '../../rhythm/tunes'
import type { LessonKind, NoteLesson } from '../noteHunter/lessons'

const keyName = (key: string) => tonicName(parseTonic(key))

export const SALON_PREFIX = 'salon-'
export const isSalonId = (id: string) => id.startsWith(SALON_PREFIX)

/** Targets planned for an endless game: more than anyone plays before the hearts run out. */
export const ENDLESS_LENGTH = 400

/** Which skills a game can be played with. */
export type SalonFamily = 'notes' | 'grand' | 'chords' | 'beat'

export interface SalonGame {
  kind: LessonKind
  name: string
  icon: string
  family: SalonFamily
  /** The curriculum lesson the game's own settings (mode, hints) come from. */
  template: string
}

export interface SalonSkill {
  id: string
  title: string
  family: SalonFamily
  /** The curriculum lesson whose notes, chords or rhythm the skill plays; it opens the skill. */
  source: string
  /** Bilinen şarkılar: the targets are well-known songs, note by note, instead of the source's notes. */
  songs?: boolean
  /** Only these games: chords with sharps and flats need a game that names them (Akor Aşçısı). */
  games?: LessonKind[]
}

/**
 * Bilinen şarkılar: every copyright-free song of the app (folk songs, composers
 * dead for more than seventy years), the rhythm units' and Nota Treni's.
 */
export const SALON_SONGS: Tune[] = [
  TWINKLE,
  ODE,
  MARY_LAMB,
  AU_CLAIR,
  HOT_CROSS_BUNS,
  FRERE_JACQUES,
  LONDON_BRIDGE,
  JINGLE_BELLS,
  MINUET,
  BLUE_DANUBE,
  GOING_HOME,
  ROW_BOAT,
  OLD_MACDONALD,
  MORNING_MOOD,
  SUSANNA,
  ALOUETTE,
  BRAHMS_LULLABY,
]

export const SALON_GAMES: SalonGame[] = [
  { kind: 'bird', name: 'Nota Kuşu', icon: '🐦', family: 'notes', template: 'treble-bird-1' },
  { kind: 'balloon', name: 'Balon Patlatma', icon: '🎈', family: 'notes', template: 'treble-balloon-1' },
  { kind: 'train', name: 'Nota Treni', icon: '🚂', family: 'notes', template: 'treble-train-1' },
  { kind: 'bar', name: 'Nota Barmeni', icon: '🍹', family: 'grand', template: 'grand-bar-1' },
  { kind: 'chef', name: 'Akor Aşçısı', icon: '🍳', family: 'chords', template: 'chord-chef-1' },
  { kind: 'space', name: 'Uzay Savunması', icon: '🚀', family: 'chords', template: 'chord-space-1' },
  { kind: 'chordbar', name: 'Akor Barmeni', icon: '🍸', family: 'chords', template: 'chord-bar-1' },
  { kind: 'dino', name: 'Dino Koşusu', icon: '🦖', family: 'beat', template: 'rhythm-dino-1' },
  { kind: 'drum', name: 'Ritim Davulcusu', icon: '🥁', family: 'beat', template: 'rhythm-drum-1' },
]

export const SALON_SKILLS: SalonSkill[] = [
  { id: 'oktav', title: 'Do’dan Do’ya', family: 'notes', source: 'basics-bird' },
  { id: 'sol', title: 'Sol anahtarı', family: 'notes', source: 'treble-bird-2' },
  { id: 'fa', title: 'Fa anahtarı', family: 'notes', source: 'bass-bird-2' },
  { id: 'sarki', title: 'Bilinen şarkılar', family: 'notes', source: 'treble-train-1', songs: true },
  { id: 'buyuk', title: 'Büyük porte', family: 'grand', source: 'grand-bar-1' },
  { id: 'buyuk-usta', title: 'Büyük porte, geniş', family: 'grand', source: 'grand-bar-2' },
  { id: 'majör', title: 'Majör üçlüler', family: 'chords', source: 'chord-major' },
  { id: 'minör', title: 'Minör üçlüler', family: 'chords', source: 'chord-minor' },
  { id: 'cevrim', title: 'Çevrimler', family: 'chords', source: 'chord-inversions-read' },
  { id: 'yedili', title: 'Yedili akorlar', family: 'chords', source: 'chord-sevenths' },
  { id: 'temel', title: 'Dörtlük, ikilik, es', family: 'beat', source: 'rhythm-drum-1' },
  { id: 'sekizlik', title: 'Sekizlikler', family: 'beat', source: 'rhythm-drum-2' },
  { id: 'vals', title: 'Üç dörtlük', family: 'beat', source: 'rhythm-dino-waltz' },
  { id: 'noktali', title: 'Noktalılar', family: 'beat', source: 'rhythm-drum-dotted' },
  // Tonlar yolculuğu: the triads of each key, opened by the unit's Akor Aşçısı.
  ...KEYS.map((k): SalonSkill => ({
    id: `ton-${k.id}`,
    title: `${keyName(k.major)} Majör akorları`,
    family: 'chords',
    source: `key-${k.id}-chef`,
    games: ['chef'],
  })),
]

export const salonId = (game: SalonGame, skill: SalonSkill) => `${SALON_PREFIX}${game.kind}-${skill.id}`

export const skillsOf = (game: SalonGame) =>
  SALON_SKILLS.filter((s) => s.family === game.family && (!s.games || s.games.includes(game.kind)))

/** Endless games end when the hearts run out; beat games play one round. */
export const isEndless = (game: SalonGame) => game.family !== 'beat'

type Stars = (lessonId: string) => number

/** A game opens once any lesson of its kind has a star. */
export function gameOpen(game: SalonGame, lessons: NoteLesson[], stars: Stars): boolean {
  return lessons.some((l) => l.kind === game.kind && stars(l.id) >= 1)
}

/**
 * A skill opens once its source lesson has a star. The family's first (easiest)
 * skill also opens with the game, so an open game always has something to play:
 * Dino Koşusu comes before Ritim Davulcusu, the source of the first beat skill.
 */
export const skillOpen = (skill: SalonSkill, stars: Stars, gameIsOpen = false) =>
  stars(skill.source) >= 1 || (gameIsOpen && SALON_SKILLS.find((s) => s.family === skill.family) === skill)

/**
 * The octave shift that puts every song inside the skill's notes (Nota Treni's
 * treble songs go an octave down for the bass staff), or null when none fits.
 */
export function tuneShiftFor(lesson: NoteLesson, notes: number[]): number | null {
  const pitches = (lesson.tunes ?? []).flatMap(tunePitches)
  if (!pitches.length || !notes.length) return null
  const low = Math.min(...notes)
  const high = Math.max(...notes)
  const fits = (k: number) => pitches.every((p) => p + k >= low && p + k <= high)
  return [0, -12, 12, -24, 24].find(fits) ?? null
}

/** The lesson that plays `game` with `skill`: the game's settings, the skill's content. */
export function salonLesson(
  game: SalonGame,
  skill: SalonSkill,
  find: (id: string) => NoteLesson | undefined,
): NoteLesson | null {
  const template = find(game.template)
  const source = find(skill.source)
  if (!template || !source || skill.family !== game.family) return null
  if (skill.games && !skill.games.includes(game.kind)) return null
  const endless = isEndless(game)
  const base: NoteLesson = {
    ...template,
    id: salonId(game, skill),
    kind: game.kind,
    title: `${game.name}: ${skill.title}`,
    description: endless
      ? 'Oyun Salonu: canların bitene kadar oyna, her doğru nota puan. Rekorunu geç!'
      : 'Oyun Salonu: vuruşunda çal, en iyi zamanlamanı geç!',
    clef: source.clef,
    notes: source.notes,
    keyboard: source.keyboard,
    grand: source.grand,
    bothStaves: source.bothStaves,
    length: endless ? ENDLESS_LENGTH : template.length,
    salon: { game: game.kind, skill: skill.id, endless },
  }
  if (skill.songs) {
    const notes = [...new Set(SALON_SONGS.flatMap(tunePitches))].sort((a, b) => a - b)
    return {
      ...base,
      description: 'Oyun Salonu: bildiğin şarkıların notaları sırayla gelir; çaldıkça şarkı çıkar. Rekorunu geç!',
      clef: 'treble',
      notes,
      keyboard: fitKeyboard(notes, { fromDo: true }),
      grand: undefined,
      bothStaves: undefined,
      tunes: SALON_SONGS,
      tuneShift: 0,
    }
  }
  if (template.tunes) {
    // Songs only where they fit the skill's staff; otherwise the skill's notes come at random.
    const shift = tuneShiftFor(template, source.notes)
    if (shift === null) delete base.tunes
    else base.tuneShift = shift
  }
  if (game.family === 'chords') {
    const spec = template.chords!
    return {
      ...base,
      chords: {
        ...spec,
        chords: source.chords!.chords,
        draw: ENDLESS_LENGTH,
        repeat: undefined,
        progression: undefined,
      },
    }
  }
  if (game.family === 'beat') {
    const rhythm = source.rhythm!
    return {
      ...base,
      rhythm: {
        bpm: rhythm.bpm,
        beatsPerBar: rhythm.beatsPerBar,
        bars: 8,
        values: rhythm.values,
        anyKey: template.rhythm?.anyKey ?? rhythm.anyKey,
      },
    }
  }
  return base
}

export interface SalonRecord {
  /** Endless games: the best score; beat games: the best timing in percent. */
  best: number
  /** Endless games: the longest run of first-try answers. */
  bestCombo: number
  plays: number
}

export interface SalonResult {
  score: number
  combo: number
}

/** What one game counts as its score. */
export function salonResult(
  endless: boolean,
  summary: { accuracy: number; arcade?: { score: number; bestCombo: number } },
): SalonResult {
  return endless
    ? { score: summary.arcade?.score ?? 0, combo: summary.arcade?.bestCombo ?? 0 }
    : { score: Math.round(summary.accuracy * 100), combo: 0 }
}

/** The record after a game, and whether the game set a new one. */
export function nextRecord(prev: SalonRecord | undefined, r: SalonResult): { record: SalonRecord; isNew: boolean } {
  const before = prev ?? { best: 0, bestCombo: 0, plays: 0 }
  return {
    record: {
      best: Math.max(before.best, r.score),
      bestCombo: Math.max(before.bestCombo, r.combo),
      plays: before.plays + 1,
    },
    isNew: r.score > before.best && r.score > 0,
  }
}

/** The best score of a game over its skills, for the game's card. */
export function bestOf(game: SalonGame, records: Record<string, SalonRecord>): number {
  return Math.max(0, ...skillsOf(game).map((s) => records[salonId(game, s)]?.best ?? 0))
}
