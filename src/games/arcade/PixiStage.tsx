import { Application } from 'pixi.js'
import { type ReactNode, useEffect, useRef } from 'react'

export interface Scene {
  /** Called every frame with the elapsed milliseconds. */
  tick: (dtMs: number, now: number) => void
  destroy?: () => void
}

interface Props {
  /** Build the scene once the Pixi application is ready. */
  create: (app: Application) => Scene
  className?: string
  /** Overlays drawn above the canvas (e.g. SVG text), positioned in canvas pixels. */
  children?: ReactNode
}

/** A Pixi canvas that fills its container and runs a scene. */
export function PixiStage({ create, className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const createRef = useRef(create)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const app = new Application()
    let scene: Scene | null = null
    let cancelled = false
    let ready = false

    app
      .init({
        resizeTo: el,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      })
      .then(() => {
        ready = true
        if (cancelled) {
          app.destroy(true, { children: true })
          return
        }
        el.appendChild(app.canvas)
        scene = createRef.current(app)
        app.ticker.add((t) => scene?.tick(Math.min(t.deltaMS, 100), performance.now()))
      })
      .catch((err) => console.error('Could not start the game canvas', err))

    return () => {
      cancelled = true
      scene?.destroy?.()
      if (ready) app.destroy(true, { children: true })
    }
  }, [])

  return (
    <div ref={ref} className={className ?? 'pixi-stage'}>
      {children}
    </div>
  )
}
