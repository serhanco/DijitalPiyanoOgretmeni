// Piano sound built on Tone.js and the Salamander Grand Piano samples.
// Tone.js is loaded lazily so the first screen stays light.

import type { Sampler } from 'tone'
import { outNoteOff, outNoteOn, pianoOutput } from '../midi/midiOut'

const SAMPLE_BASE = 'https://tonejs.github.io/audio/salamander/'

let sampler: Sampler | null = null
let loading: Promise<Sampler> | null = null
/** Tone's audio context, to turn scheduled audio times into MIDI timestamps. */
let audioCtx: BaseAudioContext | null = null

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
      audioCtx = Tone.getContext().rawContext as BaseAudioContext
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

// The app's own piano: the notes the learner plays on screen (or on a keyboard without sound).

export function samplerAttack(midi: number, velocity = 0.8): void {
  if (!sampler) {
    void initPiano()
    return
  }
  sampler.triggerAttack(freq(midi), undefined, velocity)
}

export function samplerRelease(midi: number): void {
  sampler?.triggerRelease(freq(midi))
}

// Example notes (the app playing to the learner): on the connected digital
// piano when there is one (midiOut.ts), otherwise on the sampled piano.

export function pianoAttack(midi: number, velocity = 0.8): void {
  if (outNoteOn(midi, velocity)) return
  samplerAttack(midi, velocity)
}

export function pianoRelease(midi: number): void {
  outNoteOff(midi)
  samplerRelease(midi)
}

/** True when example notes can sound: on the piano, or on the loaded samples. */
export function isPianoReady(): boolean {
  return pianoOutput() !== null || sampler !== null
}

/** Play `midi` for `seconds` at audio-clock `time` (scheduled sounds). False when nothing can play it. */
export function pianoNoteAt(midi: number, seconds: number, time: number, velocity = 0.8): boolean {
  if (pianoOutput() && audioCtx) {
    // The audio clock runs ahead of what is heard by the output latency; the piano sounds at once.
    const ctx = audioCtx as AudioContext
    const latency = ctx.outputLatency || ctx.baseLatency || 0
    const at = performance.now() + (time - ctx.currentTime + latency) * 1000
    outNoteOn(midi, velocity, at)
    outNoteOff(midi, at + seconds * 1000)
    return true
  }
  if (!sampler) return false
  sampler.triggerAttackRelease(freq(midi), seconds, time, velocity)
  return true
}
