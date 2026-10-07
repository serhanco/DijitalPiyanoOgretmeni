import { motion, type TargetAndTransition } from 'motion/react'
import { useEffect, useState } from 'react'

// Notiş: the app's mascot, a little eighth note with a waving flag.

export type MascotMood = 'idle' | 'happy' | 'sad' | 'cheer' | 'sleep' | 'think'

interface Props {
  mood?: MascotMood
  /** Change this to replay the mood's animation (e.g. on every correct answer). */
  pulse?: number
  size?: number
  /** Speech bubble text. */
  say?: string | null
  className?: string
}

const BODY = '#7c4dff'
const BODY_DARK = '#5a2fd6'
const BELLY = '#b49cff'

const bodyMotion: Record<MascotMood, TargetAndTransition> = {
  idle: { y: [0, -3, 0], rotate: 0, scale: 1, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -16, 0], rotate: [0, -6, 0], scale: [1, 1.06, 1], transition: { duration: 0.45, ease: 'easeOut' } },
  sad: { y: [0, 3, 3], rotate: [0, -5, 5, -3, 0], scale: 1, transition: { duration: 0.5 } },
  cheer: {
    y: [0, -22, 0, -14, 0],
    rotate: [0, -8, 8, -4, 0],
    scale: [1, 1.08, 1, 1.04, 1],
    transition: { duration: 1.1, ease: 'easeOut' },
  },
  sleep: { y: [0, 2, 0], rotate: -6, scale: 1, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  think: { y: 0, rotate: [0, 4, 0], scale: 1, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
}

function Eyes({ mood, blink }: { mood: MascotMood; blink: boolean }) {
  if (mood === 'happy' || mood === 'cheer') {
    return (
      <g stroke="#2b1a5c" strokeWidth={4} strokeLinecap="round" fill="none">
        <path d="M37 66 q8 -9 16 0" />
        <path d="M63 66 q8 -9 16 0" />
      </g>
    )
  }
  if (mood === 'sleep' || blink) {
    return (
      <g stroke="#2b1a5c" strokeWidth={4} strokeLinecap="round" fill="none">
        <path d="M37 67 q8 5 16 0" />
        <path d="M63 67 q8 5 16 0" />
      </g>
    )
  }
  const look = mood === 'sad' ? { dx: 0, dy: 3 } : mood === 'think' ? { dx: 3, dy: -3 } : { dx: 1, dy: 0 }
  return (
    <g>
      {[45, 71].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={66} r={11} fill="#fff" />
          <circle cx={cx + look.dx} cy={66 + look.dy} r={6} fill="#2b1a5c" />
          <circle cx={cx + look.dx + 2} cy={63 + look.dy} r={2} fill="#fff" />
        </g>
      ))}
      {mood === 'sad' && (
        <g stroke="#2b1a5c" strokeWidth={3} strokeLinecap="round">
          <path d="M35 52 l14 4" />
          <path d="M81 52 l-14 4" />
        </g>
      )}
    </g>
  )
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'happy':
    case 'cheer':
      return <path d="M48 80 q10 14 20 0 z" fill="#2b1a5c" stroke="#2b1a5c" strokeWidth={2} strokeLinejoin="round" />
    case 'sad':
      return <path d="M50 86 q8 -7 16 0" stroke="#2b1a5c" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    case 'sleep':
      return <ellipse cx={58} cy={83} rx={4} ry={3} fill="#2b1a5c" />
    case 'think':
      return <path d="M52 84 h12" stroke="#2b1a5c" strokeWidth={3.5} strokeLinecap="round" />
    default:
      return <path d="M50 81 q8 7 16 0" stroke="#2b1a5c" strokeWidth={3.5} fill="none" strokeLinecap="round" />
  }
}

export function Mascot({ mood = 'idle', pulse = 0, size = 120, say, className }: Props) {
  const [blink, setBlink] = useState(false)

  // Blink now and then while idle.
  useEffect(() => {
    if (mood !== 'idle' && mood !== 'think') return
    let t: number
    const loop = () => {
      t = window.setTimeout(
        () => {
          setBlink(true)
          t = window.setTimeout(() => {
            setBlink(false)
            loop()
          }, 140)
        },
        2200 + Math.random() * 2500,
      )
    }
    loop()
    return () => clearTimeout(t)
  }, [mood])

  const armsUp = mood === 'cheer'

  return (
    <div className={`mascot ${className ?? ''}`} style={{ width: size }}>
      {say && (
        <motion.div
          key={say}
          className="mascot-say"
          initial={{ opacity: 0, x: '-50%', y: 6, scale: 0.9 }}
          animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          {say}
        </motion.div>
      )}
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Notiş">
        <ellipse cx={58} cy={112} rx={30} ry={5} fill="rgb(0 0 0 / 0.12)" />
        <motion.g key={`${mood}-${pulse}`} animate={bodyMotion[mood]} style={{ originX: 0.5, originY: 1 }}>
          {/* stem and flag */}
          <rect x={88} y={12} width={7} height={62} rx={3.5} fill={BODY_DARK} />
          <motion.path
            d="M94 13 c14 6 22 16 16 32 c-2 -10 -8 -16 -16 -18 z"
            fill={BODY_DARK}
            animate={{ rotate: [0, -10, 0] }}
            transition={{ duration: mood === 'cheer' ? 0.3 : 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: 0, originY: 0 }}
          />
          {/* arms */}
          <motion.ellipse
            cx={20}
            cy={78}
            rx={7}
            ry={12}
            fill={BODY_DARK}
            animate={{ rotate: armsUp ? -140 : 20 }}
            style={{ originX: 0.5, originY: 0.1 }}
          />
          <motion.ellipse
            cx={96}
            cy={80}
            rx={7}
            ry={12}
            fill={BODY_DARK}
            animate={{ rotate: armsUp ? 140 : -20 }}
            style={{ originX: 0.5, originY: 0.1 }}
          />
          {/* body: a tilted note head */}
          <ellipse cx={58} cy={74} rx={40} ry={33} fill={BODY} transform="rotate(-12 58 74)" />
          <ellipse cx={58} cy={84} rx={22} ry={15} fill={BELLY} opacity={0.55} transform="rotate(-12 58 84)" />
          <Eyes mood={mood} blink={blink} />
          <circle cx={33} cy={80} r={5} fill="#ff8fb1" opacity={0.7} />
          <circle cx={84} cy={78} r={5} fill="#ff8fb1" opacity={0.7} />
          <Mouth mood={mood} />
        </motion.g>
        {mood === 'sleep' && (
          <motion.text
            x={92}
            y={48}
            fontSize={16}
            fontWeight={900}
            fill={BODY_DARK}
            animate={{ y: [48, 30], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            z
          </motion.text>
        )}
        {mood === 'cheer' &&
          [
            [14, 26],
            [104, 54],
            [24, 104],
          ].map(([x, y], i) => (
            <motion.text
              key={i}
              x={x}
              y={y}
              fontSize={16}
              animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: i * 0.2, repeat: 1 }}
            >
              ✨
            </motion.text>
          ))}
      </svg>
    </div>
  )
}
