// Görsel dünya: every unit of the map has its own scenery, a soft sky behind the path and things standing by
// it. The twelve key units are one journey in Notiş's hot-air balloon: the land changes every three keys, as
// the difficulty does (`levelOf` in games/keys/units.ts). Pure data.

import type { PropName } from '../components/scenery/props'
import { keyAccidentals, parseTonic } from '../music/scales'

export type SceneId =
  | 'room'
  | 'meadow'
  | 'desert'
  | 'sea'
  | 'oasis'
  | 'hills'
  | 'mountain'
  | 'space'
  | 'city'
  | 'stage'
  | 'village'
  | 'forest'
  | 'peak'
  | 'snow'

export interface Scene {
  id: SceneId
  /** Turkish name, shown to screen readers on the unit. */
  name: string
  /** The sky's colour at the top and the ground's at the bottom (light theme; the dark one darkens them). */
  sky: string
  ground: string
  /** Things by the path, in turn. */
  props: PropName[]
}

export const SCENES: Record<SceneId, Scene> = {
  room: {
    id: 'room',
    name: 'Notiş’in müzik odası',
    sky: '#fff3d6',
    ground: '#f3dcc0',
    props: ['plant', 'stand', 'lamp'],
  },
  meadow: { id: 'meadow', name: 'Çayır', sky: '#dff4ff', ground: '#d9f5c2', props: ['flower', 'tree', 'cloud'] },
  desert: {
    id: 'desert',
    name: 'Dino’nun çölü',
    sky: '#ffeccc',
    ground: '#f7dca6',
    props: ['cactus', 'rock', 'volcano'],
  },
  sea: { id: 'sea', name: 'Deniz kıyısı', sky: '#dcf1ff', ground: '#c7e8f7', props: ['wave', 'lighthouse', 'gull'] },
  oasis: {
    id: 'oasis',
    name: 'Gün batımında vaha',
    sky: '#ffe0d1',
    ground: '#f6d9a8',
    props: ['palm', 'sun', 'campfire'],
  },
  hills: {
    id: 'hills',
    name: 'İki tepe arasında köprü',
    sky: '#e3f5ff',
    ground: '#dcf3c8',
    props: ['hill', 'bridge', 'cloud'],
  },
  mountain: {
    id: 'mountain',
    name: 'Merdivenli dağ yolu',
    sky: '#e6efff',
    ground: '#e1e7ee',
    props: ['mountain', 'pine', 'flag'],
  },
  space: { id: 'space', name: 'Gece göğü', sky: '#e5defc', ground: '#d8d1f5', props: ['planet', 'star', 'comet'] },
  city: {
    id: 'city',
    name: 'Dedektifin gece şehri',
    sky: '#dfe2f6',
    ground: '#d5d9ea',
    props: ['lamppost', 'building', 'moon'],
  },
  stage: {
    id: 'stage',
    name: 'Konser salonu',
    sky: '#fde3e6',
    ground: '#f4d4d9',
    props: ['curtain', 'spotlight', 'stand'],
  },
  village: { id: 'village', name: 'Köy', sky: '#e2f4ff', ground: '#dcf2c6', props: ['house', 'tree', 'fence'] },
  forest: { id: 'forest', name: 'Orman', sky: '#e0f5ea', ground: '#cdebcf', props: ['pine', 'mushroom', 'tree'] },
  peak: { id: 'peak', name: 'Dağlar', sky: '#e6edff', ground: '#dfe5ec', props: ['mountain', 'pine', 'cloud'] },
  snow: { id: 'snow', name: 'Karlı zirve', sky: '#e4ecfb', ground: '#eef3fb', props: ['snowpine', 'snowman', 'star'] },
}

const BY_UNIT: Record<string, SceneId> = {
  basics: 'room',
  treble: 'meadow',
  rhythm: 'desert',
  bass: 'sea',
  rhythm2: 'oasis',
  hands: 'hills',
  scales: 'mountain',
  chords: 'space',
  ear: 'city',
  songs: 'stage',
}

/** The balloon journey's lands, one per level of three keys. */
const JOURNEY: SceneId[] = ['village', 'forest', 'peak', 'snow']

/** The scenery of a unit; key units go by their place in the circle (`keyIndex`). */
export function sceneOf(unitId: string, keyIndex?: number): Scene {
  if (keyIndex !== undefined) return SCENES[JOURNEY[Math.min(JOURNEY.length - 1, Math.floor(keyIndex / 3))]]
  return SCENES[BY_UNIT[unitId] ?? 'meadow']
}

/**
 * Which side of the path a lesson's prop stands on: away from the node, which zigzags by `offset` px.
 * A node in the middle alternates sides.
 */
export function propSide(offset: number, index: number): 'left' | 'right' {
  if (offset > 0) return 'left'
  if (offset < 0) return 'right'
  return index % 2 ? 'left' : 'right'
}

/** The sign on a key unit's balloon: how many sharps or flats the key has ("2♯", "3♭"), "♮" for none. */
export function keySign(major: string): string {
  const accs = Object.values(keyAccidentals(parseTonic(major), 'major')).filter((a) => a !== 0)
  if (!accs.length) return '♮'
  return `${accs.length}${accs[0] > 0 ? '♯' : '♭'}`
}

/**
 * Bir ünite bitince: back on the map from a lesson of a unit that is now finished, and not celebrated before,
 * the map celebrates it once. `seen` is the list kept so far (`null` the first time: every unit already finished
 * counts as seen, so old progress is not celebrated).
 */
export function unitToCelebrate(
  focusUnit: string | undefined,
  finished: string[],
  seen: string[] | null,
): { celebrate?: string; seen: string[] } {
  if (seen === null) return { seen: finished }
  if (focusUnit && finished.includes(focusUnit) && !seen.includes(focusUnit))
    return { celebrate: focusUnit, seen: [...seen, focusUnit] }
  return { seen }
}
