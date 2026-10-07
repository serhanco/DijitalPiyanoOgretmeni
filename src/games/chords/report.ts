// The report of a chord activity: success per chord family, inversion,
// hand and degree; how close together the notes came down, which note tends
// to come last, and the chords worth practising.

import { chordTitle, GROUP_LABELS, INVERSION_LABELS, QUALITY_GROUP, type QualityGroup } from '../../music/chords'
import { avg, type CategoryStat, type SessionSummary, starsFor } from '../noteHunter/summary'
import { chordFirstTry, type ChordRecord, together } from './session'

/** Which note of a chord tends to come down last. */
export type LateVoice = 'bass' | 'bottom' | 'middle' | 'top'

export const LATE_VOICE_TEXT: Record<LateVoice, string> = {
  bass: 'sol elin bas notası',
  bottom: 'en alttaki nota',
  middle: 'ortadaki nota',
  top: 'en üstteki nota',
}

export interface ChordSummary {
  /** Chords played to the end. */
  played: number
  /** Of those, with every note within TOGETHER_MS. */
  together: number
  meanSpreadMs: number | null
  /** The note that most often came last when a chord was spread out. */
  lateVoice: LateVoice | null
  inversionMistakes: number
  incomplete: number
  /** Chords played wrong at least once, weakest first. */
  weakest: { name: string; shown: number; firstTry: number }[]
}

const HANDS_LABELS = { right: 'Sağ el akorları', left: 'Sol el akorları', both: 'İki elle akorlar' }

function voiceOf(r: ChordRecord): LateVoice | null {
  if (r.lastVoice === null) return null
  const both = r.chord.hands === 'both'
  if (both && r.lastVoice === 0) return 'bass'
  const first = both ? 1 : 0
  const last = r.chord.notes.length - 1
  return r.lastVoice === first ? 'bottom' : r.lastVoice === last ? 'top' : 'middle'
}

function topics<K extends string>(
  records: ChordRecord[],
  keyOf: (r: ChordRecord) => K,
  labelOf: (k: K) => string,
  prefix: string,
): CategoryStat[] {
  const groups = new Map<K, ChordRecord[]>()
  for (const r of records) groups.set(keyOf(r), [...(groups.get(keyOf(r)) ?? []), r])
  return [...groups.entries()].map(([k, rs]) => {
    const ok = rs.filter(chordFirstTry).length
    return { id: `${prefix}-${k}`, label: labelOf(k), shown: rs.length, firstTry: ok, accuracy: ok / rs.length }
  })
}

function messageFor(accuracy: number, togetherShare: number | null, failed: boolean): string {
  if (failed) return 'Akorlar zamanla oturur. Önce parmakları tuşların üstüne yerleştir, sonra hepsini birlikte indir.'
  if (togetherShare !== null && togetherShare < 0.6)
    return 'Notaları doğru buluyorsun, ama hepsi aynı anda inmiyor. Parmakları hazırlayıp tek hareketle bas.'
  if (accuracy >= 0.95) return 'Akorların tertemiz! Bir sonraki adım: çevrimlerle daha hızlı geçişler.'
  if (accuracy >= 0.8) return 'Çok iyi gidiyorsun. Zorlandığın akorlara bir tur daha bak.'
  return 'Akorun notalarını önce tek tek bul, sonra hepsini birlikte bas. Her tekrar biraz daha kolaylaşacak.'
}

export function summarizeChords(records: ChordRecord[], failed = false): SessionSummary {
  const total = records.length
  const firstTry = records.filter(chordFirstTry).length
  const accuracy = total ? firstTry / total : 0
  const played = records.filter((r) => r.answeredAt !== null)
  const spreads = played.map((r) => r.spreadMs!).filter((x) => x !== null)
  const togetherCount = played.filter(together).length
  const togetherShare = played.length ? togetherCount / played.length : null

  const perCategory: CategoryStat[] = [
    ...topics(
      records,
      (r) => QUALITY_GROUP[r.chord.quality],
      (g: QualityGroup) => GROUP_LABELS[g],
      'group',
    ),
  ]
  const inversions = new Set(records.map((r) => r.chord.inversion))
  if (inversions.size > 1 || !inversions.has(0))
    perCategory.push(
      ...topics(
        records,
        (r) => String(r.chord.inversion),
        (k) => INVERSION_LABELS[Number(k)],
        'inversion',
      ).sort((a, b) => a.id.localeCompare(b.id)),
    )
  if (new Set(records.map((r) => r.chord.hands)).size > 1)
    perCategory.push(
      ...topics(
        records,
        (r) => r.chord.hands,
        (h) => HANDS_LABELS[h],
        'hands',
      ),
    )
  if (records.some((r) => r.chord.numeral))
    perCategory.push(
      ...topics(
        records,
        (r) => r.chord.numeral ?? '',
        (n) => {
          const r = records.find((x) => x.chord.numeral === n)!
          return `${n} (${chordTitle(r.chord, false)})`
        },
        'degree',
      ),
    )
  if (played.length)
    perCategory.push({
      id: 'together',
      label: 'Notalara aynı anda basma',
      shown: played.length,
      firstTry: togetherCount,
      accuracy: togetherCount / played.length,
    })

  // The note that comes last when a chord is spread out.
  const late = new Map<LateVoice, number>()
  let spread = 0
  for (const r of played) {
    if (together(r)) continue
    spread++
    const v = voiceOf(r)
    if (v) late.set(v, (late.get(v) ?? 0) + 1)
  }
  const [lateVoice, lateCount] = [...late.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]

  const byChord = new Map<string, ChordRecord[]>()
  for (const r of records) {
    const name = chordTitle(r.chord, r.chord.inversion > 0 || inversions.size > 1)
    byChord.set(name, [...(byChord.get(name) ?? []), r])
  }
  const weakest = [...byChord.entries()]
    .map(([name, rs]) => ({ name, shown: rs.length, firstTry: rs.filter(chordFirstTry).length }))
    .filter((c) => c.firstTry < c.shown)
    .sort((a, b) => a.firstTry / a.shown - b.firstTry / b.shown)
    .slice(0, 3)

  const reactions = records
    .filter(chordFirstTry)
    .filter((r) => r.shownAt !== null)
    .map((r) => r.answeredAt! - r.shownAt!)

  return {
    failed,
    total,
    firstTry,
    accuracy,
    avgReactionMs: avg(reactions),
    totalMistakes: records.reduce((n, r) => n + r.wrongPresses.length + r.inversionMistakes, 0),
    stars: failed ? 0 : starsFor(accuracy),
    perNote: [],
    perCategory,
    weakest: [],
    message: messageFor(accuracy, togetherShare, failed),
    chords: {
      played: played.length,
      together: togetherCount,
      meanSpreadMs: avg(spreads),
      lateVoice: lateCount >= 3 && lateCount >= spread / 2 ? lateVoice : null,
      inversionMistakes: records.reduce((n, r) => n + r.inversionMistakes, 0),
      incomplete: records.reduce((n, r) => n + r.incomplete, 0),
      weakest,
    },
  }
}
