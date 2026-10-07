import { useEffect } from 'react'
import { subscribe } from '../input/inputBus'
import { keyboardOf } from '../midi/midiStore'
import { useSettings } from '../state/settings'
import { initPiano, pianoAttack, pianoRelease } from './piano'

/** Plays the piano sound for incoming notes, according to the sound settings. */
export function useSoundRouting() {
  useEffect(() => {
    // Browsers only allow audio after a user gesture.
    const unlock = () => {
      void initPiano().catch(() => undefined)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    const unsubscribe = subscribe((e) => {
      const { soundForMidi, soundForScreen } = useSettings.getState()
      // A controller without its own sound (the Akai) always gets the app's piano.
      const silent = keyboardOf(e.device)?.makesSound === false
      const enabled = e.source === 'midi' ? soundForMidi || silent : soundForScreen
      if (e.type === 'on' && enabled) pianoAttack(e.midi, e.velocity)
      // Always release, so a setting changed mid-note never leaves it ringing.
      if (e.type === 'off') pianoRelease(e.midi)
    })

    return () => {
      unsubscribe()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])
}
