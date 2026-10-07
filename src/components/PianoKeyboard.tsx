import { useEffect, useRef, useState } from 'react'
import { heldNotes, noteOff, noteOn, subscribe } from '../input/inputBus'
import { isBlackKey, solfegeName } from '../music/notes'

export type KeyMark = 'correct' | 'wrong' | 'hint'

interface PianoKeyboardProps {
  low: number
  high: number
  marks?: Partial<Record<number, KeyMark>>
  showLabels?: boolean
}

/** Touch/mouse keyboard. It also lights up keys pressed on the MIDI or computer keyboard. */
export function PianoKeyboard({ low, high, marks = {}, showLabels = true }: PianoKeyboardProps) {
  const [held, setHeld] = useState<Set<number>>(() => new Set(heldNotes()))
  const pointers = useRef(new Map<number, number>())

  useEffect(
    () =>
      subscribe((e) =>
        setHeld((prev) => {
          const next = new Set(prev)
          if (e.type === 'on') next.add(e.midi)
          else next.delete(e.midi)
          return next
        }),
      ),
    [],
  )

  const whites: number[] = []
  for (let n = low; n <= high; n++) if (!isBlackKey(n)) whites.push(n)
  const whiteWidth = 100 / whites.length

  const press = (midi: number, pointerId: number) => {
    const prev = pointers.current.get(pointerId)
    if (prev === midi) return
    if (prev !== undefined) noteOff(prev, 'screen')
    pointers.current.set(pointerId, midi)
    noteOn(midi, 'screen')
  }
  const release = (pointerId: number) => {
    const prev = pointers.current.get(pointerId)
    if (prev === undefined) return
    pointers.current.delete(pointerId)
    noteOff(prev, 'screen')
  }

  const keyProps = (midi: number) => ({
    'data-midi': midi,
    'data-mark': marks[midi],
    'data-held': held.has(midi) || undefined,
    'aria-label': solfegeName(midi),
    role: 'button',
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
      press(midi, e.pointerId)
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (pointers.current.has(e.pointerId)) press(midi, e.pointerId)
    },
  })

  return (
    <div
      className="keyboard"
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onPointerLeave={(e) => release(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {whites.map((midi) => (
        <div key={midi} className="key white" style={{ width: `${whiteWidth}%` }} {...keyProps(midi)}>
          {showLabels && <span className="key-label">{solfegeName(midi, false)}</span>}
        </div>
      ))}
      {whites.map((midi, i) =>
        midi + 1 <= high && isBlackKey(midi + 1) ? (
          <div
            key={midi + 1}
            className="key black"
            style={{ left: `${(i + 1) * whiteWidth - whiteWidth * 0.3}%`, width: `${whiteWidth * 0.6}%` }}
            {...keyProps(midi + 1)}
          />
        ) : null,
      )}
    </div>
  )
}
