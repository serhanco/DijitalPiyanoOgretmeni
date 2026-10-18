// What every arcade screen adds around its game: the combo ("🔥 7"), the
// surprises ("💨 Rüzgâr!") and, in the Oyun Salonu, the record to beat.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Surprise } from '../../games/arcade/ramp'
import type { LessonKind } from '../../games/noteHunter/lessons'
import type { ArcadeStats } from '../../games/noteHunter/summary'

/** A run this long sets the game on fire: a glow around it and a flame on the HUD. */
export const FEVER_AT = 5

export type SurpriseFx = 'wind' | 'storm' | 'rush' | 'meteor'

const SURPRISES: Partial<Record<LessonKind, { fx: SurpriseFx; text: string }>> = {
  bird: { fx: 'wind', text: '💨 Rüzgâr! Borular hızlandı, her geçiş 2 puan.' },
  balloon: { fx: 'storm', text: '⛈️ Fırtına! Balonlar hızlı uçuyor, her balon 2 puan.' },
  bar: { fx: 'rush', text: '🔔 Kalabalık saat! Müşteriler acele ediyor, her içecek 2 puan.' },
  train: { fx: 'rush', text: '🚄 Ekspres! Tren hızlandı, her vagon 2 puan.' },
  chef: { fx: 'rush', text: '⏱️ Acele sipariş! Her yemek 2 puan.' },
  space: { fx: 'meteor', text: '☄️ Meteor yağmuru! İstilacılar hızlı, her atış 2 puan.' },
  chordbar: { fx: 'rush', text: '🔔 Kalabalık saat! Her akor 2 puan.' },
}

export function useCombo() {
  const [combo, setCombo] = useState(0)
  const best = useRef(0)
  const hit = useCallback(() => {
    setCombo((c) => {
      best.current = Math.max(best.current, c + 1)
      return c + 1
    })
  }, [])
  const miss = useCallback(() => setCombo(0), [])
  const bestCombo = useCallback(() => best.current, [])
  return { combo, bestCombo, hit, miss }
}

/** Watches the game's surprise clock; `onChange` says when a surprise starts or ends. */
export function useSurprise(
  game: { surprise: Surprise },
  kind: LessonKind,
  onChange: (text: string | null) => void,
): SurpriseFx | null {
  const [active, setActive] = useState(false)
  const was = useRef(false)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = game.surprise.active
      if (now === was.current) return
      was.current = now
      setActive(now)
      onChangeRef.current(now ? (SURPRISES[kind]?.text ?? null) : null)
    }, 150)
    return () => clearInterval(t)
  }, [game, kind])
  return active ? (SURPRISES[kind]?.fx ?? 'rush') : null
}

export function arcadeStats(game: { score: number; surprise: Surprise }, bestCombo: number): ArcadeStats {
  return { score: game.score, bestCombo, surprises: game.surprise.count }
}
