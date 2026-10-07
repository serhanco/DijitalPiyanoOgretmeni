import { animate, motion } from 'motion/react'
import { useEffect, useState } from 'react'

/** A number that counts up from 0 to `value`. */
export function CountUp({ value, prefix = '', duration = 0.9 }: { value: number; prefix?: string; duration?: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const controls = animate(0, value, { duration, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) })
    return () => controls.stop()
  }, [value, duration])
  return (
    <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
      {prefix}
      {shown}
    </motion.span>
  )
}
