// The boss fight's report: how hard each phase hit the boss, whether it fell,
// and the topics of every phase played. Pure.

import { avg, type CategoryStat, type SessionSummary, starsFor } from '../noteHunter/summary'
import { BOSS_WIN, type BossSpec } from './bosses'

export interface BossPhaseResult {
  label: string
  /** The lesson the phase came from. */
  title: string
  accuracy: number
  /** Hit points taken off the boss (0..100 in all). */
  damage: number
  /** The hearts ran out in this phase. */
  failed: boolean
}

export interface BossSummary {
  name: string
  defeated: boolean
  /** Hit points left, 0..100. */
  hp: number
  phases: BossPhaseResult[]
  /** Phases not reached (the fight ended before them). */
  skipped: string[]
  tip: string
}

export const BOSS_HP = 100

/** Damage of one phase: the full share of the boss's hit points at BOSS_WIN accuracy, more above it. */
export function phaseDamage(accuracy: number, phases: number): number {
  return ((accuracy / BOSS_WIN) * BOSS_HP) / phases
}

/** Hit points left after the phases played so far. */
export function hpAfter(accuracies: number[], phases: number): number {
  return Math.max(0, BOSS_HP - accuracies.reduce((n, a) => n + phaseDamage(a, phases), 0))
}

function phaseTitle(title: string): string {
  return title.replace(/^Aşama \d+\/\d+: /, '')
}

/** Topics of every phase together; the same topic in two phases is merged. */
function mergedTopics(summaries: SessionSummary[]): CategoryStat[] {
  const out = new Map<string, CategoryStat>()
  for (const s of summaries)
    for (const c of s.perCategory) {
      const had = out.get(c.label)
      if (!had) out.set(c.label, { ...c })
      else {
        const shown = had.shown + c.shown
        out.set(c.label, {
          ...had,
          shown,
          firstTry: had.firstTry + c.firstTry,
          accuracy: shown ? (had.accuracy * had.shown + c.accuracy * c.shown) / shown : 0,
        })
      }
    }
  return [...out.values()]
}

/**
 * `summaries` are the phases played, in order. A phase whose hearts ran out
 * ends the fight: the boss wins. Fewer summaries than phases (a test finish)
 * report only what was played.
 */
export function bossReport(spec: BossSpec, summaries: SessionSummary[]): SessionSummary {
  const n = spec.phases.length
  const phases: BossPhaseResult[] = summaries.map((s, i) => ({
    label: spec.phases[i].label,
    title: phaseTitle(spec.phases[i].lesson.title),
    accuracy: s.accuracy,
    damage: phaseDamage(s.accuracy, n),
    failed: s.failed,
  }))
  const failedPhase = phases.find((p) => p.failed)
  const accuracy = summaries.length ? summaries.reduce((a, s) => a + s.accuracy, 0) / n : 0
  const hp = hpAfter(
    phases.map((p) => p.accuracy),
    n,
  )
  const defeated = !failedPhase && summaries.length === n && accuracy >= BOSS_WIN
  const weakest = [...phases].sort((a, b) => a.accuracy - b.accuracy)[0]

  const tip = failedPhase
    ? `${failedPhase.label} aşamasında canların bitti. "${failedPhase.title}" dersine dönüp bir tur çalış, sonra boss'a geri gel.`
    : defeated
      ? weakest && weakest.accuracy < 0.9
        ? `Kazandın! En zor aşama ${weakest.label} oldu (%${Math.round(weakest.accuracy * 100)}). Üç yıldız için onu cilala.`
        : 'Kusursuza yakın bir zafer!'
      : weakest
        ? `Boss'un ${Math.round(hp)} canı kaldı. En çok ${weakest.label} aşaması zorladı: "${weakest.title}" dersini bir daha çal.`
        : 'Boss seni bekliyor.'

  const phaseTopics: CategoryStat[] = summaries.map((s, i) => ({
    id: `phase-${i + 1}`,
    label: `${i + 1}. aşama: ${spec.phases[i].label}`,
    shown: s.total,
    firstTry: s.firstTry,
    accuracy: s.accuracy,
  }))

  return {
    failed: !defeated,
    total: summaries.reduce((a, s) => a + s.total, 0),
    firstTry: summaries.reduce((a, s) => a + s.firstTry, 0),
    accuracy,
    avgReactionMs: avg(summaries.flatMap((s) => (s.avgReactionMs === null ? [] : [s.avgReactionMs]))),
    totalMistakes: summaries.reduce((a, s) => a + s.totalMistakes, 0),
    stars: defeated ? starsFor(accuracy) : 0,
    perNote: [],
    perCategory: [...phaseTopics, ...mergedTopics(summaries)],
    weakest: [],
    message: defeated
      ? `${spec.name} yenildi! Ünitenin bütün becerileri parmaklarında.`
      : failedPhase
        ? `${spec.name} bu sefer kazandı. Biraz çalış, rövanş seni bekliyor!`
        : `${spec.name} sendeledi ama düşmedi. Bir daha dene!`,
    boss: {
      name: spec.name,
      defeated,
      hp,
      phases,
      skipped: spec.phases.slice(summaries.length).map((p) => p.label),
      tip,
    },
  }
}
