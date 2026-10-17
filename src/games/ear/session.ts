// "Kulak Dedektifi": the pure engine of the ear lessons. Every question is a
// case: a sound is heard (two notes, a hidden note after the reference Do, an
// interval or a chord) and the player answers on buttons or on the keys. The
// first answer counts; a wrong one costs a heart, and the screen plays what
// was chosen and then the right answer so the difference can be heard.

import { pitchClass, solfegeName } from '../../music/notes'
import { type CategoryStat, type SessionSummary, starsFor } from '../noteHunter/summary'
import {
  CHORD_SHAPES,
  type ChordColour,
  COLOUR_HINTS,
  COLOUR_LABELS,
  DIRECTION_LABELS,
  type Direction,
  intervalInfo,
} from './intervals'

/**
 * direction: higher, lower or the same? · pitch: find the hidden note after the reference Do ·
 * interval: name the interval · sing: the first note is shown, play the second · chord: name its colour
 */
export type EarTask = 'direction' | 'pitch' | 'interval' | 'sing' | 'chord'

export interface EarOption {
  id: string
  label: string
}

export interface EarPrompt {
  task: EarTask
  /** The notes of the case, in order; with `together` all at once. */
  notes: number[]
  together?: boolean
  /** Played first as an anchor (the reference Do of note finding). */
  reference?: number
  /** Choice tasks: the id of the right option. Key tasks: the MIDI number to find. */
  answer: string
  /** Choice tasks only; key tasks are answered on the keyboard. */
  options?: EarOption[]
  /** Lit on the keyboard while the case is open (the first note of `sing`, the reference Do). */
  shown?: number
  /** Topic ids for the report: one per thing this case trains. */
  topics: string[]
}

export interface EarRecord {
  shownAt: number | null
  answeredAt: number | null
  /** Wrong answers before the right one: option ids, or MIDI numbers as strings. */
  wrong: string[]
  replays: number
}

export type EarEvent = { type: 'right' } | { type: 'wrong'; chosen: string } | { type: 'complete' } | { type: 'failed' }

export interface EarOptions {
  /** Wrong answers allowed; unlimited when null. */
  hearts?: number | null
  /** Key tasks: any octave of the note counts. */
  ignoreOctave?: boolean
}

export class EarSession {
  readonly prompts: EarPrompt[]
  readonly records: EarRecord[]
  readonly hearts: number | null
  private index = 0
  private mistakes = 0
  private finished = false
  private readonly ignoreOctave: boolean

  constructor(prompts: EarPrompt[], { hearts = null, ignoreOctave = false }: EarOptions = {}) {
    if (!prompts.length) throw new Error('Kulak Dedektifi needs at least one case')
    this.prompts = prompts
    this.records = prompts.map(() => ({ shownAt: null, answeredAt: null, wrong: [], replays: 0 }))
    this.hearts = hearts
    this.ignoreOctave = ignoreOctave
  }

  get position(): number {
    return this.index
  }

  get current(): EarPrompt | null {
    return this.done ? null : this.prompts[this.index]
  }

  get done(): boolean {
    return this.finished || this.index >= this.prompts.length
  }

  get failed(): boolean {
    return this.hearts !== null && this.mistakes >= this.hearts
  }

  get heartsLeft(): number | null {
    return this.hearts === null ? null : Math.max(0, this.hearts - this.mistakes)
  }

  /** Cases answered right, first try or not. */
  get solved(): number {
    return this.records.filter((r) => r.answeredAt !== null).length
  }

  /** Records of the cases opened so far: the basis of the report. */
  get attempted(): { prompt: EarPrompt; record: EarRecord }[] {
    return this.prompts
      .map((prompt, i) => ({ prompt, record: this.records[i] }))
      .filter(({ record }) => record.shownAt !== null)
  }

  /** The case has been heard: from now on answers count. */
  markShown(now: number) {
    const r = this.records[this.index]
    if (r && r.shownAt === null) r.shownAt = now
  }

  /** "Tekrar dinle": counted for the report, never a mistake. */
  replay() {
    const r = this.records[this.index]
    if (r && !this.done) r.replays++
  }

  choose(id: string, now: number): EarEvent[] {
    const p = this.current
    if (!p || !p.options || this.records[this.index].shownAt === null) return []
    if (this.records[this.index].wrong.includes(id)) return []
    return this.judge(id === p.answer, id, now)
  }

  press(midi: number, now: number): EarEvent[] {
    const p = this.current
    if (!p || p.options || this.records[this.index].shownAt === null) return []
    // The shown note of "play the second note" is the player listening again: no mistake.
    if (p.task === 'sing' && midi === p.shown) return []
    const target = Number(p.answer)
    const right = this.ignoreOctave ? pitchClass(midi) === pitchClass(target) : midi === target
    return this.judge(right, String(midi), now)
  }

  private judge(right: boolean, answer: string, now: number): EarEvent[] {
    const r = this.records[this.index]
    if (right) {
      r.answeredAt = now
      this.index++
      return this.index >= this.prompts.length ? [{ type: 'right' }, { type: 'complete' }] : [{ type: 'right' }]
    }
    r.wrong.push(answer)
    this.mistakes++
    if (this.failed) {
      this.finished = true
      return [{ type: 'wrong', chosen: answer }, { type: 'failed' }]
    }
    return [{ type: 'wrong', chosen: answer }]
  }
}

/** What to play after a wrong answer: the sound of what was chosen, then the right one. */
export function contrastOf(p: EarPrompt, chosen: string): { notes: number[]; together?: boolean }[] {
  const right = { notes: p.notes, together: p.together }
  if (p.task === 'interval') {
    const [a, b] = p.notes
    const n = Number(chosen)
    const way = p.together ? 1 : Math.sign(b - a) || 1
    const lowest = Math.min(a, b)
    return [{ notes: p.together ? [lowest, lowest + n] : [a, a + way * n], together: p.together }, right]
  }
  if (p.task === 'chord') {
    const shape = CHORD_SHAPES[chosen as ChordColour]
    return [{ notes: shape.map((s) => p.notes[0] + s), together: true }, right]
  }
  if (p.task === 'pitch') return [{ notes: [Number(chosen)] }, { notes: [Number(p.answer)] }]
  if (p.task === 'sing') return [{ notes: [p.notes[0], Number(chosen)] }, right]
  return [right]
}

// --- Building the cases --------------------------------------------------------------------

/** `count` items drawn round by round from a shuffled bag; a new round never starts on the item just drawn. */
export function balanced<T>(items: T[], count: number, random: () => number = Math.random): T[] {
  const out: T[] = []
  while (out.length < count) {
    const bag = [...items]
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    if (bag.length > 1 && bag[0] === out[out.length - 1]) bag.push(bag.shift()!)
    out.push(...bag)
  }
  return out.slice(0, count)
}

const pick = <T>(items: T[], random: () => number): T => items[Math.floor(random() * items.length)]

const DIRECTION_OPTIONS: EarOption[] = [
  { id: 'up', label: '⬆ Yükseldi' },
  { id: 'down', label: '⬇ Alçaldı' },
  { id: 'same', label: '＝ Aynı kaldı' },
]

/** Two notes from `pool`: did the second go up, down, or stay? */
export function directionPrompts(pool: number[], count: number, random: () => number = Math.random): EarPrompt[] {
  // A same-note case now and then, the rest split between up and down.
  const answers = balanced(['up', 'down', 'up', 'down', 'same'], count, random)
  return answers.map((answer) => {
    let a = pick(pool, random)
    let b = a
    if (answer !== 'same') {
      const others = pool.filter((m) => (answer === 'up' ? m > a : m < a))
      if (!others.length) {
        // Nothing higher (or lower) than a: start from the other end of the pool.
        a = answer === 'up' ? Math.min(...pool) : Math.max(...pool)
        b = pick(
          pool.filter((m) => m !== a),
          random,
        )
      } else b = pick(others, random)
    }
    return { task: 'direction', notes: [a, b], answer, options: DIRECTION_OPTIONS, topics: [`dir:${answer}`] }
  })
}

/** The reference Do, then a hidden note from `pool` to find on the keys. */
export function pitchPrompts(
  pool: number[],
  count: number,
  random: () => number = Math.random,
  reference = 60,
): EarPrompt[] {
  return balanced(pool, count, random).map((midi) => ({
    task: 'pitch',
    reference,
    shown: reference,
    notes: [midi],
    answer: String(midi),
    topics: [`note:${midi}`],
  }))
}

export interface IntervalSpec {
  /** Semitones of the intervals asked. */
  intervals: number[]
  ways: Direction[]
  /** Lowest and highest note any case may use. */
  low: number
  high: number
}

function intervalNotes(n: number, way: Direction, low: number, high: number, random: () => number): number[] {
  const roots: number[] = []
  for (let m = low; m + n <= high; m++) roots.push(m)
  const lower = pick(roots, random)
  return way === 'down' ? [lower + n, lower] : [lower, lower + n]
}

/** Hear an interval, name it. */
export function intervalPrompts(spec: IntervalSpec, count: number, random: () => number = Math.random): EarPrompt[] {
  const options = spec.intervals.map((n) => ({ id: String(n), label: intervalInfo(n).name }))
  const ways = balanced(spec.ways, count, random)
  return balanced(spec.intervals, count, random).map((n, i) => ({
    task: 'interval',
    notes: intervalNotes(n, ways[i], spec.low, spec.high, random),
    together: ways[i] === 'together',
    answer: String(n),
    options,
    topics: [`int:${n}`, `way:${ways[i]}`],
  }))
}

/** The first note is lit and heard, then the interval: find the second note on the keys. */
export function singPrompts(spec: IntervalSpec, count: number, random: () => number = Math.random): EarPrompt[] {
  const melodic = spec.ways.filter((w) => w !== 'together')
  const ways = balanced(melodic.length ? melodic : (['up'] as Direction[]), count, random)
  return balanced(spec.intervals, count, random).map((n, i) => {
    const notes = intervalNotes(n, ways[i], spec.low, spec.high, random)
    return {
      task: 'sing',
      notes,
      shown: notes[0],
      answer: String(notes[1]),
      topics: [`int:${n}`, `way:${ways[i]}`, 'task:sing'],
    }
  })
}

export interface ChordColourSpec {
  colours: ChordColour[]
  /** Lowest root and highest note any chord may reach. */
  low: number
  high: number
}

/** Hear a chord in root position, name its colour. */
export function chordPrompts(spec: ChordColourSpec, count: number, random: () => number = Math.random): EarPrompt[] {
  const options = spec.colours.map((c) => ({ id: c, label: COLOUR_LABELS[c] }))
  return balanced(spec.colours, count, random).map((colour) => {
    const shape = CHORD_SHAPES[colour]
    const top = shape[shape.length - 1]
    const roots: number[] = []
    for (let m = spec.low; m + top <= spec.high; m++) roots.push(m)
    const root = pick(roots, random)
    return {
      task: 'chord',
      notes: shape.map((s) => root + s),
      together: true,
      answer: colour,
      options,
      topics: [`chord:${colour}`],
    }
  })
}

/** Cases of several kinds, shuffled together (Büyük Vaka). */
export function mixPrompts(groups: EarPrompt[][], random: () => number = Math.random): EarPrompt[] {
  const all = groups.flat()
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

/** One kind of case in a lesson, and how many. */
export type EarCaseSpec =
  | { task: 'direction'; pool: number[]; count: number }
  | { task: 'pitch'; pool: number[]; count: number; reference?: number }
  | ({ task: 'interval' | 'sing'; count: number } & IntervalSpec)
  | ({ task: 'chord'; count: number } & ChordColourSpec)

/** A Kulak Dedektifi lesson: its cases, in turn or shuffled together. */
export interface EarSpec {
  cases: EarCaseSpec[]
  mix?: boolean
}

export function buildCases(spec: EarSpec, random: () => number = Math.random): EarPrompt[] {
  const groups = spec.cases.map((c) => {
    switch (c.task) {
      case 'direction':
        return directionPrompts(c.pool, c.count, random)
      case 'pitch':
        return pitchPrompts(c.pool, c.count, random, c.reference)
      case 'interval':
        return intervalPrompts(c, c.count, random)
      case 'sing':
        return singPrompts(c, c.count, random)
      case 'chord':
        return chordPrompts(c, c.count, random)
    }
  })
  return spec.mix ? mixPrompts(groups, random) : groups.flat()
}

/** Every key a lesson's cases may sound or ask for, for its keyboard. */
export function earNotes(spec: EarSpec): number[] {
  return spec.cases.flatMap((c) =>
    c.task === 'direction' || c.task === 'pitch'
      ? [...c.pool, ...(c.task === 'pitch' ? [c.reference ?? 60] : [])]
      : [c.low, c.high],
  )
}

// --- The report ----------------------------------------------------------------------------

const DIR_LABELS: Record<string, string> = { up: 'Yükselen ses', down: 'Alçalan ses', same: 'Aynı kalan ses' }

/** Report label of a topic id. */
export function topicLabel(id: string): string {
  const [kind, value] = id.split(':')
  if (kind === 'dir') return DIR_LABELS[value]
  if (kind === 'note') return `${solfegeName(Number(value), false)} notasını bulma`
  if (kind === 'int') return intervalInfo(Number(value)).name
  if (kind === 'way') return DIRECTION_LABELS[value as Direction]
  if (kind === 'chord') return `${COLOUR_LABELS[value as ChordColour]} akorlar`
  if (id === 'task:sing') return 'Aralığı klavyede bulma'
  return id
}

/** Name of an answer of a case: an option's label, or a note's name. */
export function answerLabel(p: EarPrompt, id: string): string {
  const option = p.options?.find((o) => o.id === id)
  return option ? option.label.replace(/^[^\p{L}]+/u, '') : solfegeName(Number(id), false)
}

export interface Confusion {
  /** The right answer. */
  answer: string
  /** What was chosen instead. */
  chosen: string
  count: number
}

export interface EarSummary {
  cases: number
  solved: number
  replays: number
  /** Most often confused pairs, most frequent first. */
  confusions: Confusion[]
  /** One piece of advice per confusion shown. */
  tips: string[]
}

function tipFor(p: EarPrompt, chosen: string): string {
  if (p.task === 'interval' || p.task === 'sing') {
    const right = intervalInfo(Number(p.task === 'sing' ? Math.abs(p.notes[1] - p.notes[0]) : p.answer))
    const song = right.song
    return song
      ? `${right.name} sesini “${song.title}” (${song.original}) şarkısının başıyla hatırla.`
      : `${right.name} en geniş aralık: iki nota aynı adı taşır, biri incesi.`
  }
  if (p.task === 'chord') return COLOUR_HINTS[p.answer as ChordColour]
  if (p.task === 'pitch') {
    const diff = Number(p.answer) - Number(chosen)
    return `Do'dan başlayıp içinden ${diff > 0 ? 'yukarı' : 'aşağı'} sayarak dinle; aradığın nota ${diff > 0 ? 'daha ince' : 'daha kalın'}.`
  }
  return 'İki notayı içinden mırıldan: sesin çıktığını mı, indiğini mi hissediyorsun?'
}

const TOPIC_ORDER = ['dir', 'note', 'int', 'way', 'chord', 'task']

export function earReport(session: EarSession): SessionSummary {
  const cases = session.attempted
  const groups = new Map<string, { shown: number; firstTry: number }>()
  for (const { prompt, record } of cases)
    for (const t of prompt.topics) {
      const g = groups.get(t) ?? { shown: 0, firstTry: 0 }
      g.shown++
      if (record.wrong.length === 0 && record.answeredAt !== null) g.firstTry++
      groups.set(t, g)
    }
  const perCategory: CategoryStat[] = [...groups.entries()]
    .map(([id, g]) => ({ id, label: topicLabel(id), ...g, accuracy: g.firstTry / g.shown }))
    .sort((a, b) => {
      const ka = TOPIC_ORDER.indexOf(a.id.split(':')[0])
      const kb = TOPIC_ORDER.indexOf(b.id.split(':')[0])
      return ka - kb || Number(a.id.split(':')[1]) - Number(b.id.split(':')[1]) || a.id.localeCompare(b.id)
    })

  const confusionMap = new Map<string, Confusion & { tip: string }>()
  for (const { prompt, record } of cases)
    for (const chosen of record.wrong) {
      const answer = answerLabel(prompt, prompt.answer)
      const name = answerLabel(prompt, chosen)
      const key = `${answer}|${name}`
      const c = confusionMap.get(key) ?? { answer, chosen: name, count: 0, tip: tipFor(prompt, chosen) }
      c.count++
      confusionMap.set(key, c)
    }
  const top = [...confusionMap.values()].sort((a, b) => b.count - a.count).slice(0, 3)

  const total = cases.length
  const clean = cases.filter(({ record }) => record.wrong.length === 0 && record.answeredAt !== null)
  const accuracy = total ? clean.length / total : 0
  const times = clean.map(({ record }) => record.answeredAt! - record.shownAt!)
  const replays = cases.reduce((n, { record }) => n + record.replays, 0)
  const weak = [...perCategory].sort((a, b) => a.accuracy - b.accuracy)[0]
  const failed = session.failed

  return {
    failed,
    total,
    firstTry: clean.length,
    accuracy,
    avgReactionMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    totalMistakes: cases.reduce((n, { record }) => n + record.wrong.length, 0),
    stars: failed ? 0 : starsFor(accuracy),
    perNote: [],
    perCategory,
    weakest: [],
    ear: {
      cases: total,
      solved: session.solved,
      replays,
      confusions: top.map(({ answer, chosen, count }) => ({ answer, chosen, count })),
      tips: top.map((c) => c.tip),
    },
    message: failed
      ? 'Dedektifin büyüteci buğulandı. Her vakada önce bir kez daha dinle, sonra karar ver.'
      : accuracy === 1
        ? 'Bütün vakaları ilk denemede çözdün. Keskin bir kulağın var!'
        : !weak
          ? 'Vakalar seni bekliyor: dinle, sonra çöz.'
          : accuracy >= 0.75
            ? `İyi iş dedektif! “${weak.label}” biraz daha dinleme istiyor.`
            : `Kulak zamanla açılır. “${weak.label}” konusunu sesleri art arda dinleyerek tekrar dene.`,
  }
}
