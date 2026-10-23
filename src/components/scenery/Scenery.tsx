import { PROPS, type PropName } from './props'

/**
 * One thing standing by the map's path, beside a lesson node: on the side away from the node, which is
 * moved sideways by `offset` px (the zigzag), so it lines up with the path's middle.
 */
export function SceneProp({ name, side, offset }: { name: PropName; side: 'left' | 'right'; offset: number }) {
  return (
    <svg
      className="scene-prop"
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
      data-prop={name}
      style={{ '--dir': side === 'left' ? -1 : 1, '--off': `${offset}px` } as React.CSSProperties}
    >
      {PROPS[name]}
    </svg>
  )
}

/** Notiş's balloon on a key unit's banner, with the key signature on a sign: "2♯", "3♭", "♮". */
export function KeyBalloon({ sign }: { sign: string }) {
  return (
    <span className="unit-balloon" aria-hidden>
      <svg viewBox="0 0 48 48" className="balloon-svg">
        {PROPS.balloon}
      </svg>
      <span className="key-sign">{sign}</span>
    </span>
  )
}
