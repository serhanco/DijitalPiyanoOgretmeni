// What chord events say to the player, and the written names of chord notes.

import { type ChordTarget, INVERSION_LABELS } from '../../music/chords'
import { solfegeName } from '../../music/notes'
import { spelledName } from '../../music/scales'
import type { ChordEvent } from './session'

/** Written names of the chords' notes (Si♭, not La#). */
export function chordNoteNames(chords: ChordTarget[]): Map<number, string> {
  const names = new Map<number, string>()
  for (const c of chords) for (const n of c.notes) names.set(n.midi, spelledName(n))
  return names
}

/** What a chord event says to the player. */
export function chordFeedback(ev: ChordEvent, nameOf: (midi: number) => string): { text: string; good: boolean } {
  const c = ev.record.chord
  switch (ev.type) {
    case 'chord':
      return ev.together
        ? { text: 'Hepsi aynı anda! 👏', good: true }
        : {
            text: `Doğru! Notalar ${Math.round(ev.record.spreadMs!)} ms arayla indi, birlikte basmayı dene.`,
            good: true,
          }
    case 'wrong':
      return {
        text: ev.octave
          ? `${nameOf(ev.midi)}: nota doğru ama oktav değil`
          : `${solfegeName(ev.midi, false)} bu akorda yok`,
        good: false,
      }
    case 'inversion':
      return {
        text: `Notalar doğru ama en altta ${solfegeName(ev.bottom, false)} var. ${INVERSION_LABELS[c.inversion]}: en altta ${nameOf(c.notes[0].midi).replace(/\d+$/, '')} olmalı.`,
        good: false,
      }
    case 'incomplete':
      return { text: 'Akorun bütün notalarına birlikte bas.', good: false }
    default:
      return { text: '', good: true }
  }
}
