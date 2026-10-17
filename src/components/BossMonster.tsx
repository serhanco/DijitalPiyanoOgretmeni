import { motion, type TargetAndTransition } from 'motion/react'
import type { BossLook } from '../games/boss/bosses'

// A unit boss: a round, grumpy-cute monster in Notiş's style, put together
// from its look (colours, eyes, ears, horns, wings, tentacles...). Moods play
// the fight: waiting, hit, angry, laughing when it wins, knocked out.

export type BossMood = 'idle' | 'hurt' | 'angry' | 'laugh' | 'defeated'

interface Props {
  look: BossLook
  name: string
  mood?: BossMood
  /** Change to replay the mood (every hit). */
  pulse?: number
  size?: number
}

const INK = '#2b1a2f'

const bodyMotion: Record<BossMood, TargetAndTransition> = {
  idle: {
    y: [0, -4, 0],
    x: 0,
    rotate: 0,
    scale: 1,
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
  },
  hurt: {
    x: [0, -12, 10, -6, 3, 0],
    rotate: [0, -6, 5, -2, 0],
    scale: [1, 0.9, 1.04, 1],
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  angry: {
    x: [0, -2, 2, -2, 2, 0],
    y: 0,
    scale: [1, 1.08, 1.04],
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  laugh: {
    y: [0, -14, 0, -10, 0, -6, 0],
    rotate: [0, -4, 4, -3, 3, 0],
    transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.4 },
  },
  defeated: {
    // Lies on its side inside the 160-wide drawing (turning about the middle of the body), smaller so the horns and tail stay in view.
    x: [0, 0, 16],
    y: [0, -10, -12],
    rotate: [0, -10, -78],
    scale: [1, 1, 0.66],
    transition: { duration: 0.9, ease: 'easeIn' },
  },
}

function eyeXs(n: BossLook['eyes']): number[] {
  return n === 1 ? [80] : n === 2 ? [64, 96] : [54, 70, 90, 106]
}

function Eyes({ look, mood }: { look: BossLook; mood: BossMood }) {
  const xs = eyeXs(look.eyes)
  const r = look.eyes === 1 ? 15 : look.eyes === 2 ? 11 : 8
  const y = 82
  if (mood === 'defeated')
    return (
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round">
        {xs.map((x) => (
          <g key={x}>
            <path d={`M${x - r * 0.6} ${y - r * 0.6} l${r * 1.2} ${r * 1.2}`} />
            <path d={`M${x + r * 0.6} ${y - r * 0.6} l${-r * 1.2} ${r * 1.2}`} />
          </g>
        ))}
      </g>
    )
  if (mood === 'laugh' || mood === 'hurt')
    return (
      <g stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none">
        {xs.map((x) => (
          <path
            key={x}
            d={
              mood === 'laugh'
                ? `M${x - r * 0.8} ${y + 2} q${r * 0.8} -${r} ${r * 1.6} 0`
                : `M${x - r * 0.8} ${y - r * 0.5} l${r * 0.8} ${r * 0.5} l-${r * 0.8} ${r * 0.5}`
            }
            transform={mood === 'hurt' && x > 80 ? `rotate(180 ${x} ${y})` : undefined}
          />
        ))}
      </g>
    )
  const brow = mood === 'angry' ? 5 : 2
  return (
    <g>
      {xs.map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth={1.5} />
          <circle cx={x + 1} cy={y + 1} r={r * 0.5} fill={mood === 'angry' ? '#c0122f' : INK} />
          <circle cx={x + 2.5} cy={y - 2} r={r * 0.17} fill="#fff" />
          {/* grumpy brows */}
          <path
            d={
              x < 80 || look.eyes === 1
                ? `M${x - r} ${y - r - brow} l${r * 2} ${brow + 3}`
                : `M${x + r} ${y - r - brow} l${-r * 2} ${brow + 3}`
            }
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  )
}

function Mouth({ look, mood }: { look: BossLook; mood: BossMood }) {
  const fangs = look.features.includes('teeth')
  if (mood === 'laugh')
    return (
      <g>
        <path d="M60 104 q20 26 40 0 z" fill={INK} />
        <path d="M70 116 q10 6 20 0 q-10 -6 -20 0" fill="#ff7a93" />
        {fangs && <path d="M64 105 l4 7 l4 -6 M88 105 l4 6 l4 -7" fill="#fff" />}
      </g>
    )
  if (mood === 'defeated')
    return <path d="M66 112 q14 -10 28 0" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
  if (mood === 'hurt') return <ellipse cx={80} cy={110} rx={8} ry={10} fill={INK} />
  return (
    <g>
      <path d="M64 108 q16 -8 32 0" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
      {fangs && <path d="M68 106 l3 8 l4 -9 M85 104 l4 9 l3 -8" fill="#fff" stroke={INK} strokeWidth={1} />}
    </g>
  )
}

/** Wings, tail and spikes: behind the body. */
function Back({ look }: { look: BossLook }) {
  const f = look.features
  return (
    <g fill={look.dark}>
      {f.includes('wings') && (
        <>
          <motion.path
            d="M40 76 q-30 -20 -36 -2 q8 2 10 10 q8 -2 10 8 q8 -4 16 4 z"
            animate={{ rotate: [0, -10, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ originX: 1, originY: 0.5 }}
          />
          <motion.path
            d="M120 76 q30 -20 36 -2 q-8 2 -10 10 q-8 -2 -10 8 q-8 -4 -16 4 z"
            animate={{ rotate: [0, 10, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ originX: 0, originY: 0.5 }}
          />
        </>
      )}
      {f.includes('tail') && (
        <motion.path
          d="M118 120 q30 4 26 -24 q-2 -14 10 -18 q-4 16 4 22 q4 30 -36 30 z"
          animate={{ rotate: [0, 6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: 0, originY: 1 }}
        />
      )}
      {f.includes('spikes') && <path d="M54 54 l8 -18 l8 16 l10 -20 l10 20 l8 -16 l8 18 z" />}
    </g>
  )
}

/** Wavy arms curling out under the body, each swaying on its own. */
function Tentacles({ look }: { look: BossLook }) {
  return (
    <g stroke={look.body} strokeWidth={11} strokeLinecap="round" fill="none">
      {[40, 60, 80, 100, 120].map((x, i) => {
        const dir = x < 80 ? -1 : 1
        return (
          <motion.path
            key={x}
            d={`M${x} 124 q${dir * 4} 14 ${dir * 2} 22 q${-dir * 2} 8 ${dir * 10} 8`}
            animate={{ rotate: [0, i % 2 ? 7 : -7, 0] }}
            transition={{ duration: 1 + i * 0.13, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: 0.5, originY: 0 }}
          />
        )
      })}
    </g>
  )
}

/** Ears, horns, crown, turban and the thief's mask: on the body. */
function Front({ look }: { look: BossLook }) {
  const f = look.features
  return (
    <g>
      {f.includes('catEars') && (
        <g fill={look.dark}>
          <path d="M42 62 l6 -34 l24 22 z" />
          <path d="M118 62 l-6 -34 l-24 22 z" />
          <path d="M48 56 l3 -18 l12 12 z M112 56 l-3 -18 l-12 12 z" fill={look.belly} />
        </g>
      )}
      {f.includes('roundEars') && (
        <g fill={look.dark}>
          <circle cx={46} cy={50} r={13} />
          <circle cx={114} cy={50} r={13} />
          <circle cx={46} cy={50} r={6} fill={look.belly} />
          <circle cx={114} cy={50} r={6} fill={look.belly} />
        </g>
      )}
      {f.includes('horns') && (
        <g fill="#f4ead2" stroke={INK} strokeWidth={1.5}>
          <path d="M52 54 q-14 -14 -6 -34 q4 16 18 26 z" />
          <path d="M108 54 q14 -14 6 -34 q-4 16 -18 26 z" />
        </g>
      )}
      {f.includes('crown') && (
        <g>
          <path
            d="M56 50 l-4 -26 l14 12 l14 -18 l14 18 l14 -12 l-4 26 z"
            fill="#ffc800"
            stroke="#c99400"
            strokeWidth={2}
          />
          <circle cx={80} cy={36} r={4} fill="#ff4b8b" />
        </g>
      )}
      {f.includes('turban') && (
        <g>
          <ellipse cx={80} cy={46} rx={36} ry={16} fill="#ffd34d" stroke="#d9a400" strokeWidth={2} />
          <path d="M50 44 q30 -16 60 0" stroke="#d9a400" strokeWidth={2} fill="none" />
          <circle cx={80} cy={40} r={5} fill="#ff4b8b" />
          <path d="M80 34 q4 -14 12 -12 q-8 2 -8 12" fill="#7c4dff" />
        </g>
      )}
      {f.includes('mask') && <rect x={40} y={70} width={80} height={22} rx={11} fill={INK} opacity={0.85} />}
    </g>
  )
}

export function BossMonster({ look, name, mood = 'idle', pulse = 0, size = 160 }: Props) {
  const ghost = look.shape === 'ghost'
  const tint = mood === 'angry' ? '#ff5a5a' : mood === 'hurt' ? '#ffffff' : null
  return (
    <div className="boss-monster" data-mood={mood} style={{ width: size }}>
      <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label={name}>
        {!ghost && <ellipse cx={80} cy={150} rx={44} ry={6} fill="rgb(0 0 0 / 0.14)" />}
        <motion.g
          key={`${mood}-${pulse}`}
          animate={bodyMotion[mood]}
          style={{ originX: 0.5, originY: mood === 'defeated' ? 0.7 : 0.9 }}
        >
          <motion.g
            animate={ghost && mood !== 'defeated' ? { y: [0, -6, 0] } : { y: 0 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            opacity={ghost && look.features.length === 0 ? 0.88 : 1}
          >
            <Back look={look} />
            {/* arms */}
            <ellipse
              cx={30}
              cy={100}
              rx={9}
              ry={15}
              fill={look.dark}
              transform={`rotate(${mood === 'laugh' ? 40 : 20} 30 100)`}
            />
            <ellipse
              cx={130}
              cy={100}
              rx={9}
              ry={15}
              fill={look.dark}
              transform={`rotate(${mood === 'laugh' ? -40 : -20} 130 100)`}
            />
            {ghost ? (
              <path
                d="M30 92 q0 -50 50 -50 q50 0 50 50 v40 q-8 10 -16 0 q-8 10 -17 0 q-8 10 -17 0 q-8 10 -17 0 q-8 10 -16 0 z"
                fill={look.body}
              />
            ) : (
              <>
                {!look.features.includes('tentacles') && (
                  <>
                    <ellipse cx={58} cy={138} rx={13} ry={8} fill={look.dark} />
                    <ellipse cx={102} cy={138} rx={13} ry={8} fill={look.dark} />
                  </>
                )}
                <ellipse cx={80} cy={94} rx={52} ry={46} fill={look.body} />
                {look.features.includes('tentacles') && <Tentacles look={look} />}
              </>
            )}
            <ellipse cx={80} cy={112} rx={28} ry={18} fill={look.belly} opacity={0.6} />
            <Front look={look} />
            <Eyes look={look} mood={mood} />
            <circle cx={44} cy={102} r={6} fill="#ff8fb1" opacity={0.55} />
            <circle cx={116} cy={102} r={6} fill="#ff8fb1" opacity={0.55} />
            <Mouth look={look} mood={mood} />
            {tint && (
              <motion.ellipse
                cx={80}
                cy={94}
                rx={54}
                ry={48}
                fill={tint}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </motion.g>
        </motion.g>
        {mood === 'defeated' && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            transition={{ delay: 0.8, duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '80px', originY: '104px' }}
          >
            {[0, 120, 240].map((a) => (
              <text
                key={a}
                x={80 + 30 * Math.cos((a * Math.PI) / 180)}
                y={104 + 10 * Math.sin((a * Math.PI) / 180)}
                fontSize={14}
                textAnchor="middle"
              >
                ⭐
              </text>
            ))}
          </motion.g>
        )}
        {mood === 'angry' && (
          <motion.g
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 1, 0], y: -8 }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <path
              d="M38 40 q-6 -10 2 -16 M122 40 q6 -10 -2 -16"
              stroke="#aab"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          </motion.g>
        )}
      </svg>
    </div>
  )
}
