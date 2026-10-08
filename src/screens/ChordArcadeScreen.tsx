// Chord arcade games: Akor Aşçısı, Uzay Savunması and Akor Barmeni. Same skills as the
// chord drill (chords played together, inversions), on a Pixi playfield.

import { useFinishRequest } from '../testing/finishRequest'
import { gameNow } from '../input/gameClock'
import type { Application } from 'pixi.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { ChordBarGame, type ChordBarEvent, chordClef } from '../games/arcade/bar/chordEngine'
import { chordSpans, createBarScene } from '../games/arcade/bar/scene'
import { ChefGame, type ChefEvent } from '../games/arcade/chef/engine'
import { createChefScene } from '../games/arcade/chef/scene'
import { PixiStage } from '../games/arcade/PixiStage'
import { SpaceGame, type SpaceEvent } from '../games/arcade/space/engine'
import { createSpaceScene } from '../games/arcade/space/scene'
import { chordSequence } from '../games/chords/lessons'
import { summarizeChords } from '../games/chords/report'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { subscribe } from '../input/inputBus'
import { chordSymbol, chordTitle, INVERSION_LABELS } from '../music/chords'
import { solfegeName } from '../music/notes'
import { useSettings } from '../state/settings'

const ARCADE_HEARTS = 3

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

type Game = ChefGame | SpaceGame | ChordBarGame
type GameEvent = ChefEvent | SpaceEvent | ChordBarEvent

const recordOf = (ev: GameEvent) =>
  'order' in ev ? ev.order.record : 'invader' in ev ? ev.invader.record : ev.customer.record

export function ChordArcadeScreen({ lesson, onFinish, onExit }: Props) {
  const spec = lesson.chords!
  const chef = lesson.kind === 'chef'
  const bar = lesson.kind === 'chordbar'
  const { ignoreOctave, showKeyLabels } = useSettings()
  const game: Game = useMemo(() => {
    const chords = chordSequence(spec)
    const options = { mode: spec.mode, hearts: ARCADE_HEARTS, ignoreOctave }
    return chef
      ? new ChefGame(chords, options)
      : bar
        ? new ChordBarGame(chords, options)
        : new SpaceGame(chords, options)
  }, [spec, chef, bar, ignoreOctave])

  useEffect(() => {
    ;(window as unknown as { __dpoChordArcade?: Game }).__dpoChordArcade = game
  }, [game])

  const howTo = chef
    ? spec.showNotes
      ? 'Tarifteki notaları aynı anda bas: hepsi tencereye girince yemek pişer!'
      : spec.mode === 'voicing'
        ? 'Tarif çevrimi söylüyor: akoru doğru nota en altta olacak şekilde bas.'
        : 'Tarifteki akoru çal: notaları sen bul, hepsine birlikte bas.'
    : bar
      ? 'Müşterinin istediği akoru çal, içeceği kaysın! Bara varan müşteri can götürür.'
      : 'İstilacının kartındaki akoru çal, lazer onu vursun! Üsse inen can götürür.'
  const [hud, setHud] = useState({ score: 0, hearts: ARCADE_HEARTS, progress: 0 })
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [flash, setFlash] = useState<{ midi: number; mark: KeyMark } | null>(null)
  const [held, setHeld] = useState<number[]>([])
  const [message, setMessage] = useState(howTo)
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })
  useFinishRequest(() => {
    finished.current = true
    onFinishRef.current(summarizeChords(game.attempted, game.failed))
  })

  const react = useCallback(
    (events: GameEvent[]) => {
      for (const ev of events) {
        const record = recordOf(ev)
        const name = chordTitle(record.chord, spec.mode !== 'pcs')
        switch (ev.type) {
          case 'serve':
          case 'shoot':
            sfx.correct()
            setMood((m) => ({ mood: ev.together ? 'happy' : 'think', pulse: m.pulse + 1 }))
            setMessage(
              ev.together
                ? ev.type === 'shoot'
                  ? 'Tam isabet! Notalar aynı anda indi.'
                  : bar
                    ? `Şerefe! ${name} tam ölçüsünde.`
                    : `Afiyet olsun! ${name} tam kıvamında.`
                : `Oldu, ama notalar ${Math.round(record.spreadMs!)} ms arayla geldi. Hepsine birlikte bas!`,
            )
            break
          case 'burn':
          case 'land':
          case 'angry':
            sfx.wrong()
            setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
            setMessage(
              ev.type === 'burn'
                ? `${name} yandı! Biraz daha hızlı.`
                : ev.type === 'angry'
                  ? `Müşteri ${name} istiyordu, kızdı gitti!`
                  : `${name} üsse indi!`,
            )
            break
          case 'spill':
          case 'wrong':
            sfx.wrong()
            setFlash({ midi: ev.midi, mark: 'wrong' })
            setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
            setMessage(
              ev.octave
                ? `${solfegeName(ev.midi)}: nota doğru, oktavı değil.`
                : `${solfegeName(ev.midi, false)} ${chef ? 'bu tarifte yok' : bar ? 'hiçbir siparişte yok' : 'hiçbir istilacının akorunda yok'}!`,
            )
            break
          case 'inversion':
            sfx.wrong()
            setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
            setMessage(
              `Notalar doğru, ama en altta ${solfegeName(ev.bottom, false)} var. ${INVERSION_LABELS[record.chord.inversion]} istendi.`,
            )
            break
          case 'incomplete':
            setMessage('Akorun bütün notalarına birlikte bas.')
            break
        }
      }
      setHud({ score: game.score, hearts: game.hearts, progress: game.progress })
      if (game.done && !finished.current) {
        finished.current = true
        window.setTimeout(() => onFinishRef.current(summarizeChords(game.attempted, game.failed)), 900)
      }
    },
    [game, chef, bar, spec.mode],
  )

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

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'off') game.release(e.midi)
        else react(game.press(e.midi, e.time) as GameEvent[])
        setHeld(game.playing(gameNow()))
      }),
    [game, react],
  )

  const create = useCallback(
    (app: Application) =>
      game instanceof ChordBarGame
        ? createBarScene(
            app,
            game,
            {
              spans: chordSpans(
                game.records.map((r) => ({ clef: chordClef(r.chord), notes: r.chord.notes.map((n) => n.midi) })),
              ),
              order: (c) => ({
                clef: chordClef(c.record.chord),
                notes: c.record.chord.notes.map((n) => n.midi),
                name: spec.showName ? chordSymbol(c.record.chord.root, c.record.chord.quality) : undefined,
              }),
            },
            (events) => react(events),
          )
        : game instanceof ChefGame
          ? createChefScene(
              app,
              game,
              { showNotes: !!spec.showNotes, withInversion: spec.mode === 'voicing' },
              (events) => react(events),
            )
          : createSpaceScene(app, game, { showName: spec.showName, playing: (now) => game.playing(now) }, (events) =>
              react(events),
            ),
    [game, spec, react],
  )

  const marks: Partial<Record<number, KeyMark>> = {}
  for (const m of held) marks[m] = 'correct'
  if (flash) marks[flash.midi] = flash.mark

  return (
    <div className={`game arcade ${chef ? 'chef' : bar ? 'bar' : 'space'}`}>
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

      <PixiStage create={create} className="pixi-stage" />

      <PianoKeyboard low={lesson.keyboard.low} high={lesson.keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
