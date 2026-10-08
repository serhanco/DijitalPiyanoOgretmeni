import { useEffect, useRef, useState } from 'react'
import { heldNotes, noteOff, noteOn, subscribe } from '../input/inputBus'
import { isBlackKey, MIN_KEYBOARD_WHITES, solfegeName } from '../music/notes'

export type KeyMark = 'correct' | 'wrong' | 'hint'

interface PianoKeyboardProps {
  low: number
  high: number
  marks?: Partial<Record<number, KeyMark>>
  showLabels?: boolean
  /** Keys to keep in view when the keyboard is wider than the screen and scrolls (e.g. the next notes). */
  focus?: number[]
}

/** White keys never get narrower than this; a wider keyboard scrolls sideways instead. */
export const MIN_WHITE_KEY_PX = 28

/** Touch/mouse keyboard. It also lights up keys pressed on the MIDI or computer keyboard. */
export function PianoKeyboard({ low, high, marks = {}, showLabels = true, focus }: PianoKeyboardProps) {
  const [held, setHeld] = useState<Set<number>>(() => new Set(heldNotes()))
  const pointers = useRef(new Map<number, number>())
  const scroller = useRef<HTMLDivElement>(null)
  const [scrolls, setScrolls] = useState(false)

  useEffect(() => {
    const box = scroller.current
    if (!box) return
    const check = () => setScrolls(box.scrollWidth > box.clientWidth + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(box)
    return () => observer.disconnect()
  }, [low, high])

  // A scrolling keyboard brings the keys that matter into view: the next notes, else the marked keys.
  const wanted = (focus?.length ? focus : Object.keys(marks).map(Number)).join(' ')
  useEffect(() => {
    const box = scroller.current
    if (!box || !scrolls || !wanted) return
    const boxLeft = box.getBoundingClientRect().left - box.scrollLeft
    const spans = wanted
      .split(' ')
      .map((m) => box.querySelector(`.key[data-midi="${m}"]`)?.getBoundingClientRect())
      .filter((r) => r !== undefined)
    if (!spans.length) return
    const left = Math.min(...spans.map((r) => r.left)) - boxLeft
    const right = Math.max(...spans.map((r) => r.right)) - boxLeft
    if (left >= box.scrollLeft && right <= box.scrollLeft + box.clientWidth) return
    box.scrollTo({ left: (left + right) / 2 - box.clientWidth / 2, behavior: 'smooth' })
  }, [wanted, scrolls])

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
      // Let a finger slide to the next key (touch captures the pointer by default).
      const el = e.currentTarget as HTMLElement
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
      press(midi, e.pointerId)
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (pointers.current.has(e.pointerId)) press(midi, e.pointerId)
    },
  })

  return (
    <div className="keyboard-scroll" ref={scroller} data-scrolls={scrolls || undefined}>
      <div
        className="keyboard"
        data-octave={whites.length <= MIN_KEYBOARD_WHITES || undefined}
        style={{ minWidth: `${whites.length * MIN_WHITE_KEY_PX}px` }}
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
    </div>
  )
}
