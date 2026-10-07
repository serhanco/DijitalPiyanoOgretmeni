import { useEffect, useRef, useState } from 'react'
import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow/bravura'
import type { Clef } from '../music/notes'
import { isBlackKey, vexKey } from '../music/notes'

interface StaffProps {
  clef: Clef
  /** Note to draw, or null for an empty staff. */
  note: number | null
  /** Colour of the note head, e.g. green after a correct answer. */
  color?: string
}

const WIDTH = 260
const HEIGHT = 170

let fontsReady: Promise<unknown> | null = null
function waitForFonts() {
  fontsReady ??= document.fonts ? document.fonts.load('30px Bravura').catch(() => undefined) : Promise.resolve()
  return fontsReady
}

export function Staff({ clef, note, color }: StaffProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    waitForFonts().then(() => alive && setFontsLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || !fontsLoaded) return
    el.innerHTML = ''
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(WIDTH, HEIGHT)
    const ctx = renderer.getContext()
    const stave = new Stave(10, 30, WIDTH - 20)
    stave.addClef(clef).setContext(ctx).draw()

    if (note !== null) {
      const sn = new StaveNote({ keys: [vexKey(note)], duration: 'w', clef, alignCenter: true })
      if (isBlackKey(note)) sn.addModifier(new Accidental('#'), 0)
      if (color) sn.setStyle({ fillStyle: color, strokeStyle: color })
      const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables([sn])
      new Formatter().joinVoices([voice]).format([voice], WIDTH - 110)
      voice.draw(ctx, stave)
    }

    // Let CSS scale the drawing to the available width.
    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.removeProperty('width')
      svg.style.removeProperty('height')
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', note === null ? 'Boş porte' : 'Porte üzerinde bir nota')
    }
  }, [clef, note, color, fontsLoaded])

  return <div className="staff" ref={ref} />
}
