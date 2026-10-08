// "Melodi Hafızası": the app plays a run of scale notes (sound and lit keys),
// the player repeats it. The run grows by one note every round. In ear mode
// (`listenOnly`) only the first note lights up: the rest is heard.

import { useFinishRequest } from '../testing/finishRequest'
import { gameNow, gameTimeout } from '../input/gameClock'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { initPiano, isPianoReady, pianoAttack, pianoRelease } from '../audio/piano'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { MemoryGame, type MemoryEvent, memoryReport } from '../games/memory/engine'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { type SessionSummary, summarize } from '../games/noteHunter/summary'
import { subscribe } from '../input/inputBus'
import { solfegeName } from '../music/notes'
import { HEARTS_PER_LESSON } from '../progress/gamification'
import { useSettings } from '../state/settings'

const ROUND_PAUSE_MS = 900
const FINISH_PAUSE_MS = 700
const WRONG_FLASH_MS = 700

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

function messageFor(longestClean: number, maxLength: number, failed: boolean): string {
  if (failed) return 'Hafıza da bir kas gibi çalıştıkça güçlenir. Notaları içinden söyleyerek dinle ve tekrar dene.'
  if (longestClean >= maxLength) return `${maxLength} notalık diziyi hatasız hatırladın, fil hafızası!`
  if (longestClean >= maxLength - 2) return 'Uzun dizileri de hatırlıyorsun. Biraz daha pratikle hepsi oturur.'
  return 'Diziler uzadıkça zorlaşıyor. Notaları gruplara ayırarak (3 + 3 gibi) hatırlamayı dene.'
}

export function MemoryScreen({ lesson, onFinish, onExit }: Props) {
  const { ignoreOctave, showKeyLabels, relaxedMode } = useSettings()
  const spec = lesson.memory ?? { startLength: 3, maxLength: 7 }
  const game = useMemo(
    () =>
      new MemoryGame({
        pool: lesson.notes,
        startLength: spec.startLength,
        maxLength: spec.maxLength,
        hearts: relaxedMode ? null : HEARTS_PER_LESSON,
        ignoreOctave,
        // By ear, every run starts on the tonic, the one note that is shown.
        firstPosition: spec.listenOnly ? 0 : undefined,
      }),
    [lesson.notes, spec.startLength, spec.maxLength, spec.listenOnly, relaxedMode, ignoreOctave],
  )
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick((n) => n + 1), [])
  const [lit, setLit] = useState<number | null>(null)
  const [litIndex, setLitIndex] = useState(-1)
  const [flash, setFlash] = useState<{ midi: number; mark: KeyMark; expected?: number } | null>(null)
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [started, setStarted] = useState(false)
  /** Ear mode, unless the piano sound could not load: then the keys light up after all. */
  const [byEar, setByEar] = useState(!!spec.listenOnly)
  const byEarRef = useRef(byEar)
  const timers = useRef<(() => void)[]>([])
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    ;(window as unknown as { __dpoMemory?: MemoryGame }).__dpoMemory = game
  }, [game])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(gameTimeout(fn, Math.max(0, ms)))
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((cancel) => cancel())
  }, [])

  const finish = useCallback(() => {
    const base = summarize(game.attempted, lesson.clef, game.failed)
    const { perCategory, memory } = memoryReport(game)
    onFinishRef.current({
      ...base,
      perCategory,
      memory,
      message: messageFor(memory.longestClean, memory.maxLength, game.failed),
    })
  }, [game, lesson.clef])
  useFinishRequest(finish)

  /** Play the run: sound and light each note, then hand over to the player. */
  const playRound = useCallback(() => {
    const schedule = game.startRound(gameNow())
    rerender()
    const hidden = byEarRef.current
    schedule.forEach((n, i) => {
      later(() => {
        if (!hidden || i === 0) setLit(n.midi)
        setLitIndex(i)
        pianoAttack(n.midi, 0.7)
      }, n.at - gameNow())
      later(
        () => {
          pianoRelease(n.midi)
          setLit((m) => (m === n.midi ? null : m))
        },
        n.at + n.durationMs - gameNow(),
      )
    })
    const end = schedule[schedule.length - 1]
    later(
      () => {
        setLitIndex(-1)
        if (game.update(gameNow()).length) rerender()
      },
      end.at + game.noteMs - gameNow() + 5,
    )
  }, [game, later, rerender])

  const start = useCallback(() => {
    if (started) return
    setStarted(true)
    // Start once the samples are in, but never wait long (offline the run still lights up).
    const wait = new Promise((resolve) => window.setTimeout(resolve, 1500))
    void Promise.race([initPiano().catch(() => undefined), wait]).then(() => {
      if (byEarRef.current && !isPianoReady()) {
        byEarRef.current = false
        setByEar(false)
      }
      playRound()
    })
  }, [started, playRound])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1500 : 700)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  useEffect(() => {
    const react = (events: MemoryEvent[], midi: number) => {
      for (const ev of events) {
        if (ev.type === 'hit') setFlash({ midi, mark: 'correct' })
        else if (ev.type === 'wrong') {
          setFlash({ midi, mark: 'wrong', expected: ev.expected })
          sfx.wrong()
          setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
        } else if (ev.type === 'round') {
          sfx.correct()
          setMood((m) => ({ mood: ev.length >= 6 ? 'cheer' : 'happy', pulse: m.pulse + 1 }))
          if (!game.done) later(playRound, ROUND_PAUSE_MS)
        } else if (ev.type === 'complete') {
          sfx.combo()
          later(finish, FINISH_PAUSE_MS)
        } else if (ev.type === 'failed') {
          sfx.fail()
          later(finish, FINISH_PAUSE_MS)
        }
      }
    }
    return subscribe((e) => {
      if (e.type !== 'on') return
      const events = game.press(e.midi, e.time)
      if (events.length) {
        react(events, e.midi)
        rerender()
      }
    })
  }, [game, later, playRound, finish, rerender])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), flash.mark === 'wrong' ? WRONG_FLASH_MS : 250)
    return () => clearTimeout(t)
  }, [flash])

  const marks: Partial<Record<number, KeyMark>> = {}
  if (lit !== null) marks[lit] = 'hint'
  if (flash) {
    marks[flash.midi] = flash.mark
    if (flash.expected !== undefined) marks[flash.expected] = 'hint'
  }

  const rounds = spec.maxLength - spec.startLength + 1
  const roundIndex = game.rounds.length - (game.phase === 'ready' && game.rounds.length ? 0 : 1)
  const progress = Math.max(0, roundIndex) / rounds
  const prompt = !started
    ? byEar
      ? 'Notiş bir dizi çalacak; yalnızca ilk nota yanar. Kulağınla dinle, sonra aynısını çal!'
      : 'Notiş bir dizi çalacak. Dinle, izle, sonra aynısını çal!'
    : game.phase === 'listen'
      ? byEar
        ? `👂 Yalnızca dinle… İlk nota ${solfegeName(game.sequence[0], false)}.`
        : spec.listenOnly
          ? '👂 Piyano sesi yüklenemedi, bu kez tuşlar da yanıyor. Dinle ve izle…'
          : '👂 Dinle ve izle…'
      : game.phase === 'play'
        ? 'Sıra sende! Aynı notaları aynı sırayla çal.'
        : game.done
          ? game.failed
            ? 'Kalpler bitti.'
            : 'Hepsini hatırladın!'
          : 'Harika! Dizi bir nota uzuyor…'

  return (
    <div className="game memory">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        {game.hearts !== null ? (
          <span className="hearts" aria-label={`${game.heartsLeft} can`}>
            ❤️ {game.heartsLeft}
          </span>
        ) : (
          <span className="counter">{game.length} nota</span>
        )}
      </header>

      <div className="prompt-row">
        <Mascot mood={game.phase === 'listen' ? 'think' : mood.mood} pulse={mood.pulse} size={76} />
        <div>
          <p className="prompt">🧠 {lesson.title}</p>
          <p className="small muted">{prompt}</p>
        </div>
      </div>

      <div className="memory-board" data-phase={game.phase} data-length={game.length} data-ear={byEar}>
        <p className="memory-round">Dizi: {game.length} nota</p>
        <div className="memory-dots">
          {game.sequence.map((midi, i) => {
            const played = game.phase === 'play' ? i < game.played : game.phase !== 'listen' && started
            const on = game.phase === 'listen' && i === litIndex
            return (
              <span key={i} className={`memory-dot ${played ? 'played' : ''} ${on ? 'on' : ''}`}>
                {played ? solfegeName(midi, false) : on ? '♪' : ''}
              </span>
            )
          })}
        </div>
        {!started && (
          <button className="btn memory-start" onClick={start}>
            Başla
          </button>
        )}
      </div>

      <p className={`feedback ${flash?.mark === 'wrong' ? 'bad' : ''}`} aria-live="polite">
        {flash?.mark === 'wrong' && flash.expected !== undefined
          ? `${solfegeName(flash.midi)} değil, ${solfegeName(flash.expected)} olacaktı`
          : ' '}
      </p>

      <PianoKeyboard low={lesson.keyboard.low} high={lesson.keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
