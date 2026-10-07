// Rhythm values and patterns. Beats are quarter notes; bars are 4/4 or 3/4.

/** h = half, q = quarter, e = eighth, qr = quarter rest, qd = dotted quarter, hd = dotted half. */
export type RhythmValue = 'h' | 'q' | 'e' | 'qr' | 'qd' | 'hd'

export const VALUE_BEATS: Record<RhythmValue, number> = { h: 2, q: 1, e: 0.5, qr: 1, qd: 1.5, hd: 3 }

export type RhythmTopic = 'quarter' | 'half' | 'eighth' | 'rest' | 'dotted'

export const VALUE_TOPIC: Record<RhythmValue, RhythmTopic> = {
  h: 'half',
  q: 'quarter',
  e: 'eighth',
  qr: 'rest',
  qd: 'dotted',
  hd: 'dotted',
}

export const TOPIC_LABELS: Record<RhythmTopic, string> = {
  quarter: 'Dörtlükler',
  half: 'İkilikler',
  eighth: 'Sekizlikler',
  rest: 'Esler',
  dotted: 'Noktalı notalar',
}

/** Order of topics in reports. */
export const TOPIC_ORDER: RhythmTopic[] = ['quarter', 'half', 'eighth', 'dotted', 'rest']

export const isRest = (v: RhythmValue) => v === 'qr'

export interface RhythmEvent {
  value: RhythmValue
  /** Start, in beats from the first beat of the first bar. */
  beat: number
  bar: number
}

/** "q q h | e e q qr q" → bars of values. */
export function parseRhythm(text: string): RhythmValue[][] {
  return text
    .split('|')
    .map((bar) => bar.trim().split(/\s+/).filter(Boolean) as RhythmValue[])
    .filter((bar) => bar.length > 0)
}

export function layoutRhythm(bars: RhythmValue[][], beatsPerBar = 4): RhythmEvent[] {
  const out: RhythmEvent[] = []
  bars.forEach((values, bar) => {
    let beat = bar * beatsPerBar
    for (const value of values) {
      out.push({ value, beat, bar })
      beat += VALUE_BEATS[value]
    }
  })
  return out
}

export interface GenerateOptions {
  values: RhythmValue[]
  bars: number
  beatsPerBar?: number
  random?: () => number
}

/** Whether `v` may start at beat `pos` of a bar, as in printed music. */
function fits(v: RhythmValue, pos: number, beatsPerBar: number): boolean {
  if (pos + VALUE_BEATS[v] > beatsPerBar) return false
  // Halves start on a strong beat: 1 or 3 in 4/4, 1 in 3/4.
  if (v === 'h') return pos % 2 === 0
  // A dotted half fills a 3/4 bar or the first three beats of a 4/4 one.
  if (v === 'hd') return pos === 0
  // A dotted quarter and its eighth take two beats; in 4/4 they start on beat 1 or 3.
  if (v === 'qd') return pos + 2 <= beatsPerBar && (beatsPerBar % 2 === 1 || pos % 2 === 0)
  return true
}

/**
 * Random bars using only `values`. Eighths always come in pairs on a beat, a
 * dotted quarter is followed by its eighth, and halves start on strong beats,
 * as in printed music. The piece never opens
 * with a rest, never has two rests in a row, and uses every value at least
 * once when it is long enough to.
 */
export function generateBars({
  values,
  bars,
  beatsPerBar = 4,
  random = Math.random,
}: GenerateOptions): RhythmValue[][] {
  if (values.length === 0) throw new Error('A rhythm needs at least one value')
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)]
  let best: RhythmValue[][] = []
  for (let attempt = 0; attempt < 40; attempt++) {
    const out: RhythmValue[][] = []
    let prev: RhythmValue | null = null
    for (let b = 0; b < bars; b++) {
      const bar: RhythmValue[] = []
      let pos = 0
      while (pos < beatsPerBar) {
        const options = values.filter((v) => {
          if (isRest(v)) return prev !== null && !isRest(prev)
          return fits(v, pos, beatsPerBar)
        })
        const v = pick(options.length ? options : ['q' as RhythmValue])
        if (v === 'e') {
          bar.push('e', 'e')
          pos += 1
        } else if (v === 'qd') {
          bar.push('qd', 'e')
          pos += 2
        } else {
          bar.push(v)
          pos += VALUE_BEATS[v]
        }
        prev = v
      }
      out.push(bar)
    }
    best = out
    const used = new Set(out.flat())
    if (values.every((v) => used.has(v))) break
  }
  return best
}

/** Total length in beats. */
export const rhythmBeats = (bars: RhythmValue[][]) =>
  bars.reduce((n, bar) => n + bar.reduce((m, v) => m + VALUE_BEATS[v], 0), 0)
