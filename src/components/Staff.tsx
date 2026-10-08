import { useEffect, useRef, useState } from 'react'
import { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from 'vexflow/bravura'
import type { Clef } from '../music/notes'
import { isBlackKey, vexKey } from '../music/notes'
import { setStaffViewBox, staffBand, useCompactLandscape } from './staffCrop'

interface StaffProps {
  clef: Clef
  /** Note to draw, or null for an empty staff. */
  note: number | null
  /** Colour of the note head, e.g. green after a correct answer. */
  color?: string
  /** Draw the grand staff (treble above bass); the note goes on `noteClef`. */
  grand?: boolean
  noteClef?: Clef
}

const WIDTH = 260
const HEIGHT = 170
const GRAND_HEIGHT = 215
/** Grand staff: top of each stave (its lines start 40 px lower). */
const GRAND_Y: Record<Clef, number> = { treble: 0, bass: 95 }
/** Landscape phone: room kept above and below the lines (the clef, notes on up to two ledger lines). */
const CROP_PAD = 32

let fontsReady: Promise<unknown> | null = null
function waitForFonts() {
  fontsReady ??= document.fonts ? document.fonts.load('30px Bravura').catch(() => undefined) : Promise.resolve()
  return fontsReady
}

export function Staff({ clef, note, color, grand = false, noteClef }: StaffProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const compact = useCompactLandscape()

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
    const height = grand ? GRAND_HEIGHT : HEIGHT
    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(WIDTH, height)
    const ctx = renderer.getContext()
    const onClef = grand ? (noteClef ?? clef) : clef
    let stave: Stave
    let shown: Stave[]
    if (grand) {
      const staves = {
        treble: new Stave(24, GRAND_Y.treble, WIDTH - 34).addClef('treble'),
        bass: new Stave(24, GRAND_Y.bass, WIDTH - 34).addClef('bass'),
      }
      staves.treble.setContext(ctx).draw()
      staves.bass.setContext(ctx).draw()
      for (const type of [StaveConnector.type.BRACE, StaveConnector.type.SINGLE_LEFT, StaveConnector.type.SINGLE_RIGHT])
        new StaveConnector(staves.treble, staves.bass).setType(type).setContext(ctx).draw()
      stave = staves[onClef]
      shown = [staves.treble, staves.bass]
    } else {
      stave = new Stave(10, 30, WIDTH - 20)
      stave.addClef(clef).setContext(ctx).draw()
      shown = [stave]
    }

    const drawn: StaveNote[] = []
    if (note !== null) {
      const sn = new StaveNote({ keys: [vexKey(note)], duration: 'w', clef: onClef, alignCenter: true })
      if (isBlackKey(note)) sn.addModifier(new Accidental('#'), 0)
      if (color) sn.setStyle({ fillStyle: color, strokeStyle: color })
      const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables([sn])
      new Formatter().joinVoices([voice]).format([voice], WIDTH - 110)
      voice.draw(ctx, stave)
      drawn.push(sn)
    }

    // Let CSS scale the drawing to the available width.
    const svg = el.querySelector('svg')
    if (svg) {
      setStaffViewBox(svg, WIDTH, height, compact ? staffBand(shown, drawn, CROP_PAD, 6) : undefined)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.removeProperty('width')
      svg.style.removeProperty('height')
      svg.setAttribute('role', 'img')
      svg.setAttribute(
        'aria-label',
        note === null
          ? 'Boş porte'
          : grand
            ? `${onClef === 'treble' ? 'Üst' : 'Alt'} portede bir nota`
            : 'Porte üzerinde bir nota',
      )
    }
  }, [clef, note, color, fontsLoaded, grand, noteClef, compact])

  return <div className="staff" ref={ref} />
}
