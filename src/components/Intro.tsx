import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { sfx } from '../audio/sfx'
import { isNativeApp } from '../midi/nativeMidi'
import { Mascot } from './Mascot'

/** How long the opening plays before the map shows. */
const INTRO_MS = 950
/** The keys pressed in turn: Do, Mi, Sol of a one-octave keyboard (white key indices). */
const PRESSED = [0, 2, 4]

/**
 * Açılış: Notiş hops out of a piano key while Do-Mi-Sol are pressed, then the map shows. Under a second; a tap
 * skips it. Browsers keep sound off until the first tap, so the chord sounds in the Android app or on that tap.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (isNativeApp()) sfx.hello()
    const t = window.setTimeout(() => setLeaving(true), INTRO_MS)
    return () => clearTimeout(t)
  }, [])

  const skip = () => {
    if (!leaving && !isNativeApp()) sfx.hello()
    setLeaving(true)
  }

  return (
    <motion.div
      className="opening"
      role="presentation"
      onPointerDown={skip}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.25 }}
      onAnimationComplete={() => leaving && onDone()}
      data-opening
    >
      <div className="opening-stage">
        <motion.div
          className="opening-notis"
          initial={{ y: 70, scale: 0.4, opacity: 0 }}
          animate={{ y: [70, -34, 0], scale: [0.4, 1.08, 1], opacity: 1 }}
          transition={{ duration: 0.6, times: [0, 0.6, 1], ease: 'easeOut', delay: 0.1 }}
        >
          <Mascot size={110} mood="happy" />
        </motion.div>
        <div className="opening-keys" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="opening-key"
              style={
                PRESSED.includes(i) ? { animationDelay: `${0.2 + PRESSED.indexOf(i) * 0.13}s` } : { animation: 'none' }
              }
            />
          ))}
          {[0, 1, 3, 4, 5].map((i) => (
            <span key={`b${i}`} className="opening-black" style={{ left: `${((i + 1) / 8) * 100}%` }} />
          ))}
        </div>
        <p className="opening-title">Piyano Öğretmeni</p>
      </div>
    </motion.div>
  )
}
