import { gameNow, isPaused } from '../../input/gameClock'
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
  /** A long run of right answers: the stage glows (`[data-fever]`). */
  fever?: boolean
  /** A surprise is on: its weather effect over the stage (`[data-surprise]`). */
  surprise?: string | null
}

/** A Pixi canvas that fills its container and runs a scene. */
export function PixiStage({ create, className, children, fever, surprise }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const createRef = useRef(create)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const app = new Application()
    let scene: Scene | null = null
    let cancelled = false
    let ready = false
    // Pixi's resizeTo only listens to window resizes; layouts change without one.
    const observer = new ResizeObserver(() => {
      if (ready && !cancelled) app.resize()
    })
    observer.observe(el)

    app
      .init({
        resizeTo: el,
        backgroundAlpha: 0,
        antialias: true,
        // Keeps the last frame readable, so a test note's screenshot shows the game.
        preserveDrawingBuffer: true,
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
        // The container may have changed size while Pixi was starting (the observer ignored it then).
        app.resize()
        scene = createRef.current(app)
        app.ticker.add((t) => {
          if (!isPaused()) scene?.tick(Math.min(t.deltaMS, 100), gameNow())
        })
      })
      .catch((err) => console.error('Could not start the game canvas', err))

    return () => {
      cancelled = true
      observer.disconnect()
      scene?.destroy?.()
      if (ready) app.destroy(true, { children: true })
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className ?? 'pixi-stage'}
      data-fever={fever || undefined}
      data-surprise={surprise ?? undefined}
    >
      {children}
    </div>
  )
}
