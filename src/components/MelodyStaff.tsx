// A page of a melody in quarter notes (VexFlow), on one staff or on the
// grand staff. Played steps turn green, the current step is blue.

import { useEffect, useRef, useState } from 'react'
import {
  Accidental,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  type Tickable,
  Voice,
} from 'vexflow/bravura'
import type { Step } from '../games/melody/session'
import { type Clef, isBlackKey, vexKey } from '../music/notes'

export type StepState = 'done' | 'current' | 'todo'

interface Props {
  steps: Step[]
  states: StepState[]
  /** Keys of the current step already played (the other hand is still due). */
  hit: number[]
  clef: Clef
  grand?: boolean
  /** Flash the current step red. */
  wrong?: boolean
}

const WIDTH = 360
const HEIGHT = 140
const GRAND_HEIGHT = 230
const GRAND_Y: Record<Clef, number> = { treble: 5, bass: 105 }

const COLORS = { done: '#22a559', current: '#1cb0f6', wrong: '#ff4b4b', todo: '#2b2f3a' }

let fontsReady: Promise<unknown> | null = null
function waitForFonts() {
  fontsReady ??= document.fonts ? document.fonts.load('30px Bravura').catch(() => undefined) : Promise.resolve()
  return fontsReady
}

export function MelodyStaff({ steps, states, hit, clef, grand = false, wrong = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    waitForFonts().then(() => alive && setFontsLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  const key = JSON.stringify([steps, states, hit, clef, grand, wrong])

  useEffect(() => {
    const el = ref.current
    if (!el || !fontsLoaded) return
    el.innerHTML = ''
    const height = grand ? GRAND_HEIGHT : HEIGHT
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(WIDTH, height)
    const ctx = renderer.getContext()

    const clefs: Clef[] = grand ? ['treble', 'bass'] : [clef]
    const staves = clefs.map((c) => {
      const stave = grand ? new Stave(24, GRAND_Y[c], WIDTH - 32) : new Stave(8, 20, WIDTH - 16)
      stave.addClef(c).setContext(ctx).draw()
      return stave
    })
    if (grand)
      for (const type of [StaveConnector.type.BRACE, StaveConnector.type.SINGLE_LEFT, StaveConnector.type.SINGLE_RIGHT])
        new StaveConnector(staves[0], staves[1]).setType(type).setContext(ctx).draw()

    const voices = clefs.map((c) => {
      const tickables: Tickable[] = steps.map((step, i) => {
        const notes = step.notes.filter((n) => n.clef === c).sort((a, b) => a.midi - b.midi)
        if (!notes.length) return new GhostNote({ duration: 'q' })
        const sn = new StaveNote({ keys: notes.map((n) => vexKey(n.midi)), duration: 'q', clef: c, autoStem: true })
        notes.forEach((n, k) => isBlackKey(n.midi) && sn.addModifier(new Accidental('#'), k))
        const state = states[i]
        const color = state === 'current' && wrong ? COLORS.wrong : COLORS[state]
        sn.setStyle({ fillStyle: color, strokeStyle: color })
        if (state === 'current')
          notes.forEach(
            (n, k) => hit.includes(n.midi) && sn.setKeyStyle(k, { fillStyle: COLORS.done, strokeStyle: COLORS.done }),
          )
        return sn
      })
      return new Voice({ numBeats: Math.max(1, steps.length), beatValue: 4 }).setStrict(false).addTickables(tickables)
    })
    // One formatter for both staves keeps the hands' notes in line.
    const formatter = new Formatter()
    for (const v of voices) formatter.joinVoices([v])
    formatter.format(voices, WIDTH - (grand ? 100 : 80))
    voices.forEach((v, i) => v.draw(ctx, staves[i]))

    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${WIDTH} ${height}`)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.removeProperty('width')
      svg.style.removeProperty('height')
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', 'Çalınacak melodi')
    }
    // `key` stands for every prop the drawing reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fontsLoaded])

  return <div className="staff" ref={ref} />
}
