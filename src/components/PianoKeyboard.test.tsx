import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { heldNotes } from '../input/inputBus'
import { PianoKeyboard } from './PianoKeyboard'

beforeAll(() => {
  // jsdom has no ResizeObserver; the keyboard only uses it to see whether it scrolls.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(cleanup)

const C4 = 60
const G4 = 67

describe('PianoKeyboard', () => {
  it('releases a key whose finger lifts outside the keyboard', () => {
    render(<PianoKeyboard low={C4} high={72} />)
    fireEvent.pointerDown(screen.getByLabelText('Sol4'), { pointerId: 1 })
    expect(heldNotes()).toContain(G4)
    fireEvent.pointerUp(window, { pointerId: 1 })
    expect(heldNotes()).not.toContain(G4)
  })

  it('releases a key still down when the keyboard goes away, so the next lesson starts clean', () => {
    const first = render(<PianoKeyboard low={C4} high={72} />)
    fireEvent.pointerDown(screen.getByLabelText('Sol4'), { pointerId: 2 })
    expect(heldNotes()).toContain(G4)
    first.unmount()
    expect(heldNotes()).not.toContain(G4)
    const next = render(<PianoKeyboard low={C4} high={72} />)
    expect(next.container.querySelector('.key[data-held]')).toBeNull()
  })
})
