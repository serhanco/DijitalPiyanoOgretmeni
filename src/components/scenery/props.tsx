// The things that stand by the path in each unit's scenery (`scenes.ts`), drawn like the icon set:
// round shapes, the shared outline, Notiş's eyes and cheeks on the ones with a face. 48 × 48 each.

import type { ReactNode } from 'react'
import {
  BLUE,
  CREAM,
  DARK_RED,
  GOLD,
  GREEN,
  GREY,
  INK,
  LEAF,
  LILAC,
  line,
  ORANGE,
  PAPER,
  PINK,
  PURPLE,
  RED,
  SKY,
  TEAL,
  WOOD,
  WOOD_LIGHT,
  YELLOW,
} from '../icons/palette'
import { Cheek, Eye, Head, Smile } from '../icons/parts'

const PINE = '#2e9e5b'
const PINE_DARK = '#1f7a45'
const STONE = '#a7b0ba'
const SNOW = '#f4f8ff'

export type PropName =
  | 'plant'
  | 'lamp'
  | 'stand'
  | 'flower'
  | 'tree'
  | 'cloud'
  | 'cactus'
  | 'rock'
  | 'volcano'
  | 'wave'
  | 'lighthouse'
  | 'gull'
  | 'palm'
  | 'sun'
  | 'campfire'
  | 'hill'
  | 'bridge'
  | 'mountain'
  | 'pine'
  | 'flag'
  | 'planet'
  | 'star'
  | 'comet'
  | 'lamppost'
  | 'building'
  | 'moon'
  | 'curtain'
  | 'spotlight'
  | 'house'
  | 'fence'
  | 'mushroom'
  | 'snowpine'
  | 'snowman'

export const PROPS: Record<PropName, ReactNode> = {
  plant: (
    <g>
      <path
        d="M24 28 q-12 -4 -14 -16 q10 2 14 12 M24 28 q12 -6 13 -18 q-10 3 -13 14 M24 28 V14"
        fill={LEAF}
        {...line}
      />
      <path d="M14 28 h20 l-3 16 h-14 z" fill={ORANGE} {...line} />
      <Eye x={20} y={35} r={2.2} />
      <Eye x={28} y={35} r={2.2} />
    </g>
  ),
  lamp: (
    <g>
      <path d="M14 18 l4 -12 h12 l4 12 z" fill={YELLOW} {...line} />
      <path d="M24 18 v22 M16 44 h16" {...line} strokeWidth={2.6} />
      <path d="M12 20 l-4 4 M36 20 l4 4 M24 22 v3" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  ),
  stand: (
    <g>
      <rect x={8} y={6} width={32} height={20} rx={2} fill={PAPER} {...line} />
      <g {...line} strokeWidth={1.2} opacity={0.5}>
        <path d="M12 11 h24 M12 15 h24 M12 19 h24" />
      </g>
      <Head x={20} y={15} rx={2.4} ry={1.8} fill={INK} />
      <Head x={29} y={11} rx={2.4} ry={1.8} fill={INK} />
      <path d="M24 26 v14 M14 44 l10 -4 l10 4" fill="none" {...line} strokeWidth={2.4} />
    </g>
  ),
  flower: (
    <g>
      <path d="M24 26 V44 M24 38 q-7 -1 -9 -7 q7 0 9 7" fill={LEAF} {...line} />
      <g fill={PINK} {...line}>
        <circle cx={24} cy={10} r={6} />
        <circle cx={33} cy={17} r={6} />
        <circle cx={29} cy={27} r={6} />
        <circle cx={19} cy={27} r={6} />
        <circle cx={15} cy={17} r={6} />
      </g>
      <circle cx={24} cy={19} r={6} fill={YELLOW} {...line} />
      <Smile x={24} y={20} w={3.5} />
    </g>
  ),
  tree: (
    <g>
      <path d="M21 30 h6 v14 h-6 z" fill={WOOD} {...line} />
      <path
        d="M24 4 q10 0 12 9 q7 3 5 11 q-2 8 -10 7 q-3 3 -7 2 q-4 1 -7 -2 q-8 1 -10 -7 q-2 -8 5 -11 q2 -9 12 -9 z"
        fill={GREEN}
        {...line}
      />
      <circle cx={17} cy={16} r={2} fill={RED} />
      <circle cx={30} cy={22} r={2} fill={RED} />
      <circle cx={27} cy={12} r={2} fill={RED} />
    </g>
  ),
  cloud: (
    <g>
      <path d="M10 34 q-7 0 -7 -7 q0 -7 8 -7 q1 -9 11 -9 q8 0 10 7 q11 -1 11 8 q0 8 -9 8 z" fill={PAPER} {...line} />
      <Eye x={19} y={25} r={2} />
      <Eye x={27} y={25} r={2} />
      <Cheek x={15} y={29} />
      <Cheek x={31} y={29} />
    </g>
  ),
  cactus: (
    <g>
      <path d="M19 44 V14 q0 -7 5 -7 q5 0 5 7 v30 z" fill={GREEN} {...line} />
      <path d="M19 30 h-5 q-4 0 -4 -4 v-8 q0 -3 3 -3 q3 0 3 3 v6 h3" fill={GREEN} {...line} />
      <path d="M29 26 h5 q4 0 4 -4 v-6 q0 -3 -3 -3 q-3 0 -3 3 v4 h-3" fill={GREEN} {...line} />
      <circle cx={24} cy={8} r={2.6} fill={PINK} {...line} strokeWidth={1.2} />
      <Eye x={22} y={20} r={1.8} />
      <Eye x={27} y={20} r={1.8} />
      <Smile x={24.5} y={25} w={3} />
      <path d="M12 44 h24" {...line} />
    </g>
  ),
  rock: (
    <g>
      <path d="M6 42 q-1 -12 8 -18 q6 -8 14 -5 q11 2 13 14 q1 6 0 9 z" fill={STONE} {...line} />
      <path d="M15 28 q4 -4 8 -3" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      <path d="M6 42 h36" {...line} />
    </g>
  ),
  volcano: (
    <g>
      <path d="M3 44 L17 14 h14 L45 44 z" fill={WOOD} {...line} />
      <path d="M17 14 q3 6 7 2 q4 6 7 -2" fill={ORANGE} {...line} strokeWidth={1.6} />
      <path d="M18 8 q-3 -5 3 -6 q2 -4 6 -1 q6 -1 5 5" fill={GREY} opacity={0.7} {...line} strokeWidth={1.4} />
    </g>
  ),
  wave: (
    <g>
      <path d="M3 34 q6 -12 14 -4 q8 -12 15 -2 q7 -10 13 0 v12 h-42 z" fill={BLUE} {...line} />
      <path d="M8 34 q4 -4 8 0 M24 32 q4 -4 8 0" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </g>
  ),
  lighthouse: (
    <g>
      <path d="M17 44 l3 -30 h8 l3 30 z" fill={PAPER} {...line} />
      <path d="M18.6 30 h10.8 l0.6 6 h-12 z M19.6 20 h8.8 l0.4 4 h-9.6 z" fill={RED} />
      <path d="M17 44 l3 -30 h8 l3 30 z" fill="none" {...line} />
      <rect x={19} y={7} width={10} height={7} rx={1} fill={YELLOW} {...line} />
      <path d="M18 7 l6 -4 l6 4" fill={RED} {...line} />
      <path d="M10 44 h28" {...line} />
    </g>
  ),
  gull: (
    <g>
      <path d="M4 22 q10 -8 20 4 q10 -12 20 -4" fill="none" {...line} strokeWidth={3} />
      <circle cx={24} cy={27} r={4} fill={PAPER} {...line} />
      <path d="M28 27 l4 1 l-4 1" fill={ORANGE} {...line} strokeWidth={1} />
    </g>
  ),
  palm: (
    <g>
      <path d="M22 44 q-1 -16 4 -28" fill="none" {...line} strokeWidth={5} stroke={WOOD} />
      <path d="M22 44 q-1 -16 4 -28" fill="none" {...line} strokeWidth={0.8} />
      <path
        d="M26 16 q-10 -8 -20 -2 q10 -1 20 2 q-6 -9 0 -14 q2 8 0 14 q8 -9 18 -6 q-10 2 -18 6 q12 -2 16 8 q-9 -6 -16 -8"
        fill={GREEN}
        {...line}
      />
      <circle cx={24} cy={18} r={2.4} fill={WOOD_LIGHT} {...line} strokeWidth={1.2} />
      <circle cx={28} cy={19} r={2.4} fill={WOOD_LIGHT} {...line} strokeWidth={1.2} />
      <path d="M12 44 h24" {...line} />
    </g>
  ),
  sun: (
    <g>
      <g stroke={ORANGE} strokeWidth={3} strokeLinecap="round">
        <path d="M24 2 v6 M24 40 v6 M2 24 h6 M40 24 h6 M8.5 8.5 l4 4 M35.5 35.5 l4 4 M8.5 39.5 l4 -4 M35.5 12.5 l4 -4" />
      </g>
      <circle cx={24} cy={24} r={12} fill={YELLOW} {...line} />
      <Eye x={20} y={22} r={2.2} />
      <Eye x={28} y={22} r={2.2} />
      <Smile x={24} y={28} w={5} />
      <Cheek x={17} y={27} />
      <Cheek x={31} y={27} />
    </g>
  ),
  campfire: (
    <g>
      <path d="M8 42 l32 -6 M8 36 l32 6" {...line} strokeWidth={4} stroke={WOOD} />
      <path d="M24 8 q8 9 8 17 q0 9 -8 9 q-8 0 -8 -9 q0 -5 4 -8 q0 4 3 5 q-2 -8 1 -14 z" fill={ORANGE} {...line} />
      <path d="M24 22 q4 4 4 7 q0 4 -4 4 q-4 0 -4 -4 q0 -3 4 -7 z" fill={YELLOW} />
    </g>
  ),
  hill: (
    <g>
      <path d="M2 44 q10 -30 22 -30 q12 0 22 30 z" fill={LEAF} {...line} />
      <path d="M14 28 q3 -2 5 0 M28 22 q3 -2 5 0" fill="none" {...line} strokeWidth={1.4} opacity={0.6} />
    </g>
  ),
  bridge: (
    <g>
      <path d="M3 30 q21 -18 42 0" fill="none" {...line} strokeWidth={3} stroke={WOOD} />
      <path d="M3 30 q21 -18 42 0" fill="none" {...line} strokeWidth={0.8} />
      <path d="M3 34 q21 -14 42 0 v4 q-21 -14 -42 0 z" fill={WOOD_LIGHT} {...line} />
      <path d="M10 25 v8 M17 21 v10 M24 20 v10 M31 21 v10 M38 25 v8" {...line} strokeWidth={1.4} />
      <path d="M3 44 q21 -6 42 0" fill="none" stroke={BLUE} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  ),
  mountain: (
    <g>
      <path d="M2 44 L18 12 L26 26 L32 18 L46 44 z" fill={STONE} {...line} />
      <path d="M13 22 L18 12 L23 22 q-3 -2 -5 1 q-2 -3 -5 -1 z" fill={SNOW} {...line} strokeWidth={1.4} />
      <path d="M29 23 L32 18 L36 25 q-2 -1 -3.5 1 q-1.5 -2 -3.5 -1 z" fill={SNOW} {...line} strokeWidth={1.2} />
    </g>
  ),
  pine: (
    <g>
      <path d="M22 38 h4 v6 h-4 z" fill={WOOD} {...line} />
      <path d="M24 3 l9 12 h-5 l9 11 h-6 l9 12 h-32 l9 -12 h-6 l9 -11 h-5 z" fill={PINE} {...line} />
      <path d="M24 9 l-4 6 M24 20 l-6 6" stroke={PINE_DARK} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  ),
  flag: (
    <g>
      <path d="M14 44 V5" {...line} strokeWidth={2.6} />
      <path d="M14 6 q8 -3 14 1 q6 4 14 1 v14 q-8 3 -14 -1 q-6 -4 -14 -1 z" fill={RED} {...line} />
      <path d="M26 10 v8" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={24} cy={18} r={2.2} fill="#fff" />
      <path d="M8 44 h12" {...line} />
    </g>
  ),
  planet: (
    <g>
      <circle cx={24} cy={24} r={12} fill={LILAC} {...line} />
      <path d="M4 30 q20 -18 40 -12 q4 2 -1 5" fill="none" {...line} strokeWidth={2.6} stroke={ORANGE} />
      <Eye x={20} y={23} r={2.2} />
      <Eye x={28} y={22} r={2.2} />
      <Cheek x={18} y={28} />
    </g>
  ),
  star: (
    <g>
      <path
        d="M24 4 l5.5 12 l13 1.5 l-9.7 8.8 l2.7 12.9 l-11.5 -6.6 l-11.5 6.6 l2.7 -12.9 l-9.7 -8.8 l13 -1.5 z"
        fill={YELLOW}
        {...line}
      />
      <Eye x={20.5} y={22} r={2} />
      <Eye x={27.5} y={22} r={2} />
      <Smile x={24} y={27} w={3} />
    </g>
  ),
  comet: (
    <g>
      <path
        d="M4 40 L26 20 M8 44 L28 26 M2 34 L24 16"
        stroke={SKY}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.8}
      />
      <circle cx={31} cy={17} r={9} fill={TEAL} {...line} />
      <path d="M27 13 q3 -3 7 -1" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </g>
  ),
  lamppost: (
    <g>
      <path d="M24 16 V44 M18 44 h12" {...line} strokeWidth={2.6} />
      <path d="M18 16 h12 l-2 -10 h-8 z" fill={YELLOW} {...line} />
      <path d="M17 6 h14" {...line} strokeWidth={2.6} />
      <circle cx={24} cy={12} r={12} fill={YELLOW} opacity={0.18} />
    </g>
  ),
  building: (
    <g>
      <rect x={10} y={8} width={20} height={36} rx={1.5} fill={PURPLE} {...line} />
      <rect x={30} y={20} width={10} height={24} rx={1.5} fill={LILAC} {...line} />
      <g fill={YELLOW}>
        <rect x={14} y={13} width={4} height={5} rx={0.8} />
        <rect x={22} y={13} width={4} height={5} rx={0.8} />
        <rect x={14} y={23} width={4} height={5} rx={0.8} />
        <rect x={22} y={33} width={4} height={5} rx={0.8} />
        <rect x={33} y={26} width={4} height={4} rx={0.8} />
      </g>
    </g>
  ),
  moon: (
    <g>
      <path d="M30 6 a18 18 0 1 0 12 30 a14 14 0 1 1 -12 -30 z" fill={YELLOW} {...line} />
      <path d="M18 30 q2 2 4 0" fill="none" {...line} strokeWidth={1.6} />
      <path d="M14 24 q2 -2 4 0" fill="none" {...line} strokeWidth={1.6} />
      <Cheek x={14} y={30} />
    </g>
  ),
  curtain: (
    <g>
      <path d="M4 4 h40" {...line} strokeWidth={3} stroke={GOLD} />
      <path d="M5 5 q2 20 -1 39 h14 q-8 -12 6 -22 q-6 -9 -4 -17 z" fill={RED} {...line} />
      <path d="M43 5 q-2 20 1 39 h-14 q8 -12 -6 -22 q6 -9 4 -17 z" fill={RED} {...line} />
      <path
        d="M9 10 q1 14 -1 30 M39 10 q-1 14 1 30"
        fill="none"
        stroke={DARK_RED}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </g>
  ),
  spotlight: (
    <g>
      <path d="M20 14 L4 44 h40 L28 14 z" fill={YELLOW} opacity={0.3} />
      <rect x={17} y={4} width={14} height={11} rx={3} fill={GREY} {...line} />
      <ellipse cx={24} cy={15} rx={6} ry={2} fill={YELLOW} {...line} strokeWidth={1.4} />
    </g>
  ),
  house: (
    <g>
      <path d="M8 22 h32 v22 h-32 z" fill={CREAM} {...line} />
      <path d="M4 24 L24 6 L44 24 z" fill={RED} {...line} />
      <rect x={20} y={32} width={8} height={12} rx={1.5} fill={WOOD} {...line} />
      <rect x={11} y={27} width={7} height={6} rx={1} fill={SKY} {...line} strokeWidth={1.4} />
      <rect x={30} y={27} width={7} height={6} rx={1} fill={SKY} {...line} strokeWidth={1.4} />
      <path d="M32 12 v-6 h5 v10" fill={STONE} {...line} />
    </g>
  ),
  fence: (
    <g>
      <path d="M2 24 h44 M2 34 h44" {...line} strokeWidth={3} stroke={WOOD_LIGHT} />
      <g fill={WOOD_LIGHT} {...line}>
        <path d="M6 44 v-26 l3 -4 l3 4 v26 z" />
        <path d="M21 44 v-26 l3 -4 l3 4 v26 z" />
        <path d="M36 44 v-26 l3 -4 l3 4 v26 z" />
      </g>
      <path d="M2 24 h44 M2 34 h44" fill="none" {...line} strokeWidth={0.8} />
    </g>
  ),
  mushroom: (
    <g>
      <path d="M17 26 h14 v14 q0 4 -4 4 h-6 q-4 0 -4 -4 z" fill={CREAM} {...line} />
      <path d="M4 26 q0 -18 20 -18 q20 0 20 18 z" fill={RED} {...line} />
      <g fill="#fff">
        <circle cx={14} cy={18} r={3} />
        <circle cx={26} cy={13} r={2.6} />
        <circle cx={34} cy={20} r={2.4} />
      </g>
      <Eye x={21} y={33} r={1.9} />
      <Eye x={27} y={33} r={1.9} />
    </g>
  ),
  snowpine: (
    <g>
      <path d="M22 38 h4 v6 h-4 z" fill={WOOD} {...line} />
      <path d="M24 3 l9 12 h-5 l9 11 h-6 l9 12 h-32 l9 -12 h-6 l9 -11 h-5 z" fill={PINE_DARK} {...line} />
      <path
        d="M19 10 l5 -6 l5 6 q-3 2 -5 0 q-2 2 -5 0 z M15 21 l5 -6 h8 l5 6 q-4 2 -9 0 q-5 2 -9 0 z"
        fill={SNOW}
        {...line}
        strokeWidth={1.2}
      />
      <path d="M11 33 l6 -7 h14 l6 7 q-6 2 -13 0 q-7 2 -13 0 z" fill={SNOW} {...line} strokeWidth={1.2} />
    </g>
  ),
  snowman: (
    <g>
      <circle cx={24} cy={34} r={10} fill={SNOW} {...line} />
      <circle cx={24} cy={17} r={8} fill={SNOW} {...line} />
      <path d="M16 11 h16 M19 11 v-7 h10 v7" fill={INK} {...line} />
      <path d="M24 18 l6 1.5 l-6 1.5 z" fill={ORANGE} {...line} strokeWidth={1} />
      <circle cx={21} cy={15} r={1.3} fill={INK} />
      <circle cx={27} cy={15} r={1.3} fill={INK} />
      <path d="M17 24 q7 3 14 0" fill="none" stroke={RED} strokeWidth={3} strokeLinecap="round" />
      <circle cx={24} cy={31} r={1.2} fill={INK} />
      <circle cx={24} cy={36} r={1.2} fill={INK} />
    </g>
  ),
}

/** Notiş's hot-air balloon for the key units' banners: the basket carries the key's sign. */
export const BALLOON: ReactNode = (
  <g>
    <path d="M24 2 q16 0 16 15 q0 10 -12 17 h-8 q-12 -7 -12 -17 q0 -15 16 -15 z" fill={PURPLE} {...line} />
    <path d="M24 2 q-6 8 -4 32 M24 2 q6 8 4 32" fill="none" {...line} strokeWidth={1.4} />
    <path d="M10 14 q14 4 28 0" fill="none" stroke={YELLOW} strokeWidth={3} />
    <path d="M20 34 l-2 6 M28 34 l2 6" {...line} strokeWidth={1.4} />
    <rect x={16} y={39} width={16} height={8} rx={2} fill={WOOD_LIGHT} {...line} />
  </g>
)
