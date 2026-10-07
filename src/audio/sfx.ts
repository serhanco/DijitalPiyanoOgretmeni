// Small synthesized sound effects (no audio files) and vibration.

import { useSettings } from '../state/settings'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface Tone {
  freq: number
  at: number // seconds from now
  dur: number
  type?: OscillatorType
  gain?: number
}

function play(tones: Tone[]) {
  if (!useSettings.getState().soundEffects) return
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  for (const t of tones) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = t.type ?? 'sine'
    osc.frequency.value = t.freq
    const start = now + t.at
    const peak = t.gain ?? 0.12
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur)
    osc.connect(g).connect(ac.destination)
    osc.start(start)
    osc.stop(start + t.dur + 0.02)
  }
}

export const sfx = {
  correct: () =>
    play([
      { freq: 880, at: 0, dur: 0.12, type: 'triangle' },
      { freq: 1320, at: 0.07, dur: 0.18, type: 'triangle' },
    ]),
  wrong: () => {
    play([{ freq: 160, at: 0, dur: 0.22, type: 'sawtooth', gain: 0.05 }])
    vibrate(80)
  },
  combo: () =>
    play([660, 880, 1100, 1320].map((freq, i) => ({ freq, at: i * 0.06, dur: 0.14, type: 'triangle' as const }))),
  fanfare: () =>
    play([
      { freq: 523, at: 0, dur: 0.18, type: 'triangle' },
      { freq: 659, at: 0.14, dur: 0.18, type: 'triangle' },
      { freq: 784, at: 0.28, dur: 0.18, type: 'triangle' },
      { freq: 1047, at: 0.42, dur: 0.5, type: 'triangle', gain: 0.14 },
    ]),
  fail: () =>
    play([
      { freq: 392, at: 0, dur: 0.25, type: 'triangle' },
      { freq: 330, at: 0.2, dur: 0.25, type: 'triangle' },
      { freq: 262, at: 0.4, dur: 0.5, type: 'triangle' },
    ]),
  tick: () => play([{ freq: 1500, at: 0, dur: 0.03, type: 'square', gain: 0.03 }]),
}

export function vibrate(ms: number) {
  if (!useSettings.getState().vibration) return
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Not supported (e.g. iOS): ignore.
  }
}
