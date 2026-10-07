import type { Application } from 'pixi.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { BalloonGame } from '../games/arcade/balloon/engine'
import { createBalloonScene } from '../games/arcade/balloon/scene'
import { BirdGame } from '../games/arcade/bird/engine'
import { createBirdScene } from '../games/arcade/bird/scene'
import { PixiStage } from '../games/arcade/PixiStage'
import { noteSkill } from '../games/arcade/skill'
import { type StaffLayout, stepY } from '../games/arcade/staffGeometry'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { type SessionSummary, summarize } from '../games/noteHunter/summary'
import { subscribe } from '../input/inputBus'
import { solfegeName } from '../music/notes'
import { useSettings } from '../state/settings'

// The clef glyph comes from the Bravura music font that VexFlow registers.
void import('vexflow/bravura').then(() => document.fonts?.load('30px Bravura')).catch(() => undefined)

const ARCADE_HEARTS = 3

/** SMuFL clef glyphs (Bravura) and the staff step their origin sits on. */
const CLEF = {
  treble: { glyph: '\uE050', step: 2 },
  bass: { glyph: '\uE062', step: 6 },
}

const HOW_TO: Record<'bird' | 'balloon', string> = {
  bird: 'Borudaki boşluğun notasını çal, kuş oraya uçsun!',
  balloon: 'Balonun üstündeki notayı çal ve patlat!',
}

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

type Game = BirdGame | BalloonGame

export function ArcadeScreen({ lesson, onFinish, onExit }: Props) {
  const kind = lesson.kind === 'balloon' ? 'balloon' : 'bird'
  const { ignoreOctave, showKeyLabels } = useSettings()
  const game: Game = useMemo(() => {
    const skill = noteSkill({ clef: lesson.clef, notes: lesson.notes, length: lesson.length, ignoreOctave })
    return kind === 'bird' ? new BirdGame(skill, ARCADE_HEARTS) : new BalloonGame(skill, ARCADE_HEARTS)
  }, [lesson, kind, ignoreOctave])

  // Let the browser smoke test read the current target.
  useEffect(() => {
    ;(window as unknown as { __dpoArcade?: Game }).__dpoArcade = game
  }, [game])

  const [hud, setHud] = useState({ score: 0, hearts: ARCADE_HEARTS, progress: 0 })
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [flash, setFlash] = useState<{ midi: number; mark: KeyMark } | null>(null)
  const [message, setMessage] = useState(HOW_TO[kind])
  const [staff, setStaff] = useState<StaffLayout | null>(null)
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const react = useCallback(
    (good: boolean, text?: string) => {
      setMood((m) => ({ mood: good ? 'happy' : 'sad', pulse: m.pulse + 1 }))
      setHud({ score: game.score, hearts: game.hearts, progress: game.progress })
      if (text) setMessage(text)
      if (game.done && !finished.current) {
        finished.current = true
        window.setTimeout(() => onFinishRef.current(summarize(game.attempted, lesson.clef, game.failed)), 900)
      }
    },
    [game, lesson.clef],
  )

  // Settle the mascot back to idle.
  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), 900)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 350)
    return () => clearTimeout(t)
  }, [flash])

  // Key presses go straight to the game.
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== 'on') return
        if (game instanceof BirdGame) {
          const [ev] = game.press(e.midi, e.time)
          if (ev?.type === 'flap') setFlash({ midi: e.midi, mark: ev.correct ? 'correct' : 'wrong' })
          return
        }
        const [ev] = game.press(e.midi, e.time)
        if (!ev) return
        if (ev.type === 'pop') {
          sfx.correct()
          setFlash({ midi: e.midi, mark: 'correct' })
          react(true)
        } else {
          sfx.wrong()
          setFlash({ midi: e.midi, mark: 'wrong' })
          react(false, `${solfegeName(e.midi)} değil! En üstteki balona bak.`)
        }
      }),
    [game, react],
  )

  const create = useCallback(
    (app: Application) =>
      game instanceof BirdGame
        ? createBirdScene(
            app,
            game,
            lesson.clef,
            lesson.notes,
            (events) => {
              for (const ev of events) {
                if (ev.type === 'pass') {
                  sfx.correct()
                  react(true, 'Harika geçiş!')
                } else if (ev.type === 'crash') {
                  sfx.wrong()
                  react(false, `Bu boşluk ${solfegeName(ev.pipe.record.target)} idi.`)
                }
              }
            },
            setStaff,
          )
        : createBalloonScene(app, game, lesson.clef, lesson.notes, (events) => {
            for (const ev of events) {
              if (ev.type === 'escape') {
                sfx.wrong()
                react(false, `Kaçan balon ${solfegeName(ev.balloon.record.target)} idi.`)
              }
            }
          }),
    [game, lesson.clef, lesson.notes, react],
  )

  const marks: Partial<Record<number, KeyMark>> = flash ? { [flash.midi]: flash.mark } : {}

  return (
    <div className="game arcade">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Oyundan çık">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(hud.progress * 100)}>
          <div className="progress-fill" style={{ width: `${hud.progress * 100}%` }} />
        </div>
        <span className="hearts" aria-label={`${hud.hearts} can`}>
          ❤️ {hud.hearts}
        </span>
      </header>

      <div className="arcade-info">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={56} />
        <p className="arcade-message">{message}</p>
        <span className="arcade-score">⭐ {hud.score}</span>
      </div>

      <PixiStage create={create} className="pixi-stage">
        {staff && (
          <svg className="clef-overlay" aria-hidden>
            <text
              x={staff.gap * 0.3}
              y={stepY(CLEF[lesson.clef].step, staff)}
              fontSize={staff.gap * 4}
              fontFamily="Bravura"
            >
              {CLEF[lesson.clef].glyph}
            </text>
          </svg>
        )}
      </PixiStage>

      <PianoKeyboard low={lesson.keyboard.low} high={lesson.keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
