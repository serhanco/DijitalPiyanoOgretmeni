// The owner's MIDI keyboards, recognised by the name of their port, so the
// app can explain how each connects and adapt to it (a controller without
// its own sound gets the app's piano sound).

import { solfegeName } from '../music/notes'

export type KeyboardId = 'yamaha-clp' | 'akai-mpk-mini'

export interface KeyboardProfile {
  id: KeyboardId
  name: string
  /** False for controllers that make no sound: the app then plays the piano sound for them. */
  makesSound: boolean
  keys: number
  /** Shown once the keyboard is connected. */
  tip: string
}

export const KEYBOARDS: Record<KeyboardId, KeyboardProfile> = {
  'yamaha-clp': {
    id: 'yamaha-clp',
    name: 'Yamaha Clavinova CLP-845',
    makesSound: true,
    keys: 88,
    tip: 'Ses piyanodan geliyor. Ritim dersleri için gecikme ayarını bu bağlantıyla bir kez yap; USB ve Bluetooth ayrı ölçülür.',
  },
  'akai-mpk-mini': {
    id: 'akai-mpk-mini',
    name: 'Akai MPK Mini MK3',
    makesSound: false,
    keys: 25,
    tip: 'Bu klavyenin kendi sesi yok, piyano sesini uygulama çalıyor. Dersler orta Do’dan (Do4) başlar: en soldaki tuşa basıp aşağıdaki oktav ipucuna bak.',
  },
}

/**
 * Match a MIDI port to a known keyboard. Yamaha pianos call their USB port
 * "Digital Piano" (maker "Yamaha Corporation"); over Bluetooth the model name
 * shows. The Akai port is "MPK mini 3" (or "MPK mini 3 MIDI 1").
 */
export function keyboardFor(name: string, manufacturer = ''): KeyboardProfile | null {
  if (/mpk\s*mini/i.test(name)) return KEYBOARDS['akai-mpk-mini']
  if (/clp|clavinova/i.test(name)) return KEYBOARDS['yamaha-clp']
  if (/digital\s*piano/i.test(name) && (manufacturer === '' || /yamaha/i.test(manufacturer))) {
    return KEYBOARDS['yamaha-clp']
  }
  return null
}

const MIDDLE_C = 60

/**
 * Advice after the player pressed the leftmost key of a 25-key controller:
 * the lessons want it on middle C, and the OCTAVE buttons move by 12.
 */
export function octaveAdvice(lowestKey: number): { ok: boolean; text: string } {
  const name = solfegeName(lowestKey)
  if (lowestKey === MIDDLE_C) return { ok: true, text: 'Hazır: en soldaki tuş orta Do (Do4).' }
  if (lowestKey % 12 !== 0) {
    return { ok: false, text: `Bu ${name}. En soldaki tuş bir Do olmalı; klavyenin en solundaki beyaz tuşa bas.` }
  }
  const steps = Math.abs(lowestKey - MIDDLE_C) / 12
  const button = lowestKey < MIDDLE_C ? 'OCTAVE +' : 'OCTAVE −'
  return { ok: false, text: `En soldaki tuş ${name}. ${button} düğmesine ${steps} kez bas, sonra tekrar dene.` }
}
