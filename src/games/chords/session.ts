// Chord detection and the chord drill. Keys pressed close together (or held
// together) form one chord; the chord is judged when every note is down.
// Pure: time is passed in, like every other engine.

import { type ChordTarget } from '../../music/chords'
import { pitchClass } from '../../music/notes'
import { TOGETHER_MS } from '../melody/session'

/** A key released this long ago still belongs to the chord being played. */
export const CHORD_WINDOW_MS = 350

/**
 * How a chord must be played: `exact` the written keys; `voicing` any
 * octave but the right note at the bottom (the inversion counts); `pcs` the
 * chord's notes in any octave and any inversion.
 */
export type ChordMatchMode = 'exact' | 'voicing' | 'pcs'

export interface ChordPress {
  midi: number
  at: number
}

/** Groups key presses into chord attempts: held keys, and keys released within CHORD_WINDOW_MS. */
export class ChordListener {
  private held = new Map<number, number>()
  private released: ChordPress[] = []
  private attempt = false

  press(midi: number, at: number): void {
    this.held.set(midi, at)
    this.released = this.released.filter((p) => p.midi !== midi)
    this.attempt = true
  }

  release(midi: number): void {
    const at = this.held.get(midi)
    if (at === undefined) return
    this.held.delete(midi)
    this.released.push({ midi, at })
  }

  /** The keys of the chord being played, oldest first. */
  active(now: number): ChordPress[] {
    this.released = this.released.filter((p) => now - p.at <= CHORD_WINDOW_MS)
    return [...[...this.held].map(([midi, at]) => ({ midi, at })), ...this.released].sort((a, b) => a.at - b.at)
  }

  /** Forget a key (a wrong one), so the rest of the chord can still be completed. */
  drop(midi: number): void {
    this.held.delete(midi)
    this.released = this.released.filter((p) => p.midi !== midi)
  }

  /** Start over: keys still held must be pressed again to count. */
  clear(): void {
    this.held.clear()
    this.released = []
    this.attempt = false
  }

  /** True once when an attempt ends unfinished: every key released and the window passed. */
  abandoned(now: number): boolean {
    if (!this.attempt || this.active(now).length) return false
    this.attempt = false
    return true
  }
}

export type ChordMatch =
  | { state: 'partial' }
  /** A key that belongs to no note of the chord; `octave` when the note is right but the octave is not. */
  | { state: 'wrong'; midi: number; octave: boolean }
  /** Every note of the chord, but the wrong one at the bottom. */
  | { state: 'inversion'; bottom: number }
  /** `spreadMs`: first to last key; `lastVoice`: index (low to high) of the chord note that came last. */
  | { state: 'complete'; spreadMs: number; lastVoice: number }

/** How the keys played so far compare with a chord. `ignoreOctave` turns exact into voicing. */
export function matchChord(
  target: ChordTarget,
  presses: ChordPress[],
  mode: ChordMatchMode,
  ignoreOctave = false,
): ChordMatch {
  if (!presses.length) return { state: 'partial' }
  const exact = mode === 'exact' && !ignoreOctave
  const wanted = target.notes.map((n) => n.midi)
  const wantedPcs = wanted.map(pitchClass)
  const belongs = (midi: number) => (exact ? wanted.includes(midi) : wantedPcs.includes(pitchClass(midi)))
  const stray = [...presses].reverse().find((p) => !belongs(p.midi))
  if (stray) return { state: 'wrong', midi: stray.midi, octave: wantedPcs.includes(pitchClass(stray.midi)) }

  const played = presses.map((p) => p.midi)
  const complete = exact
    ? wanted.every((m) => played.includes(m))
    : wantedPcs.every((pc) => played.some((m) => pitchClass(m) === pc))
  if (!complete) return { state: 'partial' }

  const bottom = Math.min(...played)
  if (mode !== 'pcs' && pitchClass(bottom) !== wantedPcs[0]) return { state: 'inversion', bottom }

  const last = presses[presses.length - 1]
  const lastVoice = exact ? wanted.indexOf(last.midi) : wantedPcs.indexOf(pitchClass(last.midi))
  return { state: 'complete', spreadMs: last.at - presses[0].at, lastVoice }
}

export interface ChordRecord {
  chord: ChordTarget
  shownAt: number | null
  answeredAt: number | null
  /** Keys that belonged to no note of the chord. */
  wrongPresses: number[]
  /** Times every note was there but the wrong one was at the bottom. */
  inversionMistakes: number
  /** Attempts given up before every note was down. */
  incomplete: number
  /** First to last key of the chord that counted. */
  spreadMs: number | null
  /** Index (low to high) of the chord note that came last. */
  lastVoice: number | null
  /** Arcade games: the chord got away (landed, burnt). */
  missed?: boolean
}

export const newChordRecord = (chord: ChordTarget): ChordRecord => ({
  chord,
  shownAt: null,
  answeredAt: null,
  wrongPresses: [],
  inversionMistakes: 0,
  incomplete: 0,
  spreadMs: null,
  lastVoice: null,
})

/** Played right at the first attempt: no wrong key, no wrong bottom note, not given up. */
export const chordFirstTry = (r: ChordRecord) =>
  r.answeredAt !== null && r.wrongPresses.length === 0 && r.inversionMistakes === 0 && r.incomplete === 0

/** The notes of a played chord came down together. */
export const together = (r: ChordRecord) => r.spreadMs !== null && r.spreadMs <= TOGETHER_MS

export type ChordEvent =
  | { type: 'partial'; record: ChordRecord }
  | { type: 'chord'; record: ChordRecord; together: boolean }
  | { type: 'wrong'; record: ChordRecord; midi: number; octave: boolean }
  | { type: 'inversion'; record: ChordRecord; bottom: number }
  | { type: 'incomplete'; record: ChordRecord }

/**
 * Settle a press for one record: what the keys so far make of it, and the
 * bookkeeping that goes with it. Shared by the drill and the arcade games.
 */
export function judgePress(
  record: ChordRecord,
  listener: ChordListener,
  now: number,
  mode: ChordMatchMode,
  ignoreOctave: boolean,
): ChordEvent {
  const m = matchChord(record.chord, listener.active(now), mode, ignoreOctave)
  if (m.state === 'wrong') {
    record.wrongPresses.push(m.midi)
    listener.drop(m.midi)
    // A lone wrong key is no attempt at the chord.
    if (!listener.active(now).length) listener.clear()
    return { type: 'wrong', record, midi: m.midi, octave: m.octave }
  }
  if (m.state === 'inversion') {
    record.inversionMistakes++
    listener.clear()
    return { type: 'inversion', record, bottom: m.bottom }
  }
  if (m.state === 'complete') {
    record.answeredAt = now
    record.spreadMs = m.spreadMs
    record.lastVoice = m.lastVoice
    listener.clear()
    return { type: 'chord', record, together: together(record) }
  }
  return { type: 'partial', record }
}

/**
 * Several chords wait at once (the arcade games), the most urgent first:
 * find the one the keys so far are meant for and judge the press on it.
 * Null while the keys still fit one of them unfinished. Keys that fit none
 * together, where the new key fits one, start a new chord; anything else is
 * blamed on the most urgent chord. Call after `listener.press`.
 */
export function judgeAmong<T>(
  candidates: T[],
  recordOf: (t: T) => ChordRecord,
  listener: ChordListener,
  midi: number,
  now: number,
  mode: ChordMatchMode,
  ignoreOctave: boolean,
): { target: T; event: ChordEvent } | null {
  if (!candidates.length) return null
  const active = listener.active(now)
  const states = candidates.map((t) => ({ t, state: matchChord(recordOf(t).chord, active, mode, ignoreOctave).state }))
  let target = states.find((r) => r.state === 'complete')?.t
  if (target === undefined) {
    if (states.some((r) => r.state === 'partial')) return null
    target = states.find((r) => r.state === 'inversion')?.t
  }
  if (target === undefined) {
    const fits = candidates.some(
      (t) => matchChord(recordOf(t).chord, [{ midi, at: now }], mode, ignoreOctave).state !== 'wrong',
    )
    if (fits && active.length > 1) {
      listener.clear()
      listener.press(midi, now)
      return judgeAmong(candidates, recordOf, listener, midi, now, mode, ignoreOctave)
    }
    target = candidates[0]
  }
  return { target, event: judgePress(recordOf(target), listener, now, mode, ignoreOctave) }
}

export interface ChordSessionOptions {
  chords: ChordTarget[]
  mode: ChordMatchMode
  /** Wrong keys and wrong inversions allowed. Unlimited when null. */
  hearts?: number | null
  ignoreOctave?: boolean
}

/** The chord drill: chords read from the staff (or named), one after the other. */
export class ChordSession {
  readonly records: ChordRecord[]
  readonly hearts: number | null
  private index = 0
  private mistakes = 0
  private readonly listener = new ChordListener()
  private readonly mode: ChordMatchMode
  private readonly ignoreOctave: boolean

  constructor({ chords, mode, hearts = null, ignoreOctave = false }: ChordSessionOptions) {
    if (!chords.length) throw new Error('A chord lesson needs at least one chord')
    this.records = chords.map(newChordRecord)
    this.mode = mode
    this.hearts = hearts
    this.ignoreOctave = ignoreOctave
  }

  get position(): number {
    return this.index
  }

  get current(): ChordRecord | null {
    return this.done ? null : this.records[this.index]
  }

  get failed(): boolean {
    return this.hearts !== null && this.mistakes >= this.hearts
  }

  get done(): boolean {
    return this.failed || this.index >= this.records.length
  }

  get heartsLeft(): number | null {
    return this.hearts === null ? null : Math.max(0, this.hearts - this.mistakes)
  }

  /** Chords the player has seen: the basis of the report. */
  get attempted(): ChordRecord[] {
    return this.records.filter((r) => r.shownAt !== null)
  }

  /** Keys of the current chord that are down. */
  playing(now: number): number[] {
    return this.done ? [] : this.listener.active(now).map((p) => p.midi)
  }

  markShown(time: number): void {
    const r = this.current
    if (r && r.shownAt === null) r.shownAt = time
  }

  press(midi: number, time: number): ChordEvent[] {
    const record = this.current
    if (!record || record.shownAt === null) return []
    this.listener.press(midi, time)
    const event = judgePress(record, this.listener, time, this.mode, this.ignoreOctave)
    if (event.type === 'wrong' || event.type === 'inversion') this.mistakes++
    if (event.type === 'chord') this.index++
    return [event]
  }

  release(midi: number): void {
    this.listener.release(midi)
  }

  /** An attempt given up (every key released before the chord was complete) counts, but costs no heart. */
  update(now: number): ChordEvent[] {
    const record = this.current
    if (!record || !this.listener.abandoned(now)) return []
    record.incomplete++
    return [{ type: 'incomplete', record }]
  }
}
