import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SettingsState {
  /** Play sound for notes coming from a MIDI keyboard. Digital pianos usually make their own sound. */
  soundForMidi: boolean
  /** Play sound for the on-screen and computer keyboards. */
  soundForScreen: boolean
  /** Write the note name on the on-screen keys. */
  showKeyLabels: boolean
  /** Accept the right note in any octave. Helps with small keyboards. */
  ignoreOctave: boolean
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      soundForMidi: false,
      soundForScreen: true,
      showKeyLabels: true,
      ignoreOctave: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'dpo-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
)
