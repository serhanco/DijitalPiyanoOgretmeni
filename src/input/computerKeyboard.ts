import { noteOff, noteOn } from './inputBus'

// Two rows of the computer keyboard act like piano keys, starting from C.
// Matched by physical key position (KeyboardEvent.code), so the layout
// (Turkish Q/F, English…) does not matter.
const CODE_TO_OFFSET: Record<string, number> = {
  KeyA: 0, // C
  KeyW: 1,
  KeyS: 2, // D
  KeyE: 3,
  KeyD: 4, // E
  KeyF: 5, // F
  KeyT: 6,
  KeyG: 7, // G
  KeyY: 8,
  KeyH: 9, // A
  KeyU: 10,
  KeyJ: 11, // B
  KeyK: 12, // C
  KeyO: 13,
  KeyL: 14, // D
  KeyP: 15,
  Semicolon: 16, // E
  Quote: 17, // F
  BracketRight: 18,
  Backslash: 19, // G
}

export function keyCodeToMidi(code: string, baseMidi: number): number | null {
  const offset = CODE_TO_OFFSET[code]
  return offset === undefined ? null : baseMidi + offset
}

/**
 * Listen to the computer keyboard. Z and X shift the octave down and up.
 * Returns a cleanup function.
 */
export function attachComputerKeyboard(initialBase = 60): () => void {
  let base = initialBase
  const down = new Map<string, number>()

  const onDown = (e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    if (e.code === 'KeyZ') {
      base = Math.max(24, base - 12)
      return
    }
    if (e.code === 'KeyX') {
      base = Math.min(96, base + 12)
      return
    }
    const midi = keyCodeToMidi(e.code, base)
    if (midi === null || down.has(e.code)) return
    e.preventDefault()
    down.set(e.code, midi)
    noteOn(midi, 'computer')
  }

  const onUp = (e: KeyboardEvent) => {
    const midi = down.get(e.code)
    if (midi === undefined) return
    down.delete(e.code)
    noteOff(midi, 'computer')
  }

  const releaseAll = () => {
    for (const midi of down.values()) noteOff(midi, 'computer')
    down.clear()
  }

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', releaseAll)
  return () => {
    releaseAll()
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', releaseAll)
  }
}
