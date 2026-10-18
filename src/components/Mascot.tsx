import { motion, type TargetAndTransition } from 'motion/react'
import { useEffect, useState } from 'react'
import type { CostumeId } from '../progress/wardrobe'
import { useProfile } from '../state/profile'

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
  /** Dress-up: the detective hat and magnifier of Kulak Dedektifi. */
  outfit?: 'detective'
  /** Kostüm dolabı: the costume to wear; by default the one picked in the wardrobe (`null` = none). */
  costume?: CostumeId | null
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

/** Deerstalker hat and a magnifying glass; the lens fogs up on a sad mood and glints on a happy one. */
function DetectiveOutfit({ mood }: { mood: MascotMood }) {
  const fog = mood === 'sad'
  const glint = mood === 'happy' || mood === 'cheer'
  return (
    <g>
      {/* hat: crown, brim peaks front and back, ear flap and a bow on top */}
      <path d="M28 46 q4 -22 30 -24 q24 0 28 20 z" fill="#a0703c" transform="rotate(-10 58 40)" />
      <path d="M24 47 q-10 2 -12 8 q12 2 22 -4 z" fill="#7d5328" transform="rotate(-10 58 40)" />
      <path d="M84 41 q10 -2 14 3 q-10 4 -18 1 z" fill="#7d5328" transform="rotate(-10 58 40)" />
      <path d="M36 30 q20 -6 42 4" stroke="#7d5328" strokeWidth={3} fill="none" transform="rotate(-10 58 40)" />
      <circle cx={56} cy={22} r={3.5} fill="#7d5328" />
      {/* magnifier in the right hand */}
      <line x1={99} y1={92} x2={107} y2={78} stroke="#5a3a1a" strokeWidth={5} strokeLinecap="round" />
      <circle cx={110} cy={70} r={11} fill={fog ? '#e6e9ee' : '#dff4ff'} opacity={fog ? 0.95 : 0.7} />
      <circle cx={110} cy={70} r={11} fill="none" stroke="#5a3a1a" strokeWidth={3.5} />
      {glint && <path d="M104 66 q3 -5 8 -5" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" />}
      {fog && (
        <g fill="#b9c0cc">
          <circle cx={107} cy={68} r={2} />
          <circle cx={113} cy={73} r={1.6} />
        </g>
      )}
    </g>
  )
}

/** Kostüm dolabı: each costume drawn on the 120×120 Notiş (the head's top is near (58, 42)). */
function Costume({ id, mood }: { id: CostumeId; mood: MascotMood }) {
  switch (id) {
    case 'party':
      return (
        <g transform="rotate(-14 52 40)">
          <path d="M38 44 L52 6 L66 44 z" fill="#ff6fa8" />
          <path d="M42 34 L62 34 M45 24 L59 24 M48 15 L56 15" stroke="#ffd84d" strokeWidth={4} />
          <circle cx={52} cy={6} r={5} fill="#ffd84d" />
        </g>
      )
    case 'flower':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={30 + Math.cos((a * Math.PI) / 180) * 6}
              cy={45 + Math.sin((a * Math.PI) / 180) * 6}
              r={5}
              fill="#ff8fc8"
            />
          ))}
          <circle cx={30} cy={45} r={4} fill="#ffd84d" />
        </g>
      )
    case 'scarf':
      return (
        <g>
          <path d="M24 95 q34 16 70 -6 l2 9 q-38 22 -74 5 z" fill="#ff4b4b" />
          <path d="M30 100 l-6 18 l9 2 l4 -17 z" fill="#ff4b4b" />
          <path d="M36 99 l70 -9" stroke="#fff" strokeWidth={2} strokeDasharray="4 5" opacity={0.7} />
        </g>
      )
    case 'bow':
      return (
        <g>
          <path d="M58 100 l-15 -8 v16 z" fill="#1cb0f6" />
          <path d="M58 100 l15 -8 v16 z" fill="#1cb0f6" />
          <circle cx={58} cy={100} r={4} fill="#0a86c2" />
        </g>
      )
    case 'glasses':
      return (
        <g>
          <rect x={31} y={58} width={26} height={16} rx={7} fill="#1d1f2b" opacity={0.92} />
          <rect x={60} y={57} width={26} height={16} rx={7} fill="#1d1f2b" opacity={0.92} />
          <path d="M57 64 h3" stroke="#1d1f2b" strokeWidth={3} />
          <path d="M35 62 l7 -1" stroke="#fff" strokeWidth={2} opacity={0.6} strokeLinecap="round" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <path d="M20 70 q2 -46 40 -46 q36 0 38 42" stroke="#2b2f3a" strokeWidth={6} fill="none" />
          <rect x={12} y={62} width={14} height={22} rx={6} fill="#ff4b4b" />
          <rect x={92} y={58} width={14} height={22} rx={6} fill="#ff4b4b" />
          {(mood === 'happy' || mood === 'cheer') && (
            <text x={100} y={44} fontSize={14} fill="#7c4dff">
              ♪
            </text>
          )}
        </g>
      )
    case 'chef':
      return (
        <g transform="rotate(-10 56 36)">
          <rect x={38} y={30} width={36} height={14} rx={3} fill="#fff" stroke="#d8dde6" />
          <circle cx={42} cy={22} r={10} fill="#fff" stroke="#d8dde6" />
          <circle cx={56} cy={16} r={12} fill="#fff" stroke="#d8dde6" />
          <circle cx={70} cy={22} r={10} fill="#fff" stroke="#d8dde6" />
          <rect x={39} y={24} width={34} height={12} fill="#fff" />
        </g>
      )
    case 'detective':
      return <DetectiveOutfit mood={mood} />
    case 'wizard':
      return (
        <g transform="rotate(-12 54 40)">
          <ellipse cx={54} cy={44} rx={26} ry={6} fill="#3b2a8f" />
          <path d="M36 44 Q52 30 54 2 Q60 30 72 44 z" fill="#4b39b8" />
          <text x={48} y={34} fontSize={10} fill="#ffd84d">
            ★
          </text>
          <text x={57} y={22} fontSize={7} fill="#ffd84d">
            ✦
          </text>
        </g>
      )
    case 'crown':
      return (
        <g transform="rotate(-12 56 38)">
          <path
            d="M38 46 L38 26 L47 36 L56 20 L65 36 L74 26 L74 46 z"
            fill="#ffc800"
            stroke="#e0a800"
            strokeWidth={2}
          />
          <circle cx={56} cy={38} r={3} fill="#ff4b4b" />
          <circle cx={45} cy={41} r={2.2} fill="#1cb0f6" />
          <circle cx={67} cy={41} r={2.2} fill="#58cc02" />
        </g>
      )
  }
}

export function Mascot({ mood = 'idle', pulse = 0, size = 120, say, className, outfit, costume }: Props) {
  const picked = useProfile((s) => s.costume)
  // The game's own outfit (Kulak Dedektifi) wins over the wardrobe.
  const wear = outfit ? null : costume === undefined ? picked : costume
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
          {outfit === 'detective' && <DetectiveOutfit mood={mood} />}
          {wear && <Costume id={wear} mood={mood} />}
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
