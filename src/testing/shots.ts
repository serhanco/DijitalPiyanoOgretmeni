import Dexie, { type EntityTable } from 'dexie'

// Screenshots of test notes, by note id. A database of their own: they are large,
// stay on this device and never travel with the progress code.

interface ShotRow {
  id: string
  blob: Blob
}

const shotsDb = new Dexie('dpo-test-shots') as Dexie & { shots: EntityTable<ShotRow, 'id'> }
shotsDb.version(1).stores({ shots: 'id' })

export const saveShot = (id: string, blob: Blob) => shotsDb.shots.put({ id, blob })
export const loadShot = async (id: string) => (await shotsDb.shots.get(id))?.blob ?? null
export const deleteShot = (id: string) => shotsDb.shots.delete(id)
export const clearShots = () => shotsDb.shots.clear()

/**
 * VexFlow adds the Bravura music font through the FontFace API, which the screenshot
 * cannot see; a stylesheet rule with the same font makes it part of the picture.
 */
async function embedMusicFont(): Promise<void> {
  if (document.getElementById('dpo-shot-bravura')) return
  // Not in vexflow's package exports, but the same module its bravura entry loads.
  // @ts-expect-error: the file ships without its own declaration next to it.
  const { Bravura } = (await import('../../node_modules/vexflow/build/esm/src/fonts/bravura.js')) as { Bravura: string }
  const style = document.createElement('style')
  style.id = 'dpo-shot-bravura'
  style.textContent = `@font-face { font-family: 'Bravura'; src: url(${Bravura}); font-display: block; }`
  document.head.appendChild(style)
}

/** A JPEG of what is on screen now (the visible part), or null when it cannot be taken. */
export async function captureScreen(): Promise<Blob | null> {
  try {
    const { domToBlob } = await import('modern-screenshot')
    await embedMusicFont()
    const root = document.body
    const shot = domToBlob(root, {
      type: 'image/jpeg',
      quality: 0.72,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff',
      style: { transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`, margin: '0' },
      // Leave the test tools themselves out of the picture.
      filter: (node) => !(node instanceof Element && node.closest('.test-tools')),
    })
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000))
    return await Promise.race([shot, timeout])
  } catch (err) {
    console.warn('Screenshot failed', err)
    return null
  }
}
