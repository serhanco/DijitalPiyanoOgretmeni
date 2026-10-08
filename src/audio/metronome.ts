// Metronome on Tone.Transport. The games keep time with gameNow();
// the clicks are scheduled on the audio clock so they sound exactly on those
// beats, after the audio output latency.

import { gameNow, onPauseChange } from '../input/gameClock'
import { useSettings } from '../state/settings'

type ToneModule = typeof import('tone')

let tone: Promise<ToneModule> | null = null

/** Load Tone.js and start audio. Call from a user gesture before `startMetronome`. */
export async function prepareMetronome(): Promise<ToneModule | null> {
  try {
    tone ??= import('tone')
    const Tone = await tone
    await Tone.start()
    return Tone
  } catch (err) {
    tone = null
    console.warn('Metronome unavailable', err)
    return null
  }
}

export interface MetronomeOptions {
  bpm: number
  beatsPerBar: number
  /** gameNow() time of `fromBeat`. */
  firstClickAt: number
  /** Beat number of the first click (negative for a count-in). */
  fromBeat: number
  /** Last beat to click, inclusive. */
  toBeat: number
  /** Click even when the metronome setting is off (calibration). */
  force?: boolean
}

export interface Metronome {
  stop: () => void
}

const silent: Metronome = { stop: () => undefined }

/** Start clicking. Needs `prepareMetronome` to have resolved first, otherwise stays silent. */
export async function startMetronome(opts: MetronomeOptions): Promise<Metronome> {
  if (!opts.force && !useSettings.getState().metronome) return silent
  const Tone = await prepareMetronome()
  if (!Tone) return silent
  const ctx = Tone.getContext().rawContext as AudioContext
  const transport = Tone.getTransport()
  transport.stop()
  transport.cancel()
  transport.bpm.value = opts.bpm
  transport.timeSignature = opts.beatsPerBar

  const click = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
    volume: -6,
  }).toDestination()

  let beat = opts.fromBeat
  transport.scheduleRepeat((time) => {
    if (beat > opts.toBeat) return
    const downbeat = ((beat % opts.beatsPerBar) + opts.beatsPerBar) % opts.beatsPerBar === 0
    // Count-in clicks are higher so the player hears when the music starts.
    const note = beat < 0 ? 'G6' : downbeat ? 'E6' : 'A5'
    click.triggerAttackRelease(note, 0.04, time, downbeat ? 1 : 0.6)
    beat++
  }, '4n')

  const outputLatency = (ctx.outputLatency || ctx.baseLatency || 0) as number
  const audioStart = ctx.currentTime + (opts.firstClickAt - gameNow()) / 1000 - outputLatency
  transport.start(Math.max(ctx.currentTime + 0.02, audioStart))
  // The game clock stops while a test note is written; the clicks stop with it.
  const unsubscribe = onPauseChange((paused) => (paused ? transport.pause() : transport.start()))

  return {
    stop() {
      unsubscribe()
      transport.stop()
      transport.cancel()
      // Let the last click ring out.
      window.setTimeout(() => click.dispose(), 300)
    },
  }
}
