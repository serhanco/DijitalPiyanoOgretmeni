import { useEffect, useState } from 'react'
import { speak, stopSpeaking } from '../audio/speech'
import type { GameIntro as Intro } from '../games/intro'
import { pauseGame, resumeGame } from '../input/gameClock'
import { useSettings } from '../state/settings'
import { Mascot } from './Mascot'

/** One step lights up after another: Notiş shows one move of the game. */
const STEP_MS = 900

interface Props {
  intro: Intro
  onDone: () => void
}

/**
 * Oyun arası Notiş: the rule of a game the first time it opens. The game waits
 * behind it (the game clock is paused) until the learner taps "Hadi oynayalım".
 */
export function GameIntro({ intro, onDone }: Props) {
  const narration = useSettings((s) => s.narration)
  const [lit, setLit] = useState(0)

  useEffect(() => {
    pauseGame()
    return () => resumeGame()
  }, [])

  useEffect(() => {
    if (narration) speak(intro.rule)
    return () => stopSpeaking()
  }, [intro, narration])

  // The steps light up one by one, once.
  useEffect(() => {
    if (lit >= intro.steps.length) return
    const t = window.setTimeout(() => setLit((n) => n + 1), lit === 0 ? 400 : STEP_MS)
    return () => clearTimeout(t)
  }, [lit, intro.steps.length])

  return (
    <div className="game-intro" role="dialog" aria-modal="true" aria-labelledby="game-intro-title">
      <section className="card game-intro-card">
        <Mascot mood={lit >= intro.steps.length ? 'cheer' : 'happy'} pulse={lit} size={84} />
        <h2 id="game-intro-title">{intro.name}</h2>
        <p className="game-intro-rule">{intro.rule}</p>
        <ol className="game-intro-steps" data-lit={lit}>
          {intro.steps.map(([icon, text], i) => (
            <li key={text} className={i < lit ? 'on' : ''}>
              <span className="game-intro-icon" aria-hidden>
                {icon}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <button className="btn game-intro-go" onClick={onDone} autoFocus>
          Hadi oynayalım!
        </button>
      </section>
    </div>
  )
}
