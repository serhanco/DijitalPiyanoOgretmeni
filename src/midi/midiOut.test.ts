import { describe, expect, it } from 'vitest'
import { pickOutput, portKey } from './midiOut'

const port = (name: string, manufacturer = '') => ({ id: name, name, manufacturer })

describe('portKey', () => {
  it('compares port names without their numbering', () => {
    expect(portKey('Digital Piano')).toBe('digital piano')
    expect(portKey('MIDIOUT2 (Digital Piano)')).toBe('digital piano')
    expect(portKey('MPK mini 3 MIDI 1')).toBe('mpk mini 3')
    expect(portKey('CLP-845 Bluetooth')).toBe('clp-845 bluetooth')
  })
})

describe('pickOutput', () => {
  it('finds the output of a connected piano', () => {
    const out = pickOutput(
      [port('Digital Piano', 'Yamaha Corporation')],
      [port('Microsoft GS Wavetable Synth'), port('MIDIOUT2 (Digital Piano)', 'Yamaha Corporation')],
    )
    expect(out?.name).toBe('MIDIOUT2 (Digital Piano)')
  })

  it('never plays on a silent controller or a virtual port', () => {
    expect(pickOutput([port('MPK mini 3 MIDI 1', 'AKAI')], [port('MPK mini 3 MIDI 1', 'AKAI')])).toBeNull()
    expect(pickOutput([port('Midi Through Port-0')], [port('Midi Through Port-0')])).toBeNull()
  })

  it('needs an input with the same name: an unrelated output stays silent', () => {
    expect(pickOutput([port('Digital Piano', 'Yamaha')], [port('USB Synth')])).toBeNull()
    expect(pickOutput([], [port('Digital Piano', 'Yamaha')])).toBeNull()
  })
})
