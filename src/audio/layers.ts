// Ses katmanları: in the note games every right note of a run gets a soft
// accompaniment under it, and the accompaniment grows as the run grows: a bass
// an octave or two below from the third note, its fifth from the fifth note,
// a high shimmer from the tenth. A wrong note or a miss ends the run, and the
// music thins out again. Synthesized, so it works without the piano samples.

import { useSettings } from '../state/settings'

/** Run lengths where a layer joins. */
export const LAYER_AT = { bass: 3, fifth: 5, shimmer: 10 } as const

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/** The bass under a note: the same pitch class, below G3. Pure. */
export function bassOf(midi: number): number {
  let bass = midi - 12
  while (bass >= 55) bass -= 12
  return bass
}

/** The notes the accompaniment adds under a right note in a run of `run`. Pure. */
export function layerNotes(midi: number, run: number): { midi: number; gain: number }[] {
  const out: { midi: number; gain: number }[] = []
  if (run < LAYER_AT.bass) return out
  const bass = bassOf(midi)
  out.push({ midi: bass, gain: 0.09 })
  if (run >= LAYER_AT.fifth) out.push({ midi: bass + 7, gain: 0.05 })
  if (run >= LAYER_AT.shimmer) out.push({ midi: midi + 12, gain: 0.03 })
  return out
}

/** Sound the layers for a right note that makes the run `run` long. */
export function layerHit(midi: number, run: number): void {
  if (!useSettings.getState().musicLayers) return
  const notes = layerNotes(midi, run)
  const ac = notes.length ? audio() : null
  if (!ac) return
  const start = ac.currentTime
  for (const n of notes) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = n.midi > midi ? 'sine' : 'triangle'
    osc.frequency.value = freq(n.midi)
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(n.gain, start + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.9)
    osc.connect(g).connect(ac.destination)
    osc.start(start)
    osc.stop(start + 0.95)
  }
}
