import { describe, expect, it } from 'vitest'
import { keyboardFor, octaveAdvice } from './keyboards'

describe('keyboardFor', () => {
  it('recognises the Yamaha piano over USB and Bluetooth', () => {
    expect(keyboardFor('Digital Piano', 'Yamaha Corporation')?.id).toBe('yamaha-clp')
    expect(keyboardFor('CLP-845 Bluetooth')?.id).toBe('yamaha-clp')
    expect(keyboardFor('Digital Piano', 'Roland')).toBeNull()
  })

  it('recognises the Akai controller, which needs the app sound', () => {
    const akai = keyboardFor('MPK mini 3 MIDI 1', 'AKAI')
    expect(akai?.id).toBe('akai-mpk-mini')
    expect(akai?.makesSound).toBe(false)
    expect(keyboardFor('Some Keyboard')).toBeNull()
  })
})

describe('octaveAdvice', () => {
  it('is happy when the leftmost key is middle C', () => {
    expect(octaveAdvice(60).ok).toBe(true)
  })

  it('says which OCTAVE button to press and how often', () => {
    expect(octaveAdvice(48).text).toMatch(/Do3.*OCTAVE \+ düğmesine 1 kez/)
    expect(octaveAdvice(84).text).toMatch(/OCTAVE − düğmesine 2 kez/)
    expect(octaveAdvice(62)).toMatchObject({ ok: false })
  })
})
