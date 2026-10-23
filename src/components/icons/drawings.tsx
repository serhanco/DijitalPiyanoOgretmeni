// The app's own icon set, drawn in Notiş's style: round shapes, a dark purple outline, two-tone fills,
// and the same eyes (white, dark pupil, a glint) and pink cheeks on every character. Every drawing sits in
// a 48 × 48 box and reads on a coloured map node, on a card and in the dark theme alike.

import type { ReactNode } from 'react'
import type { LessonKind } from '../../games/noteHunter/lessons'

import {
  BLUE,
  INK,
  CREAM,
  DARK_RED,
  GOLD,
  GREEN,
  GREY,
  LEAF,
  LILAC,
  ORANGE,
  PAPER,
  PINK,
  PURPLE,
  RED,
  SILVER,
  SKY,
  TEAL,
  WOOD,
  WOOD_LIGHT,
  YELLOW,
  line,
} from './palette'
import { Cheek, Eye, Head, Smile } from './parts'

export type IconName =
  | LessonKind
  | 'lock'
  | 'review'
  | 'salon'
  | 'etudes'
  | 'streak'
  | 'xp'
  | 'units'
  | 'settings'
  | 'profile'
  | 'quests'
  | 'chest'
  | 'keyboard'

export const DRAWINGS: Record<IconName, ReactNode> = {
  // Teori: an open book with a note on its right page.
  theory: (
    <g>
      <path d="M24 13 q-9 -5 -19 -1 v25 q10 -4 19 1 z" fill={PAPER} {...line} />
      <path d="M24 13 q9 -5 19 -1 v25 q-10 -4 -19 1 z" fill={CREAM} {...line} />
      <g {...line} strokeWidth={1.5} opacity={0.55}>
        <path d="M9 18 q6 -2 11 0" />
        <path d="M9 23 q6 -2 11 0" />
        <path d="M9 28 q6 -2 11 0" />
      </g>
      <path d="M35 17 v12" {...line} />
      <path d="M35 17 q4 1 5 5" fill="none" {...line} />
      <Head x={32} y={30} rx={3.8} ry={3} />
    </g>
  ),
  // Nota avı: Notiş himself, small.
  drill: (
    <g>
      <path d="M31 33 V7 q8 3 9 12" fill="none" {...line} strokeWidth={3} />
      <ellipse cx={22} cy={33} rx={11} ry={9} transform="rotate(-18 22 33)" fill={PURPLE} {...line} />
      <ellipse cx={19} cy={37} rx={5} ry={3} transform="rotate(-18 19 37)" fill={LILAC} opacity={0.7} />
      <Eye x={18} y={31} r={3} />
      <Eye x={25.5} y={29} r={3} />
      <Cheek x={14.5} y={35} />
      <Cheek x={29} y={33} />
    </g>
  ),
  // Melodi: two beamed eighths.
  melody: (
    <g>
      <path d="M17 34 V12 L37 7 V30" fill="none" {...line} strokeWidth={2.6} />
      <path d="M17 12 L37 7 v5 L17 17 z" fill="currentColor" />
      <Head x={12.5} y={35} />
      <Head x={32.5} y={31} fill={BLUE} />
    </g>
  ),
  // Nota Kuşu: a round yellow bird with a note tuft.
  bird: (
    <g>
      <path d="M22 9 v6" {...line} />
      <circle cx={20.5} cy={9} r={2.4} fill={PURPLE} {...line} strokeWidth={1.4} />
      <ellipse cx={22} cy={27} rx={15} ry={13} fill={YELLOW} {...line} />
      <path d="M12 30 q5 7 12 2 q-6 -3 -12 -2 z" fill={GOLD} {...line} strokeWidth={1.8} />
      <path d="M36 25 l8 2.5 l-8 3 z" fill={ORANGE} {...line} strokeWidth={1.8} />
      <Eye x={29} y={22} r={3.6} />
      <Cheek x={32} y={29} />
    </g>
  ),
  // Nota Barmeni: a fruity drink with a straw and a slice of orange.
  bar: (
    <g>
      <path d="M30 6 l-4 16" {...line} strokeWidth={2.4} stroke={RED} />
      <path d="M10 15 h28 l-4 25 q0 3 -3 3 h-14 q-3 0 -3 -3 z" fill={SKY} {...line} opacity={0.35} />
      <path d="M11.5 23 h25 l-2.9 17 q0 3 -3 3 h-14 q-3 0 -3 -3 z" fill={PINK} />
      <path d="M10 15 h28 l-4 25 q0 3 -3 3 h-14 q-3 0 -3 -3 z" fill="none" {...line} />
      <circle cx={38} cy={15} r={6} fill={ORANGE} {...line} />
      <path d="M38 15 l0 -5 M38 15 l4 3 M38 15 l-4 3" {...line} strokeWidth={1.2} stroke={CREAM} />
      <Eye x={19} y={31} r={2.4} />
      <Eye x={28} y={31} r={2.4} />
      <Smile x={23.5} y={36} />
    </g>
  ),
  // Balon Patlatma: a red balloon with a passenger basket.
  balloon: (
    <g>
      <path d="M24 32 q-2 5 1 9" fill="none" {...line} strokeWidth={1.6} />
      <path d="M24 4 q14 0 14 14 q0 10 -14 15 q-14 -5 -14 -15 q0 -14 14 -14 z" fill={RED} {...line} />
      <path d="M17 11 q3 -3 7 -3" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
      <path d="M22 33 h4 l-1 2 h-2 z" fill={DARK_RED} {...line} strokeWidth={1.4} />
      <rect x={20} y={40} width={9} height={5} rx={1.5} fill={WOOD_LIGHT} {...line} strokeWidth={1.6} />
    </g>
  ),
  // Ritim: a wooden metronome mid-swing.
  rhythm: (
    <g>
      <path d="M17 6 h14 l8 37 h-30 z" fill={WOOD} {...line} />
      <path d="M19.5 10 h9 l5 27 h-19 z" fill={CREAM} {...line} strokeWidth={1.5} />
      <path d="M24 37 L32 12" {...line} strokeWidth={2.4} />
      <rect
        x={27}
        y={18}
        width={6}
        height={4}
        rx={1}
        transform="rotate(20 30 20)"
        fill={PURPLE}
        {...line}
        strokeWidth={1.4}
      />
      <circle cx={24} cy={37} r={2} fill={INK} />
    </g>
  ),
  // Dino Koşusu: a green dino head with back spikes.
  dino: (
    <g>
      <path d="M8 42 v-14 q0 -16 15 -18 h9 q10 0 10 9 v4 q0 4 -4 4 h-12 v15 z" fill={GREEN} {...line} />
      <path d="M12 22 l-4 -2 l3 -3 M13 15 l-3 -4 l5 -1" fill={LEAF} {...line} strokeWidth={1.6} />
      <path d="M27 27 h10" {...line} strokeWidth={1.6} />
      <path d="M30 27 v2 M34 27 v2" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={39} cy={15} r={1} fill={INK} />
      <Eye x={29} y={17} r={3.4} />
      <Cheek x={22} y={22} />
    </g>
  ),
  // Ritim Davulcusu: a drum with crossed sticks.
  drum: (
    <g>
      <path d="M8 22 v14 q16 9 32 0 v-14" fill={RED} {...line} />
      <path
        d="M8 26 l5 9 l5 -8 l6 9 l6 -9 l5 8 l5 -9"
        fill="none"
        stroke={CREAM}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <ellipse cx={24} cy={22} rx={16} ry={6} fill={CREAM} {...line} />
      <path d="M14 6 l14 15 M36 5 l-13 16" {...line} strokeWidth={2.4} />
      <circle cx={14} cy={6} r={2.6} fill={WOOD_LIGHT} {...line} strokeWidth={1.4} />
      <circle cx={36} cy={5} r={2.6} fill={WOOD_LIGHT} {...line} strokeWidth={1.4} />
    </g>
  ),
  // Gamlar: keys climbing step by step.
  scale: (
    <g>
      <rect x={5} y={14} width={38} height={26} rx={3} fill={PAPER} {...line} />
      <path d="M12.6 14 v26 M20.2 14 v26 M27.8 14 v26 M35.4 14 v26" {...line} strokeWidth={1.5} />
      <g fill={INK}>
        <rect x={10} y={14} width={5} height={15} rx={1} />
        <rect x={17.6} y={14} width={5} height={15} rx={1} />
        <rect x={32.8} y={14} width={5} height={15} rx={1} />
      </g>
      <g fill={ORANGE} {...line} strokeWidth={1.2}>
        <circle cx={8.8} cy={36} r={2} />
        <circle cx={16.4} cy={34} r={2} />
        <circle cx={24} cy={32} r={2} />
        <circle cx={31.6} cy={34} r={2} />
        <circle cx={39.2} cy={31} r={2} />
      </g>
      <path d="M9 9 L18 6 L27 7.5 L39 3" fill="none" {...line} stroke={ORANGE} strokeWidth={2.4} />
      <path d="M35 2.5 l4.5 0.5 l-2 4" fill="none" {...line} stroke={ORANGE} strokeWidth={2.4} />
    </g>
  ),
  // Gam Merdiveni: a ladder with a note on its top rung.
  ladder: (
    <g>
      <path d="M13 44 L18 6 M33 44 L28 6" {...line} strokeWidth={2.6} stroke={WOOD} />
      <path d="M13 44 L18 6 M33 44 L28 6" fill="none" {...line} strokeWidth={0.8} />
      <path d="M14.2 35 h17.6 M15.4 26 h15.2 M16.6 17 h12.8" {...line} strokeWidth={2.4} />
      <path d="M31 13 V2 q4 1 5 5" fill="none" {...line} />
      <Head x={28} y={13} rx={4} ry={3.2} fill={YELLOW} />
    </g>
  ),
  // Melodi Hafızası: a Simon-style pad of four colours.
  memory: (
    <g>
      <path d="M24 24 V6 a18 18 0 0 1 18 18 z" fill={GREEN} {...line} />
      <path d="M24 24 H42 a18 18 0 0 1 -18 18 z" fill={BLUE} {...line} />
      <path d="M24 24 V42 a18 18 0 0 1 -18 -18 z" fill={YELLOW} {...line} />
      <path d="M24 24 H6 a18 18 0 0 1 18 -18 z" fill={RED} {...line} />
      <circle cx={24} cy={24} r={7} fill={PURPLE} {...line} />
      <path d="M21 26 q3 2 6 0" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={21.5} cy={22.5} r={1.1} fill="#fff" />
      <circle cx={26.5} cy={22.5} r={1.1} fill="#fff" />
    </g>
  ),
  // Akorlar: three notes stacked on one stem.
  chord: (
    <g>
      <g {...line} strokeWidth={1.3} opacity={0.45}>
        <path d="M4 14 h40 M4 21 h40 M4 28 h40 M4 35 h40" />
      </g>
      <path d="M28.5 38 V6" fill="none" {...line} strokeWidth={2.4} />
      <Head x={23.5} y={38} fill={PURPLE} />
      <Head x={23.5} y={31} fill={BLUE} />
      <Head x={23.5} y={24} fill={RED} />
    </g>
  ),
  // Akor Aşçısı: a pot with notes rising as steam.
  chef: (
    <g>
      <path d="M8 24 h32 v12 q0 7 -7 7 h-18 q-7 0 -7 -7 z" fill={RED} {...line} />
      <path d="M5 24 h38" {...line} strokeWidth={3} />
      <path d="M4 28 h4 M40 28 h4" {...line} strokeWidth={2.6} />
      <Eye x={19} y={32} r={2.6} />
      <Eye x={29} y={32} r={2.6} />
      <Smile x={24} y={37} />
      <path d="M17 19 V9 q3 1 4 4" fill="none" {...line} strokeWidth={1.8} />
      <Head x={14.5} y={19} rx={3} ry={2.4} fill={YELLOW} />
      <path d="M31 16 V5 q3 1 4 4" fill="none" {...line} strokeWidth={1.8} />
      <Head x={28.5} y={16} rx={3} ry={2.4} fill={LEAF} />
    </g>
  ),
  // Uzay Savunması: a little rocket.
  space: (
    <g>
      <path d="M18 34 q-3 6 0 11 q3 -2 6 -1 q3 -1 6 1 q3 -5 0 -11 z" fill={ORANGE} {...line} strokeWidth={1.6} />
      <path d="M24 4 q11 8 9 30 h-18 q-2 -22 9 -30 z" fill={PAPER} {...line} />
      <path d="M15 24 l-6 9 v4 l7 -3 M33 24 l6 9 v4 l-7 -3" fill={RED} {...line} />
      <circle cx={24} cy={19} r={5} fill={SKY} {...line} />
      <path d="M22 17 q2 -2 4 0" fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  ),
  // Akor Barmeni: a cocktail glass with an olive.
  chordbar: (
    <g>
      <path d="M7 9 h34 l-17 18 z" fill={TEAL} {...line} />
      <path d="M11 9 h26" stroke={CREAM} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d="M24 27 v12 M16 42 h16" {...line} strokeWidth={2.6} />
      <path d="M29 4 l-8 14" {...line} strokeWidth={1.6} />
      <circle cx={23.5} cy={14} r={3.4} fill={LEAF} {...line} strokeWidth={1.6} />
      <circle cx={24.5} cy={13.5} r={1} fill={RED} />
    </g>
  ),
  // Arpej: notes rolling over an arch.
  arpeggio: (
    <g>
      <path d="M5 38 q19 -40 38 0" fill="none" {...line} strokeWidth={1.6} strokeDasharray="2 4" opacity={0.6} />
      <Head x={8} y={36} rx={4} ry={3.2} fill={PURPLE} />
      <Head x={16} y={21} rx={4} ry={3.2} fill={BLUE} />
      <Head x={24} y={15} rx={4} ry={3.2} fill={TEAL} />
      <Head x={32} y={21} rx={4} ry={3.2} fill={YELLOW} />
      <Head x={40} y={36} rx={4} ry={3.2} fill={RED} />
    </g>
  ),
  // Arpej Sörfü: a surfboard on a curling wave.
  surf: (
    <g>
      <path d="M3 40 q8 -26 26 -26 q12 0 14 10 q-10 -5 -15 3 q-5 9 7 13 z" fill={BLUE} {...line} />
      <path d="M3 40 h42" {...line} />
      <path d="M33 22 q4 -2 8 1" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      <path d="M8 30 l20 -11 q5 -2 3 2 l-20 11 q-5 2 -3 -2 z" fill={YELLOW} {...line} />
      <path d="M12 29 l17 -9" stroke={ORANGE} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  ),
  // Kulak Dedektifi: a magnifier over a note.
  ear: (
    <g>
      <path d="M29 30 l11 11" {...line} strokeWidth={5} stroke={WOOD} />
      <path d="M29 30 l11 11" fill="none" {...line} strokeWidth={0.8} />
      <circle cx={20} cy={20} r={13} fill={SKY} {...line} strokeWidth={3} />
      <path d="M12 15 q3 -5 9 -6" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
      <path d="M22.5 25 V13 q3 1 4 4" fill="none" {...line} strokeWidth={1.8} />
      <Head x={19.5} y={25} rx={3.6} ry={2.8} />
    </g>
  ),
  // Nota Şelalesi: notes falling onto the keys.
  waterfall: (
    <g>
      <rect x={6} y={4} width={7} height={16} rx={3.5} fill={BLUE} {...line} />
      <rect x={20.5} y={10} width={7} height={20} rx={3.5} fill={PINK} {...line} />
      <rect x={35} y={2} width={7} height={12} rx={3.5} fill={BLUE} {...line} />
      <rect x={4} y={33} width={40} height={12} rx={2} fill={PAPER} {...line} />
      <path d="M14 33 v12 M24 33 v12 M34 33 v12" {...line} strokeWidth={1.4} />
      <rect x={14.5} y={33.6} width={9} height={10.8} fill={PINK} opacity={0.6} />
    </g>
  ),
  // Etüt: a rolled score.
  etude: (
    <g>
      <path d="M11 8 h28 v30 q0 5 -5 5 h-25 q4 -2 4 -6 v-27 q0 -2 -2 -2" fill={CREAM} {...line} />
      <path d="M7 12 q0 -4 4 -4 q4 0 4 4 v1 h-8 z" fill={WOOD_LIGHT} {...line} />
      <g {...line} strokeWidth={1.2} opacity={0.55}>
        <path d="M18 16 h17 M18 19.5 h17 M18 23 h17 M18 29 h17 M18 32.5 h17 M18 36 h17" />
      </g>
      <Head x={24} y={19.5} rx={2.6} ry={2} fill={INK} />
      <Head x={30} y={32.5} rx={2.6} ry={2} fill={INK} />
    </g>
  ),
  // Boss: a horned monster grinning.
  boss: (
    <g>
      <path d="M12 16 l-4 -11 l10 6 M36 16 l4 -11 l-10 6" fill={YELLOW} {...line} />
      <path d="M8 28 q0 -17 16 -17 q16 0 16 17 v8 q0 7 -7 7 h-18 q-7 0 -7 -7 z" fill={PURPLE} {...line} />
      <Eye x={24} y={24} r={6} />
      <path d="M15 35 q9 6 18 0" fill="#fff" {...line} strokeWidth={1.8} />
      <path d="M19 35.6 l1.5 2.4 l1.5 -2 M26 37.2 l1.5 -2 l1.5 0.6" fill="none" {...line} strokeWidth={1.2} />
      <Cheek x={13} y={30} />
      <Cheek x={35} y={30} />
    </g>
  ),
  // Günün Karışımı: two arrows crossing, a note on each.
  mix: (
    <g>
      <path d="M6 14 h9 q6 0 10 8 l2 4 q4 8 10 8 h4" fill="none" {...line} strokeWidth={3} stroke={BLUE} />
      <path d="M6 34 h9 q6 0 10 -8 l2 -4 q4 -8 10 -8 h4" fill="none" {...line} strokeWidth={3} stroke={ORANGE} />
      <path d="M37 9 l6 5 l-6 5 M37 29 l6 5 l-6 5" fill="none" {...line} strokeWidth={2.4} />
      <Head x={9} y={14} rx={3.4} ry={2.7} fill={BLUE} />
      <Head x={9} y={34} rx={3.4} ry={2.7} fill={ORANGE} />
    </g>
  ),
  // Nota Treni: a smiling locomotive.
  train: (
    <g>
      <path d="M30 6 h6 l-1 9 h-4 z" fill={INK} />
      <rect x={4} y={17} width={30} height={18} rx={4} fill={RED} {...line} />
      <path d="M26 13 h14 v22 h-14 z" fill={DARK_RED} {...line} />
      <rect x={29} y={17} width={8} height={7} rx={1.5} fill={SKY} {...line} strokeWidth={1.6} />
      <path d="M40 35 l5 5 h-11" fill={GREY} {...line} strokeWidth={1.6} />
      <circle cx={11} cy={38} r={5} fill={INK} />
      <circle cx={11} cy={38} r={2} fill={SILVER} />
      <circle cx={26} cy={38} r={5} fill={INK} />
      <circle cx={26} cy={38} r={2} fill={SILVER} />
      <Eye x={12} y={24} r={2.8} />
      <Eye x={20} y={24} r={2.8} />
      <Smile x={16} y={29} />
    </g>
  ),
  // Kayıp Kuş Sesi: a little blue bird singing a note.
  chirp: (
    <g>
      <ellipse cx={20} cy={30} rx={13} ry={12} fill={SKY} {...line} />
      <path d="M9 31 q5 7 11 2 q-5 -4 -11 -2 z" fill={BLUE} {...line} strokeWidth={1.6} />
      <path d="M31 26 l7 -2 l-6 5 l6 2 l-7 1 z" fill={ORANGE} {...line} strokeWidth={1.6} />
      <Eye x={25} y={25} r={3.2} />
      <Cheek x={27} y={32} />
      <path d="M40 15 V4 q3 1 4 4" fill="none" {...line} strokeWidth={1.8} />
      <Head x={37.5} y={15} rx={3.2} ry={2.5} fill={YELLOW} />
    </g>
  ),
  // Kurbağa Atlayışı: a frog with eyes on top.
  frog: (
    <g>
      <ellipse cx={24} cy={31} rx={18} ry={12} fill={GREEN} {...line} />
      <circle cx={15} cy={17} r={6.5} fill={GREEN} {...line} />
      <circle cx={33} cy={17} r={6.5} fill={GREEN} {...line} />
      <Eye x={15} y={17} r={4} />
      <Eye x={33} y={17} r={4} />
      <path d="M14 31 q10 7 20 0" fill="none" {...line} strokeWidth={1.8} />
      <Cheek x={10} y={30} />
      <Cheek x={38} y={30} />
    </g>
  ),
  // Çift Kişilik Davul: two drums, the app's and the learner's.
  duet: (
    <g>
      <path d="M3 22 v12 q10 6 20 0 v-12" fill={WOOD} {...line} />
      <ellipse cx={13} cy={22} rx={10} ry={4.5} fill={CREAM} {...line} />
      <path d="M25 22 v12 q10 6 20 0 v-12" fill={BLUE} {...line} />
      <ellipse cx={35} cy={22} rx={10} ry={4.5} fill={PAPER} {...line} />
      <path d="M10 6 l3 13 M38 6 l-3 13" {...line} strokeWidth={2.2} />
      <circle cx={10} cy={6} r={2.2} fill={WOOD_LIGHT} {...line} strokeWidth={1.4} />
      <circle cx={38} cy={6} r={2.2} fill={WOOD_LIGHT} {...line} strokeWidth={1.4} />
    </g>
  ),
  // A lesson still closed.
  lock: (
    <g>
      <path d="M15 21 v-6 q0 -9 9 -9 q9 0 9 9 v6" fill="none" {...line} strokeWidth={3.4} stroke={GREY} />
      <path d="M15 21 v-6 q0 -9 9 -9 q9 0 9 9 v6" fill="none" {...line} strokeWidth={0.8} />
      <rect x={10} y={20} width={28} height={22} rx={5} fill={SILVER} {...line} />
      <circle cx={24} cy={29} r={3} fill={INK} />
      <path d="M24 30 v6" {...line} strokeWidth={2.6} />
    </g>
  ),
  // Zayıf notalar: a dumbbell.
  review: (
    <g>
      <path d="M12 24 h24" {...line} strokeWidth={3.4} stroke={GREY} />
      <path d="M12 24 h24" fill="none" {...line} strokeWidth={0.8} />
      <rect x={6} y={13} width={7} height={22} rx={2.5} fill={ORANGE} {...line} />
      <rect x={35} y={13} width={7} height={22} rx={2.5} fill={ORANGE} {...line} />
      <rect x={2} y={17} width={5} height={14} rx={2} fill={DARK_RED} {...line} strokeWidth={1.6} />
      <rect x={41} y={17} width={5} height={14} rx={2} fill={DARK_RED} {...line} strokeWidth={1.6} />
    </g>
  ),
  // Oyun Salonu: an arcade joystick.
  salon: (
    <g>
      <path d="M6 34 q0 -6 6 -6 h24 q6 0 6 6 v4 q0 4 -4 4 h-28 q-4 0 -4 -4 z" fill={PURPLE} {...line} />
      <path d="M24 30 V16" {...line} strokeWidth={3} />
      <circle cx={24} cy={12} r={6} fill={RED} {...line} />
      <path d="M21.5 9.5 q2 -1.5 4 -1" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={13} cy={35} r={2.4} fill={YELLOW} {...line} strokeWidth={1.4} />
      <circle cx={35} cy={35} r={2.4} fill={LEAF} {...line} strokeWidth={1.4} />
    </g>
  ),
  // Etüt Kitaplığı: three books on a shelf.
  etudes: (
    <g>
      <rect x={7} y={10} width={9} height={30} rx={1.5} fill={RED} {...line} />
      <rect x={17} y={14} width={9} height={26} rx={1.5} fill={BLUE} {...line} />
      <rect x={27} y={9} width={8} height={31} rx={1.5} fill={TEAL} transform="rotate(12 31 24)" {...line} />
      <path d="M10 17 h3 M20 20 h3" {...line} strokeWidth={1.6} stroke={CREAM} />
      <path d="M4 41 h40" {...line} strokeWidth={3} />
    </g>
  ),
  // Seri: a flame with a face.
  streak: (
    <g>
      <path
        d="M24 4 q4 9 10 13 q6 5 6 13 q0 13 -16 13 q-16 0 -16 -13 q0 -9 7 -14 q0 5 4 7 q-1 -12 5 -19 z"
        fill={ORANGE}
        {...line}
      />
      <path d="M24 22 q7 6 7 12 q0 7 -7 7 q-7 0 -7 -7 q0 -4 3 -6 q1 2 3 2 q-1 -4 1 -8 z" fill={YELLOW} />
      <Eye x={20.5} y={33} r={2.4} />
      <Eye x={27.5} y={33} r={2.4} />
    </g>
  ),
  // XP: a lightning bolt.
  xp: (
    <g>
      <path d="M27 3 l-15 24 h10 l-4 18 l17 -26 h-11 z" fill={YELLOW} {...line} />
      <path d="M23 9 l-6 11" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.75} />
    </g>
  ),
  // Üniteler: a compass.
  units: (
    <g>
      <circle cx={24} cy={24} r={18} fill={PAPER} {...line} />
      <circle cx={24} cy={24} r={13} fill="none" {...line} strokeWidth={1.2} opacity={0.4} />
      <path d="M24 9 l5 15 h-10 z" fill={RED} {...line} strokeWidth={1.6} />
      <path d="M24 39 l-5 -15 h10 z" fill={SILVER} {...line} strokeWidth={1.6} />
      <circle cx={24} cy={24} r={2.4} fill="currentColor" />
    </g>
  ),
  // Ayarlar: a gear.
  settings: (
    <g>
      <path
        d="M21 4 h6 l1 5 l4 2 l4 -3 l4 4 l-3 4 l2 4 l5 1 v6 l-5 1 l-2 4 l3 4 l-4 4 l-4 -3 l-4 2 l-1 5 h-6 l-1 -5 l-4 -2 l-4 3 l-4 -4 l3 -4 l-2 -4 l-5 -1 v-6 l5 -1 l2 -4 l-3 -4 l4 -4 l4 3 l4 -2 z"
        fill={GREY}
        {...line}
      />
      <circle cx={24} cy={24} r={6.5} fill={PAPER} {...line} />
    </g>
  ),
  // Profil: Notiş's face in a circle.
  profile: (
    <g>
      <circle cx={24} cy={24} r={19} fill={PURPLE} {...line} />
      <Eye x={18} y={22} r={4.4} />
      <Eye x={30} y={22} r={4.4} />
      <Smile x={24} y={31} w={7} />
      <Cheek x={13} y={29} />
      <Cheek x={35} y={29} />
    </g>
  ),
  // Görevler: a wrapped gift.
  quests: (
    <g>
      <rect x={7} y={20} width={34} height={22} rx={3} fill={RED} {...line} />
      <rect x={5} y={14} width={38} height={8} rx={2.5} fill={DARK_RED} {...line} />
      <path d="M24 14 v28" stroke={YELLOW} strokeWidth={5} />
      <path d="M24 14 v28" fill="none" {...line} strokeWidth={0.8} />
      <path d="M24 14 q-10 -11 -12 -4 q1 4 12 4 q11 0 12 -4 q-2 -7 -12 4 z" fill={YELLOW} {...line} />
    </g>
  ),
  // Görevler done: the chest open with sparkles.
  chest: (
    <g>
      <path d="M7 24 h34 v15 q0 3 -3 3 h-28 q-3 0 -3 -3 z" fill={WOOD} {...line} />
      <path d="M7 24 l3 -10 h28 l3 10 z" fill={WOOD_LIGHT} {...line} />
      <path d="M13 24 q11 -8 22 0" fill={YELLOW} {...line} strokeWidth={1.6} />
      <rect x={21} y={27} width={6} height={6} rx={1.5} fill={YELLOW} {...line} strokeWidth={1.6} />
      <path
        d="M12 6 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 z"
        fill={YELLOW}
        {...line}
        strokeWidth={1}
      />
      <path
        d="M36 4 l1 2.5 l2.5 1 l-2.5 1 l-1 2.5 l-1 -2.5 l-2.5 -1 l2.5 -1 z"
        fill={YELLOW}
        {...line}
        strokeWidth={1}
      />
    </g>
  ),
  // Klavye: a short keyboard.
  keyboard: (
    <g>
      <rect x={3} y={12} width={42} height={26} rx={4} fill={PURPLE} {...line} />
      <rect x={6} y={17} width={36} height={18} rx={1.5} fill={PAPER} {...line} strokeWidth={1.6} />
      <path d="M12 17 v18 M18 17 v18 M24 17 v18 M30 17 v18 M36 17 v18" {...line} strokeWidth={1.2} />
      <g fill={INK}>
        <rect x={10} y={17} width={4} height={10} rx={1} />
        <rect x={16} y={17} width={4} height={10} rx={1} />
        <rect x={28} y={17} width={4} height={10} rx={1} />
        <rect x={34} y={17} width={4} height={10} rx={1} />
      </g>
    </g>
  ),
}
