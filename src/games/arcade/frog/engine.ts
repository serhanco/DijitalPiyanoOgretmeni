// "Kurbağa Atlayışı": lily pads float on a staff. The frog sits on one note
// and the next pad shows only how far to jump ("↑ 3'lü"); the player counts
// the lines and spaces and plays the note the frog lands on. A pad that sinks
// before it is played costs a heart. Pure: time is passed in.

import { isBlackKey } from '../../../music/notes'
import type { CategoryStat } from '../../noteHunter/summary'
import { firstTryOk, type PromptRecord } from '../../noteHunter/session'
import { hintFor } from '../bonus'
import { rampAt, type Ramp, Surprise } from '../ramp'
import type { SkillProvider } from '../skill'

/** Seconds a pad floats before it sinks, at the start and at the end. */
const FLOAT_START_S = 8
const FLOAT_END_S = 5
/** Seconds of the jump (or the swim after a sunk pad) before the next pad comes up. */
export const JUMP_S = 0.55
/** İpucu parıltısı: once a pad has used this share of its time, its key glows. */
const HINT_AT = 0.65

/** "2'li", "3'lü"...: the Turkish suffix follows the number's last vowel. */
const SUFFIX: Record<number, string> = {
  1: "'li",
  2: "'li",
  3: "'lü",
  4: "'lü",
  5: "'li",
  6: "'lı",
  7: "'li",
  8: "'li",
}

/** Diatonic size between two white keys: 2 for neighbours, 3 for a line to the next line... */
export function stepSize(from: number, to: number): number {
  const whites = (m: number) => {
    let n = 0
    for (let k = 0; k < m; k++) if (!isBlackKey(k)) n++
    return n
  }
  return Math.abs(whites(to) - whites(from)) + 1
}

/** "↑ 3'lü", "↓ 5'li", "8'li (oktav)". */
export function jumpLabel(from: number, to: number): string {
  const size = stepSize(from, to)
  const arrow = to > from ? '↑' : to < from ? '↓' : '='
  return `${arrow} ${size}${SUFFIX[size] ?? "'lu"}${size === 8 ? ' (oktav)' : ''}`
}

/** Topic of a jump in the report: the size and the way ("3'lü yukarı"). */
export function jumpTopic(from: number, to: number): { id: string; label: string } {
  const size = stepSize(from, to)
  const up = to > from
  return { id: `${size}-${up ? 'up' : 'down'}`, label: `${size}${SUFFIX[size] ?? "'lu"} ${up ? 'yukarı' : 'aşağı'}` }
}

/**
 * A path of `count` white keys from `start`, each a jump of one of `sizes`
 * (2 = to the neighbour) up or down, never leaving [low, high] and never the
 * same jump three times in a row.
 */
export function frogPath(
  start: number,
  sizes: number[],
  low: number,
  high: number,
  count: number,
  random: () => number = Math.random,
): number[] {
  const whites: number[] = []
  for (let m = low; m <= high; m++) if (!isBlackKey(m)) whites.push(m)
  let at = whites.indexOf(start)
  if (at < 0) throw new Error('The frog starts on a white key inside the range')
  const path: number[] = []
  const recent: string[] = []
  while (path.length < count) {
    const options: { to: number; key: string }[] = []
    for (const size of sizes)
      for (const dir of [1, -1]) {
        const to = at + dir * (size - 1)
        const key = `${size}${dir}`
        if (to >= 0 && to < whites.length && !(recent.length >= 2 && recent.every((r) => r === key)))
          options.push({ to, key })
      }
    const pick = options[Math.floor(random() * options.length)]
    at = pick.to
    path.push(whites[at])
    recent.push(pick.key)
    if (recent.length > 2) recent.shift()
  }
  return path
}

export interface Pad {
  index: number
  /** The note the pad sits on, and the one the frog jumps from. */
  from: number
  record: PromptRecord
  state: 'floating' | 'landed' | 'sunk'
  /** Seconds since it came up, or since it was landed on / sank. */
  since: number
  floatS: number
}

export type FrogEvent =
  | { type: 'jump'; pad: Pad }
  | { type: 'splash'; pad: Pad }
  | { type: 'wrong'; pad: Pad; midi: number }
  | { type: 'pad'; pad: Pad }

export class FrogGame {
  readonly records: PromptRecord[]
  /** The note the frog sits on. */
  at: number
  pad: Pad | null = null
  hearts: number
  score = 0
  /** Jumps landed in a row, for the frog's mood. */
  streak = 0
  /** When the last wrong key came, for the frog's wobble. */
  wrongAt = -Infinity
  pace = 1
  ramp: Ramp | null = null
  readonly surprise = new Surprise()
  private next = 0
  private waitS = 0
  private readonly skill: SkillProvider

  constructor(skill: SkillProvider, start: number, hearts = 3) {
    this.skill = skill
    this.at = start
    this.hearts = hearts
    this.records = skill.targets.map((t) => ({ target: t.midi, shownAt: null, answeredAt: null, wrongPresses: [] }))
    // Counting lines takes a calm head: no surprises here.
    this.surprise.enabled = false
  }

  get total(): number {
    return this.records.length
  }

  get failed(): boolean {
    return this.hearts <= 0
  }

  get done(): boolean {
    return this.failed || (this.next === this.total && (!this.pad || this.pad.state !== 'floating'))
  }

  get progress(): number {
    return this.attempted.length / this.total
  }

  get attempted(): PromptRecord[] {
    return this.records.filter((r) => r.answeredAt !== null || r.missed)
  }

  /** Share of the floating pad's time left (1 = just came up). */
  get floatLeft(): number {
    const p = this.pad
    return p && p.state === 'floating' ? Math.max(0, 1 - p.since / p.floatS) : 0
  }

  private floatTime(): number {
    const t = rampAt(this.next, this.total, this.ramp)
    return (FLOAT_START_S + (FLOAT_END_S - FLOAT_START_S) * t) / (this.pace * this.surprise.boost)
  }

  update(dtMs: number, now: number): FrogEvent[] {
    const events: FrogEvent[] = []
    const dt = dtMs / 1000
    const p = this.pad
    if (p) p.since += dt
    if (this.done) return events

    if (!p || p.state !== 'floating') {
      this.waitS += dt
      if (this.waitS >= JUMP_S && this.next < this.total) {
        const record = this.records[this.next]
        record.shownAt = now
        this.pad = { index: this.next, from: this.at, record, state: 'floating', since: 0, floatS: this.floatTime() }
        this.next++
        events.push({ type: 'pad', pad: this.pad })
      }
      return events
    }
    if (p.since >= p.floatS) {
      p.state = 'sunk'
      p.since = 0
      p.record.missed = true
      this.hearts--
      this.streak = 0
      // The frog swims to where the pad was.
      this.at = p.record.target
      this.waitS = 0
      events.push({ type: 'splash', pad: p })
    }
    return events
  }

  press(midi: number, now: number): FrogEvent[] {
    const p = this.pad
    if (this.done || !p || p.state !== 'floating') return []
    if (this.skill.matches({ midi: p.record.target }, midi)) {
      p.state = 'landed'
      p.since = 0
      p.record.answeredAt = now
      this.at = p.record.target
      this.score += this.surprise.points
      this.streak = firstTryOk(p.record) ? this.streak + 1 : 0
      this.waitS = 0
      return [{ type: 'jump', pad: p }]
    }
    p.record.wrongPresses.push(midi)
    this.streak = 0
    this.wrongAt = now
    return [{ type: 'wrong', pad: p, midi }]
  }

  /** İpucu parıltısı: the floating pad, once most of its time is gone. */
  hint(): PromptRecord | null {
    const p = this.pad
    return p && p.state === 'floating' && p.since >= p.floatS * HINT_AT ? hintFor(p.record) : null
  }
}

/** Report topics: one per jump size and way, so the report says which jumps were hard. */
export function jumpTopics(records: PromptRecord[], start: number): CategoryStat[] {
  const map = new Map<string, CategoryStat>()
  let from = start
  for (const r of records) {
    if (r.answeredAt === null && !r.missed) break
    const { id, label } = jumpTopic(from, r.target)
    const c = map.get(id) ?? { id, label, shown: 0, firstTry: 0, accuracy: 0 }
    c.shown++
    if (firstTryOk(r)) c.firstTry++
    c.accuracy = c.firstTry / c.shown
    map.set(id, c)
    from = r.target
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id, 'tr', { numeric: true }))
}
