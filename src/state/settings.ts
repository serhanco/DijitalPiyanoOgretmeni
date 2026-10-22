import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { type Latency, NO_LATENCY } from '../rhythm/calibration'

interface SettingsState {
  /** Play sound for notes coming from a MIDI keyboard. Digital pianos usually make their own sound. */
  soundForMidi: boolean
  /** The app's example notes (Yankı, memory and ear games, theory cards) sound from a connected digital piano. */
  demoOnPiano: boolean
  /** Play sound for the on-screen and computer keyboards. */
  soundForScreen: boolean
  /** Write the note name on the on-screen keys. */
  showKeyLabels: boolean
  /** Accept the right note in any octave. Helps with small keyboards. */
  ignoreOctave: boolean
  /** Practice without hearts: mistakes never end a lesson. */
  relaxedMode: boolean
  /** İpucu parıltısı: the right key glows when a note waits too long (that answer is not a first-try one). */
  hintGlow: boolean
  /** Short synthesized sounds for right/wrong answers and celebrations. */
  soundEffects: boolean
  /** Ses katmanları: in the note games a run of right notes gets a soft accompaniment, layer by layer. */
  musicLayers: boolean
  /** Vibrate on mistakes (Android). */
  vibration: boolean
  /** Read theory cards and quiz questions aloud. */
  narration: boolean
  /** Metronome clicks in rhythm activities. */
  metronome: boolean
  /** Measured delay of each input, subtracted from presses in rhythm activities. */
  latency: Latency
  /** Measured delay per MIDI keyboard (by port name); wins over `latency.midi`. */
  deviceLatency: Record<string, number>
  /** Tempo last played in each rhythm lesson, by lesson id. */
  tempo: Record<string, number>
  /** Études: the written score (the default) or the falling notes of Nota Şelalesi. */
  etudeView: 'score' | 'waterfall'
  /** For trying the app out: every lesson open and a note button on every screen. */
  testMode: boolean
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      soundForMidi: false,
      soundForScreen: true,
      demoOnPiano: true,
      showKeyLabels: true,
      ignoreOctave: false,
      relaxedMode: false,
      hintGlow: true,
      soundEffects: true,
      musicLayers: true,
      vibration: true,
      metronome: true,
      narration: true,
      latency: NO_LATENCY,
      deviceLatency: {},
      tempo: {},
      etudeView: 'score',
      testMode: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'dpo-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
)
