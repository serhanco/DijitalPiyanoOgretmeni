// Report of a rhythm activity: timing distribution, mean early/late offset
// and success per rhythm value (quarters, halves, eighths, rests).

import { avg, type CategoryStat, type NoteStat, type SessionSummary, starsFor } from '../games/noteHunter/summary'
import { type RhythmTopic, TOPIC_LABELS, TOPIC_ORDER, VALUE_TOPIC } from './rhythm'
import { describeOffset, JUDGEMENT_SCORE, JUDGEMENTS, type Judgement, onTime } from './timing'
import type { TimingRecord } from './track'

export interface RhythmSummaryOptions {
  failed?: boolean
  /** True when the pitch mattered: then the report also lists notes. */
  pitched?: boolean
  stray?: number
  bestCombo?: number
  bpm: number
}

/** Score of one settled target, 0..1. A wrong key first costs half. */
function scoreOf(r: TimingRecord): number {
  const s = r.judgement ? JUDGEMENT_SCORE[r.judgement] : 0
  return r.wrongPresses.length && !r.rest ? s / 2 : s
}

/** On the beat with the right key at once (or a rest kept). */
const clean = (r: TimingRecord) => onTime(r.judgement) && r.wrongPresses.length === 0

function messageFor(accuracy: number, meanOffset: number | null, counts: Record<Judgement, number>): string {
  const played = counts.perfect + counts.good + counts.early + counts.late
  if (counts.miss > played / 2) return 'Metronomu dinle ve her vuruşta bir kez bas. Önce tempoyu düşürmeyi dene.'
  if (meanOffset !== null && Math.abs(meanOffset) >= 35) {
    return meanOffset < 0
      ? `Genelde ${describeOffset(meanOffset)} basıyorsun. Vuruşu biraz bekle, acele etme.`
      : `Genelde ${describeOffset(meanOffset)} kalıyorsun. Vuruşu sayarak bir tık önce hazırlan.`
  }
  if (accuracy >= 0.95) return 'Metronom gibisin! Tempoyu biraz artırmayı deneyebilirsin.'
  if (accuracy >= 0.8) return 'Ritmin oturuyor. Kaçırdığın vuruşlara bir tur daha bak.'
  return 'Güzel başlangıç. İçinden "bir, iki, üç, dört" diye sayarak çal.'
}

export function summarizeRhythm(
  records: TimingRecord[],
  { failed = false, pitched = false, stray = 0, bestCombo = 0, bpm }: RhythmSummaryOptions,
): SessionSummary {
  const notes = records.filter((r) => !r.rest)
  const rests = records.filter((r) => r.rest)
  const counts = Object.fromEntries(JUDGEMENTS.map((j) => [j, 0])) as Record<Judgement, number>
  for (const r of notes) if (r.judgement) counts[r.judgement]++
  const offsets = notes.map((r) => r.offsetMs).filter((x): x is number => x !== null)

  const total = records.length
  const firstTry = records.filter(clean).length
  const accuracy = total ? records.reduce((n, r) => n + scoreOf(r), 0) / total : 0

  const byTopic = new Map<RhythmTopic, TimingRecord[]>()
  for (const r of records) {
    const t = VALUE_TOPIC[r.value]
    byTopic.set(t, [...(byTopic.get(t) ?? []), r])
  }
  const perCategory: CategoryStat[] = TOPIC_ORDER.filter((t) => byTopic.has(t)).map((t) => {
    const rs = byTopic.get(t)!
    return {
      id: t,
      label: TOPIC_LABELS[t],
      shown: rs.length,
      firstTry: rs.filter(clean).length,
      accuracy: rs.reduce((n, r) => n + scoreOf(r), 0) / rs.length,
    }
  })

  let perNote: NoteStat[] = []
  if (pitched) {
    const byNote = new Map<number, TimingRecord[]>()
    for (const r of notes) byNote.set(r.target, [...(byNote.get(r.target) ?? []), r])
    perNote = [...byNote.entries()]
      .map(([midi, rs]) => {
        const confusions = new Map<number, number>()
        for (const r of rs) for (const w of r.wrongPresses) confusions.set(w, (confusions.get(w) ?? 0) + 1)
        const ok = rs.filter(clean).length
        return {
          midi,
          shown: rs.length,
          firstTry: ok,
          accuracy: rs.reduce((n, r) => n + scoreOf(r), 0) / rs.length,
          avgReactionMs: null,
          confusedWith: [...confusions.entries()]
            .map(([m, count]) => ({ midi: m, count }))
            .sort((a, b) => b.count - a.count),
        }
      })
      .sort((a, b) => a.midi - b.midi)
  }

  const meanOffsetMs = avg(offsets)
  return {
    failed,
    total,
    firstTry,
    accuracy,
    avgReactionMs: null,
    totalMistakes: records.reduce((n, r) => n + r.wrongPresses.length, 0) + stray,
    stars: failed ? 0 : starsFor(accuracy),
    perNote,
    perCategory,
    weakest: perNote
      .filter((n) => n.accuracy < 1)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3),
    message: failed
      ? 'Kalpler bitti ama ritim pratikle oturur. Tempoyu düşürüp tekrar dene.'
      : messageFor(accuracy, meanOffsetMs, counts),
    timing: {
      counts,
      notes: notes.length,
      meanOffsetMs,
      meanAbsOffsetMs: avg(offsets.map(Math.abs)),
      offsets,
      restsKept: rests.filter((r) => r.judgement === 'perfect').length,
      rests: rests.length,
      stray,
      bestCombo,
      bpm,
    },
  }
}
