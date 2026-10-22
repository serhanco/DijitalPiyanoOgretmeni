import { motion, useReducedMotion } from 'motion/react'
import { Mascot } from './Mascot'

interface Props {
  side: 'left' | 'right'
  /** The node's zigzag offset, as for a scenery prop. */
  offset: number
  /** Back from a lesson: Notiş hops in to the next lesson. */
  hop: boolean
  /** A unit just finished: Notiş dances. */
  cheer: boolean
}

/** Notiş standing on the map beside the lesson to play next, in the costume picked in the wardrobe. */
export function MapNotis({ side, offset, hop, cheer }: Props) {
  const reduced = useReducedMotion()
  return (
    <motion.span
      className="map-notis"
      aria-hidden
      style={{ '--dir': side === 'left' ? -1 : 1, '--off': `${offset}px` } as React.CSSProperties}
      initial={hop && !reduced ? { y: -90, scale: 0.5, opacity: 0 } : false}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 12, delay: 0.6 }}
    >
      <Mascot size={58} mood={cheer ? 'cheer' : 'idle'} pulse={cheer ? 1 : 0} />
    </motion.span>
  )
}
