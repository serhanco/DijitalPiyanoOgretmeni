// Sounds of the ear lessons: notes played one after another or together, on
// the piano samples when they are loaded, otherwise on a small synthesized
// tone, so ear training still works offline. Times follow the game clock, so
// the 📝 panel's pause holds the next notes back.

import { gameTimeout } from '../input/gameClock'
import { isPianoReady, pianoAttack, pianoRelease } from './piano'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/** A soft plucked tone: a triangle with a quieter octave above, fading out. */
function synthNote(midi: number, seconds: number, gain = 0.18) {
  const ac = audio()
  if (!ac) return
  const start = ac.currentTime
  const out = ac.createGain()
  out.gain.setValueAtTime(0.0001, start)
  out.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  out.gain.exponentialRampToValueAtTime(gain * 0.35, start + seconds * 0.6)
  out.gain.exponentialRampToValueAtTime(0.0001, start + seconds + 0.25)
  out.connect(ac.destination)
  for (const [mult, level, type] of [
    [1, 1, 'triangle'],
    [2, 0.25, 'sine'],
  ] as const) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.value = freq(midi) * mult
    g.gain.value = level
    osc.connect(g).connect(out)
    osc.start(start)
    osc.stop(start + seconds + 0.3)
  }
}

/** Sound one note now for `ms`. */
export function soundNote(midi: number, ms: number, velocity = 0.75): () => void {
  if (isPianoReady()) {
    pianoAttack(midi, velocity)
    return gameTimeout(() => pianoRelease(midi), ms)
  }
  synthNote(midi, ms / 1000)
  return () => undefined
}

export interface SoundPart {
  notes: number[]
  together?: boolean
}

export const NOTE_MS = 650
/** Silence between two parts (the chosen answer and the right one). */
export const PART_GAP_MS = 500

/**
 * Play parts in turn; each part's notes one after another, or together.
 * `onNote(i, midi)` is called as each note sounds. Returns the total length and a cancel function.
 */
export function playParts(
  parts: SoundPart[],
  { noteMs = NOTE_MS, onNote }: { noteMs?: number; onNote?: (part: number, midi: number) => void } = {},
): { ms: number; cancel: () => void } {
  const cancels: (() => void)[] = []
  let at = 0
  parts.forEach((part, i) => {
    const steps = part.together ? [part.notes] : part.notes.map((n) => [n])
    for (const step of steps) {
      const hold = part.together ? noteMs * 1.8 : noteMs * 0.9
      cancels.push(
        gameTimeout(() => {
          for (const midi of step) {
            cancels.push(soundNote(midi, hold, part.together ? 0.6 : 0.75))
            onNote?.(i, midi)
          }
        }, at),
      )
      at += part.together ? noteMs * 2 : noteMs
    }
    if (i < parts.length - 1) at += PART_GAP_MS
  })
  return { ms: at, cancel: () => cancels.forEach((c) => c()) }
}
