// Piano sound built on Tone.js and the Salamander Grand Piano samples.
// Tone.js is loaded lazily so the first screen stays light.

import type { Sampler } from 'tone'

const SAMPLE_BASE = 'https://tonejs.github.io/audio/salamander/'

let sampler: Sampler | null = null
let loading: Promise<Sampler> | null = null

function sampleMap(): Record<string, string> {
  const urls: Record<string, string> = {}
  for (let octave = 1; octave <= 7; octave++) {
    for (const name of ['C', 'D#', 'F#', 'A']) {
      urls[`${name}${octave}`] = `${name.replace('#', 's')}${octave}.mp3`
    }
  }
  return urls
}

/** Start audio and load the samples. Must first be called from a user gesture. */
export function initPiano(): Promise<Sampler> {
  if (sampler) return Promise.resolve(sampler)
  if (!loading) {
    loading = (async () => {
      const Tone = await import('tone')
      await Tone.start()
      const s = await new Promise<Sampler>((resolve, reject) => {
        const inst: Sampler = new Tone.Sampler({
          urls: sampleMap(),
          baseUrl: SAMPLE_BASE,
          release: 1,
          onload: () => resolve(inst),
          onerror: reject,
        }).toDestination()
      })
      sampler = s
      return s
    })()
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}

function freq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function pianoAttack(midi: number, velocity = 0.8): void {
  if (!sampler) {
    void initPiano()
    return
  }
  sampler.triggerAttack(freq(midi), undefined, velocity)
}

export function pianoRelease(midi: number): void {
  sampler?.triggerRelease(freq(midi))
}

export function isPianoReady(): boolean {
  return sampler !== null
}
