import { create } from 'zustand'
import { noteOff, noteOn } from '../input/inputBus'
import { emitPedal } from '../input/pedal'
import { keyboardFor, type KeyboardProfile } from './keyboards'
import { parseMidiMessage } from './midiMessage'
import { isEcho, pickOutput, setPianoOutput } from './midiOut'
import { isNativeApp, requestNativeMidiAccess } from './nativeMidi'

export type MidiStatus = 'unsupported' | 'idle' | 'requesting' | 'ready' | 'denied'

export interface MidiDevice {
  id: string
  name: string
  manufacturer: string
  /** One of the owner's keyboards, when recognised. */
  keyboard: KeyboardProfile | null
}

interface MidiState {
  status: MidiStatus
  devices: MidiDevice[]
  /** The output port example notes are played on (a connected piano with its own sound), if any. */
  output: string | null
  error?: string
  connect: () => Promise<void>
}

let access: MIDIAccess | null = null

function handleMessage(e: MIDIMessageEvent, device: string) {
  if (!e.data) return
  const msg = parseMidiMessage(e.data)
  if (!msg) return
  // Event timestamps share performance.now()'s clock.
  const time = e.timeStamp || performance.now()
  if (msg.type === 'pedal') emitPedal(msg.down, time, device)
  else if (isEcho(msg.midi, time)) return
  else if (msg.type === 'on') noteOn(msg.midi, 'midi', msg.velocity, time, device)
  else noteOff(msg.midi, 'midi', time, device)
}

/** Keyboards by port name, so other modules can adapt to the one a note came from. */
const known = new Map<string, KeyboardProfile | null>()
export const keyboardOf = (device: string | undefined) => (device ? (known.get(device) ?? null) : null)

function attachInputs(set: (s: Partial<MidiState>) => void) {
  if (!access) return
  const devices: MidiDevice[] = []
  access.inputs.forEach((input) => {
    const name = input.name || 'MIDI klavye'
    const keyboard = keyboardFor(name, input.manufacturer || '')
    known.set(name, keyboard)
    // Assigning (not addEventListener) means re-attaching never doubles up.
    input.onmidimessage = (e) => handleMessage(e, name)
    if (input.state === 'connected') {
      devices.push({ id: input.id, name, manufacturer: input.manufacturer || '', keyboard })
    }
  })
  const outputs: MIDIOutput[] = []
  access.outputs.forEach((o) => {
    if (o.state === 'connected') outputs.push(o)
  })
  const info = (p: MIDIPort) => ({ id: p.id, name: p.name || '', manufacturer: p.manufacturer || '' })
  const picked = pickOutput(devices, outputs.map(info))
  const port = picked ? (outputs.find((o) => o.id === picked.id) ?? null) : null
  setPianoOutput(port)
  set({ devices, output: port?.name ?? null })
}

export const useMidi = create<MidiState>((set, get) => ({
  status:
    isNativeApp() || (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) ? 'idle' : 'unsupported',
  devices: [],
  output: null,
  async connect() {
    const { status } = get()
    if (status === 'unsupported' || status === 'requesting' || status === 'ready') return
    set({ status: 'requesting', error: undefined })
    try {
      // The Android app has no Web MIDI: its native plugin stands in for it.
      access = isNativeApp() ? await requestNativeMidiAccess() : await navigator.requestMIDIAccess({ sysex: false })
      // Hot-plugged or Bluetooth devices that (re)connect show up here.
      access.onstatechange = () => attachInputs(set)
      attachInputs(set)
      set({ status: 'ready' })
    } catch (err) {
      set({ status: 'denied', error: err instanceof Error ? err.message : String(err) })
    }
  },
}))
