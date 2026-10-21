// Klavye bağlantı sihirbazı, the pure part: what each step learned from the
// keys pressed, and the report the owner can paste into the chat (so the port
// names and tips in keyboards.ts can be confirmed on the real keyboards).

import { solfegeName } from '../music/notes'

export interface KeyRange {
  lowest: number
  highest: number
}

/** Keys from the lowest to the highest pressed, black ones included. */
export const keyCount = (r: KeyRange) => r.highest - r.lowest + 1

export function rangeText(r: KeyRange, expectedKeys?: number): { ok: boolean; text: string } {
  const n = keyCount(r)
  const span = `${solfegeName(r.lowest)} – ${solfegeName(r.highest)}: ${n} tuş`
  if (expectedKeys === undefined) return { ok: true, text: span }
  if (n === expectedKeys) return { ok: true, text: `${span}, hepsi geliyor.` }
  return {
    ok: false,
    text: `${span}; bu klavyede ${expectedKeys} tuş olmalı. En soldaki ve en sağdaki tuşlara bastığından emin ol.`,
  }
}

export interface Press {
  midi: number
  time: number
}

export const CHORD_PCS = [0, 4, 7] // Do, Mi, Sol

/**
 * Do-Mi-Sol pressed together, in any octave: the held keys (with when each went
 * down) must contain all three. `spreadMs` is the gap between the first and last.
 */
export function chordCheck(held: Press[]): { ok: boolean; spreadMs: number } {
  const byPc = new Map<number, number>()
  for (const p of held) {
    const pc = ((p.midi % 12) + 12) % 12
    if (CHORD_PCS.includes(pc)) byPc.set(pc, Math.max(byPc.get(pc) ?? -Infinity, p.time))
  }
  if (byPc.size < CHORD_PCS.length) return { ok: false, spreadMs: 0 }
  const times = [...byPc.values()]
  return { ok: true, spreadMs: Math.round(Math.max(...times) - Math.min(...times)) }
}

export const SOFT_BELOW = 0.35
export const LOUD_FROM = 0.7

/** Touch: a soft and a loud press show the keyboard sends how hard a key is struck. */
export function touchCheck(velocities: number[]): { soft: number; loud: number; ok: boolean } | null {
  if (velocities.length === 0) return null
  const soft = Math.min(...velocities)
  const loud = Math.max(...velocities)
  return { soft, loud, ok: soft < SOFT_BELOW && loud >= LOUD_FROM }
}

export interface SetupReport {
  device: { name: string; manufacturer: string; keyboard?: string } | null
  output: string | null
  range: KeyRange | null
  chord: { ok: boolean; spreadMs: number } | null
  touch: { soft: number; loud: number; ok: boolean } | null
  /** null: the learner said there is no pedal. */
  pedal: boolean | null
  /** Example notes heard from the piano; null when there is no output or it was not tried. */
  pianoSound: boolean | null
  latencyMs: number | null
  platform: string
  date: string
}

const pct = (v: number) => `%${Math.round(v * 100)}`

/** The report as Markdown, to paste into the chat. */
export function reportMarkdown(r: SetupReport): string {
  const yes = (v: boolean | null, no = 'hayır', none = 'denenmedi') => (v === null ? none : v ? 'evet' : no)
  const lines = [
    `# Klavye bağlantı raporu (${r.date})`,
    '',
    `- Cihaz: ${r.device ? `${r.device.name}${r.device.manufacturer ? ` (${r.device.manufacturer})` : ''}` : 'bağlı değil'}`,
    `- Tanınan klavye: ${r.device?.keyboard ?? 'tanınmadı'}`,
    `- MIDI çıkışı: ${r.output ?? 'bulunamadı'}`,
    `- Tuş aralığı: ${r.range ? `${solfegeName(r.range.lowest)} – ${solfegeName(r.range.highest)} (${keyCount(r.range)} tuş, MIDI ${r.range.lowest}–${r.range.highest})` : 'ölçülmedi'}`,
    `- Do-Mi-Sol birlikte: ${r.chord ? (r.chord.ok ? `evet, aralarında ${r.chord.spreadMs} ms` : 'algılanmadı') : 'denenmedi'}`,
    `- Tuş hassasiyeti: ${r.touch ? `hafif ${pct(r.touch.soft)}, sert ${pct(r.touch.loud)}${r.touch.ok ? '' : ' (fark az)'}` : 'denenmedi'}`,
    `- Sustain pedalı: ${yes(r.pedal, 'algılanmadı', 'pedal yok')}`,
    `- Örnek sesler piyanodan duyuldu: ${yes(r.pianoSound)}`,
    `- Ölçülen gecikme: ${r.latencyMs === null ? 'ölçülmedi' : `${r.latencyMs} ms`}`,
    `- Cihaz/tarayıcı: ${r.platform}`,
  ]
  return lines.join('\n')
}

/** A short description of the device and browser for the report. */
export function platformOf(ua: string): string {
  const os = /android/i.test(ua)
    ? 'Android'
    : /iphone|ipad/i.test(ua)
      ? 'iOS'
      : /mac os/i.test(ua)
        ? 'macOS'
        : /windows/i.test(ua)
          ? 'Windows'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'bilinmiyor'
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /chrome\//i.test(ua)
      ? 'Chrome'
      : /firefox/i.test(ua)
        ? 'Firefox'
        : /safari/i.test(ua)
          ? 'Safari'
          : 'tarayıcı'
  return `${os}, ${browser}`
}
