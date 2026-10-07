import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { type Latency, NO_LATENCY } from '../rhythm/calibration'

interface SettingsState {
  /** Play sound for notes coming from a MIDI keyboard. Digital pianos usually make their own sound. */
  soundForMidi: boolean
  /** Play sound for the on-screen and computer keyboards. */
  soundForScreen: boolean
  /** Write the note name on the on-screen keys. */
  showKeyLabels: boolean
  /** Accept the right note in any octave. Helps with small keyboards. */
  ignoreOctave: boolean
  /** Practice without hearts: mistakes never end a lesson. */
  relaxedMode: boolean
  /** Short synthesized sounds for right/wrong answers and celebrations. */
  soundEffects: boolean
  /** Vibrate on mistakes (Android). */
  vibration: boolean
  /** Metronome clicks in rhythm activities. */
  metronome: boolean
  /** Measured delay of each input, subtracted from presses in rhythm activities. */
  latency: Latency
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      soundForMidi: false,
      soundForScreen: true,
      showKeyLabels: true,
      ignoreOctave: false,
      relaxedMode: false,
      soundEffects: true,
      vibration: true,
      metronome: true,
      latency: NO_LATENCY,
      set: (patch) => set(patch),
    }),
    {
      name: 'dpo-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
)
