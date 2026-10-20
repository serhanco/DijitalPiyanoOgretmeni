// The sustain pedal keeps a note sounding after its key is let go, so for
// judging how long a note is held, a key released while the pedal is down
// counts as held until the pedal comes up (or the key is struck again).

export interface Release {
  midi: number
  time: number
}

export class Sustain {
  private down = false
  private pending = new Set<number>()

  /** A key let go: its release, or null while the pedal holds it. */
  off(midi: number, time: number): Release | null {
    if (!this.down) return { midi, time }
    this.pending.add(midi)
    return null
  }

  /** A key pressed: a note the pedal was still holding on that key ends now. */
  on(midi: number, time: number): Release | null {
    return this.pending.delete(midi) ? { midi, time } : null
  }

  /** The pedal moved: lifting it releases every note it held. */
  pedal(down: boolean, time: number): Release[] {
    this.down = down
    if (down) return []
    const released = [...this.pending].map((midi) => ({ midi, time }))
    this.pending.clear()
    return released
  }

  get held(): number[] {
    return [...this.pending]
  }
}
