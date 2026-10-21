// MIDI in the Android app. The Android WebView has no Web MIDI, so this
// builds a small stand-in for navigator.requestMIDIAccess() on top of the
// native NativeMidi plugin (android/.../NativeMidiPlugin.java): midiStore and
// midiOut use it exactly like the browser's MIDIAccess.

import type { PluginListenerHandle } from '@capacitor/core'
import { splitMidi } from './splitMidi'

interface NativeDevice {
  id: number
  name: string
  manufacturer: string
  inputs: number
  outputs: number
  bluetooth: boolean
}

export interface BluetoothFound {
  address: string
  name: string
}

interface NativeMidiPlugin {
  listDevices(): Promise<{ available: boolean; devices: NativeDevice[] }>
  send(o: { id: number; data: number[] }): Promise<void>
  scanBluetooth(o: { seconds: number }): Promise<void>
  stopScan(): Promise<void>
  connectBluetooth(o: { address: string }): Promise<void>
  keepAwake(o: { on: boolean }): Promise<void>
  addListener(
    event: 'message',
    fn: (e: { id: number; data: number[]; ageMs: number }) => void,
  ): Promise<PluginListenerHandle>
  addListener(event: 'devices', fn: () => void): Promise<PluginListenerHandle>
  addListener(event: 'bluetoothFound', fn: (e: BluetoothFound) => void): Promise<PluginListenerHandle>
}

declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean }
  }
}

/** True inside the Android app (Capacitor puts its bridge on window before the page runs). */
export const isNativeApp = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

let plugin: Promise<NativeMidiPlugin> | null = null
function native(): Promise<NativeMidiPlugin> {
  plugin ??= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin<NativeMidiPlugin>('NativeMidi'))
  return plugin
}

type MessageHandler = ((e: { data: Uint8Array; timeStamp: number }) => void) | null

class NativeInput {
  readonly type = 'input'
  state: 'connected' | 'disconnected' = 'connected'
  onmidimessage: MessageHandler = null
  readonly running = { status: 0 }
  readonly id: string
  readonly name: string
  readonly manufacturer: string
  constructor(id: string, name: string, manufacturer: string) {
    this.id = id
    this.name = name
    this.manufacturer = manufacturer
  }
}

class NativeOutput {
  readonly type = 'output'
  state: 'connected' | 'disconnected' = 'connected'
  readonly id: string
  readonly name: string
  readonly manufacturer: string
  private readonly deviceId: number
  private readonly plugin: NativeMidiPlugin
  constructor(id: string, name: string, manufacturer: string, deviceId: number, plugin: NativeMidiPlugin) {
    this.id = id
    this.name = name
    this.manufacturer = manufacturer
    this.deviceId = deviceId
    this.plugin = plugin
  }

  /** Like MIDIOutput.send: a timestamp on performance.now() schedules the message. */
  send(data: number[], timestamp?: number) {
    const go = () => void this.plugin.send({ id: this.deviceId, data: [...data] }).catch(() => undefined)
    const wait = timestamp === undefined ? 0 : timestamp - performance.now()
    if (wait > 2) window.setTimeout(go, wait)
    else go()
  }
}

class NativeAccess {
  readonly inputs = new Map<string, NativeInput>()
  readonly outputs = new Map<string, NativeOutput>()
  onstatechange: (() => void) | null = null
  private readonly plugin: NativeMidiPlugin
  constructor(plugin: NativeMidiPlugin) {
    this.plugin = plugin
  }

  async refresh() {
    const { devices } = await this.plugin.listDevices()
    const seen = new Set<string>()
    for (const d of devices) {
      const key = String(d.id)
      seen.add(key)
      if (d.outputs > 0 && !this.inputs.has(key)) this.inputs.set(key, new NativeInput(key, d.name, d.manufacturer))
      if (d.inputs > 0 && !this.outputs.has(key))
        this.outputs.set(key, new NativeOutput(key, d.name, d.manufacturer, d.id, this.plugin))
    }
    for (const port of [...this.inputs.values(), ...this.outputs.values()])
      port.state = seen.has(port.id) ? 'connected' : 'disconnected'
    this.onstatechange?.()
  }

  receive(e: { id: number; data: number[]; ageMs: number }) {
    const input = this.inputs.get(String(e.id))
    if (!input?.onmidimessage) return
    const timeStamp = performance.now() - e.ageMs
    for (const msg of splitMidi(e.data, input.running)) input.onmidimessage({ data: Uint8Array.from(msg), timeStamp })
  }
}

let access: NativeAccess | null = null

/** The Android app's MIDIAccess. */
export async function requestNativeMidiAccess(): Promise<MIDIAccess> {
  if (!access) {
    const p = await native()
    const a = new NativeAccess(p)
    const { available } = await p.listDevices()
    if (!available) throw new Error('Bu cihazda MIDI yok')
    await p.addListener('message', (e) => a.receive(e))
    await p.addListener('devices', () => void a.refresh())
    await a.refresh()
    access = a
  }
  return access as unknown as MIDIAccess
}

/** Look for Bluetooth MIDI pianos for `seconds`; `onFound` gets each one (repeats included). */
export async function scanBluetooth(onFound: (d: BluetoothFound) => void, seconds = 12): Promise<() => void> {
  const p = await native()
  const handle = await p.addListener('bluetoothFound', onFound)
  await p.scanBluetooth({ seconds })
  return () => {
    void handle.remove()
    void p.stopScan()
  }
}

export async function connectBluetooth(address: string): Promise<void> {
  const p = await native()
  await p.connectBluetooth({ address })
  await access?.refresh()
}

export async function keepAwakeNative(on: boolean): Promise<void> {
  if (!isNativeApp()) return
  const p = await native()
  await p.keepAwake({ on }).catch(() => undefined)
}
