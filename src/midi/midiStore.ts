import { create } from 'zustand'
import { noteOff, noteOn } from '../input/inputBus'
import { parseMidiMessage } from './midiMessage'

export type MidiStatus = 'unsupported' | 'idle' | 'requesting' | 'ready' | 'denied'

export interface MidiDevice {
  id: string
  name: string
  manufacturer: string
}

interface MidiState {
  status: MidiStatus
  devices: MidiDevice[]
  error?: string
  connect: () => Promise<void>
}

let access: MIDIAccess | null = null

function handleMessage(e: MIDIMessageEvent) {
  if (!e.data) return
  const msg = parseMidiMessage(e.data)
  if (!msg) return
  // Event timestamps share performance.now()'s clock.
  const time = e.timeStamp || performance.now()
  if (msg.type === 'on') noteOn(msg.midi, 'midi', msg.velocity, time)
  else noteOff(msg.midi, 'midi', time)
}

function attachInputs(set: (s: Partial<MidiState>) => void) {
  if (!access) return
  const devices: MidiDevice[] = []
  access.inputs.forEach((input) => {
    // Assigning (not addEventListener) means re-attaching never doubles up.
    input.onmidimessage = handleMessage
    if (input.state === 'connected') {
      devices.push({
        id: input.id,
        name: input.name || 'MIDI klavye',
        manufacturer: input.manufacturer || '',
      })
    }
  })
  set({ devices })
}

export const useMidi = create<MidiState>((set, get) => ({
  status: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator ? 'idle' : 'unsupported',
  devices: [],
  async connect() {
    const { status } = get()
    if (status === 'unsupported' || status === 'requesting' || status === 'ready') return
    set({ status: 'requesting', error: undefined })
    try {
      access = await navigator.requestMIDIAccess({ sysex: false })
      // Hot-plugged or Bluetooth devices that (re)connect show up here.
      access.onstatechange = () => attachInputs(set)
      attachInputs(set)
      set({ status: 'ready' })
    } catch (err) {
      set({ status: 'denied', error: err instanceof Error ? err.message : String(err) })
    }
  },
}))
