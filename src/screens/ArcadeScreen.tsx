import { useFinishRequest } from '../testing/finishRequest'
import type { Application } from 'pixi.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { layerHit } from '../audio/layers'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { BalloonGame } from '../games/arcade/balloon/engine'
import { createBalloonScene } from '../games/arcade/balloon/scene'
import { BarGame } from '../games/arcade/bar/engine'
import { createBarScene, noteSpans } from '../games/arcade/bar/scene'
import { BirdGame } from '../games/arcade/bird/engine'
import { createBirdScene } from '../games/arcade/bird/scene'
import { ChirpGame } from '../games/arcade/chirp/engine'
import { createChirpScene } from '../games/arcade/chirp/scene'
import { FrogGame, frogPath, jumpLabel, jumpTopics } from '../games/arcade/frog/engine'
import { createFrogScene } from '../games/arcade/frog/scene'
import { ENDLESS_RAMP } from '../games/arcade/ramp'
import { TrainGame } from '../games/arcade/train/engine'
import { createTrainScene } from '../games/arcade/train/scene'
import { tunePitches } from '../games/arcade/train/tunes'
import { initPiano } from '../audio/piano'
import { playParts } from '../audio/earSound'
import { ArcadeChips } from './arcade/ArcadeChips'
import { GhostChip } from './arcade/Ghost'
import { useSecondTrace, useStoredGhost } from './arcade/ghostHooks'
import { arcadeStats, FEVER_AT, melodyOf, useCombo, useHint, useSurprise } from './arcade/useArcade'
import { PixiStage } from '../games/arcade/PixiStage'
import { noteSkill, type SkillProvider, type SkillTarget } from '../games/arcade/skill'
import type { Tune } from '../rhythm/plan'

interface TuneStart {
  tune: Tune
  start: number
}
import { type StaffLayout, stepY } from '../games/arcade/staffGeometry'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { grandClefPicker } from '../games/noteHunter/session'
import { type SessionSummary, summarize } from '../games/noteHunter/summary'
import { subscribe } from '../input/inputBus'
import { solfegeName } from '../music/notes'
import { useSettings } from '../state/settings'
import { useProfile } from '../state/profile'
import { paceText } from '../progress/adaptive'

// The clef glyph comes from the Bravura music font that VexFlow registers.
void import('vexflow/bravura').then(() => document.fonts?.load('30px Bravura')).catch(() => undefined)

const ARCADE_HEARTS = 3

/** SMuFL clef glyphs (Bravura) and the staff step their origin sits on. */
const CLEF = {
  treble: { glyph: '\uE050', step: 2 },
  bass: { glyph: '\uE062', step: 6 },
}

type ArcadeKind = 'bird' | 'balloon' | 'bar' | 'train' | 'chirp' | 'frog'

const HOW_TO: Record<ArcadeKind, string> = {
  bird: 'Borudaki boşluğun notasını çal, kuş oraya uçsun!',
  balloon: 'Balonun üstündeki notayı çal ve patlat!',
  bar: 'Müşterinin notasını çal, içeceği kaysın! Üst tezgahlar sağ el, alt tezgahlar sol el.',
  train: 'Öndeki vagonun notasını çal, lokomotife bağlansın! Sıradakileri şimdiden oku.',
  chirp: 'Kuş bir nota ötüyor: kulağınla bul, tuşuna bas, yuvasına dönsün!',
  frog: 'Kurbağa ne kadar zıplayacak? Çizgi ve araları say, indiği notayı çal!',
}

const KINDS: ArcadeKind[] = ['bird', 'balloon', 'bar', 'train', 'chirp', 'frog']

/**
 * Songs on the targets (Nota Treni, the Salon's Bilinen şarkılar): the songs' notes in
 * order, and the target each song starts at. The Salon shuffles the songs and plays them
 * again until the endless game's length is filled.
 */
function tuneSkill(lesson: NoteLesson, ignoreOctave: boolean): { skill: SkillProvider; songs: TuneStart[] } | null {
  if (!lesson.tunes?.length) return null
  const order = lesson.salon ? [...lesson.tunes].sort(() => Math.random() - 0.5) : lesson.tunes
  const shift = lesson.tuneShift ?? 0
  const songs: TuneStart[] = []
  const targets: SkillTarget[] = []
  do {
    for (const tune of order) {
      songs.push({ tune, start: targets.length })
      targets.push(...tunePitches(tune).map((midi) => ({ midi: midi + shift })))
    }
  } while (lesson.salon && targets.length < lesson.length)
  return {
    skill: {
      clef: lesson.clef,
      range: [...lesson.notes].sort((a, b) => a - b),
      targets,
      matches: (t, pressed) => (ignoreOctave ? t.midi % 12 === pressed % 12 : t.midi === pressed),
    },
    songs,
  }
}

const tuneLine = (t: Tune) => `🎵 ${t.title} · ${t.original} (${t.origin})`

/** The songs whose first note came up, each once ("Neşeye Övgü · An die Freude"). */
function songsReached(songs: TuneStart[], records: { shownAt: number | null }[]): string[] {
  const shown = records.filter((r) => r.shownAt !== null).length
  const names = songs.filter((s) => s.start < shown).map((s) => `${s.tune.title} · ${s.tune.original}`)
  return [...new Set(names)]
}

/** Kurbağa Atlayışı: a path of jumps from the start note, inside the lesson's notes. */
function frogSkill(lesson: NoteLesson, ignoreOctave: boolean): SkillProvider | null {
  if (!lesson.frog) return null
  const low = Math.min(...lesson.notes)
  const high = Math.max(...lesson.notes)
  return {
    clef: lesson.clef,
    range: [...lesson.notes].sort((a, b) => a - b),
    targets: frogPath(lesson.frog.start, lesson.frog.sizes, low, high, lesson.length).map((midi) => ({ midi })),
    matches: (t, pressed) => (ignoreOctave ? t.midi % 12 === pressed % 12 : t.midi === pressed),
  }
}

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

type Game = BirdGame | BalloonGame | BarGame | TrainGame | ChirpGame | FrogGame

export function ArcadeScreen({ lesson, onFinish, onExit }: Props) {
  const kind: ArcadeKind = KINDS.find((k) => k === lesson.kind) ?? 'bird'
  const endless = !!lesson.salon?.endless
  const record = useProfile((s) => (lesson.salon ? (s.salon[lesson.id]?.best ?? 0) : undefined))
  const { ignoreOctave, showKeyLabels, hintGlow } = useSettings()
  // Adaptive difficulty: the lesson's pace from the last games, read once when the game starts.
  const [pace] = useState(() => useProfile.getState().pace[lesson.id] ?? 1)
  const tunes = useMemo(
    () => (kind === 'train' || kind === 'bird' || kind === 'balloon' ? tuneSkill(lesson, ignoreOctave) : null),
    [kind, lesson, ignoreOctave],
  )
  const game: Game = useMemo(() => {
    const frog = kind === 'frog' ? frogSkill(lesson, ignoreOctave) : null
    const skill =
      tunes?.skill ??
      frog ??
      noteSkill({
        clef: lesson.clef,
        notes: lesson.notes,
        length: lesson.length,
        ignoreOctave,
        clefOf: lesson.grand ? grandClefPicker(lesson.bothStaves) : undefined,
      })
    const g =
      kind === 'bar'
        ? new BarGame(skill, ARCADE_HEARTS)
        : kind === 'bird'
          ? new BirdGame(skill, ARCADE_HEARTS)
          : kind === 'train'
            ? new TrainGame(skill, ARCADE_HEARTS)
            : kind === 'chirp'
              ? new ChirpGame(skill, ARCADE_HEARTS)
              : kind === 'frog' && lesson.frog
                ? new FrogGame(skill, lesson.frog.start, ARCADE_HEARTS)
                : new BalloonGame(skill, ARCADE_HEARTS)
    g.pace = pace
    if (endless) g.ramp = ENDLESS_RAMP
    return g
  }, [lesson, kind, ignoreOctave, pace, tunes, endless])
  const { combo, bestCombo, hit, miss } = useCombo()
  // Hayalet: an endless game races the best run of the same game and skill.
  const ghost = useStoredGhost(lesson.id, endless)
  const trace = useSecondTrace(() => game.score, endless)
  const traceRun = trace.run

  // Let the browser smoke test read the current target.
  useEffect(() => {
    ;(window as unknown as { __dpoArcade?: Game }).__dpoArcade = game
  }, [game])

  const [hud, setHud] = useState({ score: 0, hearts: ARCADE_HEARTS, progress: 0 })
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [flash, setFlash] = useState<{ midi: number; mark: KeyMark } | null>(null)
  // Songs open with the first song's name (the lesson card already said how to play).
  const [message, setMessage] = useState(() => (tunes ? tuneLine(tunes.songs[0].tune) : HOW_TO[kind]))
  const [staff, setStaff] = useState<StaffLayout | null>(null)
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const summary = useCallback((): SessionSummary => {
    const base = summarize(game.attempted, lesson.clef, game.failed)
    return {
      ...base,
      // Kurbağa Atlayışı is about the jumps: its topics are the jump sizes, not the lines and spaces.
      ...(game instanceof FrogGame && lesson.frog && { perCategory: jumpTopics(game.records, lesson.frog.start) }),
      arcade: {
        ...arcadeStats(game, bestCombo(), game.records),
        // Kayıp Kuş Sesi is played by ear: its notes make no melody worth hearing back.
        ...(kind !== 'chirp' && { melody: melodyOf(game.records) }),
        ...(tunes && { songs: songsReached(tunes.songs, game.records) }),
      },
      ...(endless && { ghost: traceRun() }),
    }
  }, [game, kind, tunes, lesson.clef, lesson.frog, bestCombo, endless, traceRun])

  useFinishRequest(() => {
    finished.current = true
    onFinishRef.current(summary())
  })

  const surprise = useSurprise(game, kind, (text) => setMessage(text ?? 'Sürpriz bitti, normal hıza döndük.'))
  // İpucu parıltısı: the urgent note's key glows; Kayıp Kuş Sesi is played by ear, so it never glows.
  const glow = useHint(game, hintGlow && kind !== 'chirp')

  // Ses katmanları: the run of right notes the accompaniment follows.
  const run = useRef(0)
  const react = useCallback(
    (good: boolean, text?: string, midi?: number) => {
      if (good) hit()
      else miss()
      run.current = good ? run.current + 1 : 0
      if (good && midi !== undefined) layerHit(midi, run.current)
      setMood((m) => ({ mood: good ? 'happy' : 'sad', pulse: m.pulse + 1 }))
      setHud({ score: game.score, hearts: game.hearts, progress: game.progress })
      if (text) setMessage(text)
      if (game.done && !finished.current) {
        finished.current = true
        window.setTimeout(() => onFinishRef.current(summary()), 900)
      }
    },
    [game, hit, miss, summary],
  )

  // Kayıp Kuş Sesi needs the piano (a soft synthesized tone plays until it is ready).
  useEffect(() => {
    if (kind === 'chirp') void initPiano().catch(() => undefined)
  }, [kind])
  const sing = useCallback((midi: number, delayMs = 0) => {
    window.setTimeout(() => playParts([{ notes: [midi] }], { noteMs: 900 }), delayMs)
  }, [])

  // Songs: name each song as its first note comes up (the front wagon, the newest pipe or balloon).
  const tuneShown = useRef(0)
  const announceTune = useCallback(() => {
    if (!tunes) return
    const at =
      game instanceof TrainGame ? (game.front?.index ?? -1) : game.records.filter((r) => r.shownAt !== null).length - 1
    const tune = tunes.songs.filter((s) => s.start <= at).length - 1
    if (tune <= tuneShown.current) return
    tuneShown.current = tune
    setMessage(tuneLine(tunes.songs[tune].tune))
  }, [game, tunes])
  useEffect(() => {
    if (!tunes || game instanceof TrainGame) return
    const t = window.setInterval(announceTune, 250)
    return () => clearInterval(t)
  }, [tunes, game, announceTune])

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
          if (ev?.type === 'flap' && !ev.correct) {
            miss()
            run.current = 0
          }
          return
        }
        if (game instanceof ChirpGame) {
          const [ev] = game.press(e.midi, e.time)
          if (!ev) return
          if (ev.type === 'home') {
            sfx.correct()
            setFlash({ midi: e.midi, mark: 'correct' })
            react(true, `Evet, ${solfegeName(e.midi)}! Kuş yuvasına uçtu.`, e.midi)
          } else if (ev.type === 'wrong') {
            setFlash({ midi: e.midi, mark: 'wrong' })
            react(false, `${solfegeName(e.midi)} değil. Kuş bir daha ötüyor, iyi dinle.`)
            sing(ev.bird.record.target, 650)
          }
          return
        }
        if (game instanceof FrogGame) {
          const [ev] = game.press(e.midi, e.time)
          if (!ev) return
          if (ev.type === 'jump') {
            sfx.correct()
            setFlash({ midi: e.midi, mark: 'correct' })
            react(
              true,
              `Hop! ${jumpLabel(ev.pad.from, ev.pad.record.target)}: ${solfegeName(ev.pad.record.target)}`,
              e.midi,
            )
          } else if (ev.type === 'wrong') {
            sfx.wrong()
            setFlash({ midi: e.midi, mark: 'wrong' })
            react(false, `${solfegeName(e.midi)} değil. ${solfegeName(ev.pad.from)}’dan başlayıp say.`)
          }
          return
        }
        if (game instanceof TrainGame) {
          const [ev] = game.press(e.midi, e.time)
          if (!ev) return
          if (ev.type === 'couple') {
            sfx.correct()
            setFlash({ midi: e.midi, mark: 'correct' })
            react(true, undefined, e.midi)
            announceTune()
          } else {
            sfx.wrong()
            setFlash({ midi: e.midi, mark: 'wrong' })
            react(false, `${solfegeName(e.midi)} değil! Öndeki vagonun notasını oku.`)
          }
          return
        }
        const [ev] = game.press(e.midi, e.time)
        if (!ev) return
        if (ev.type === 'pop' || ev.type === 'serve') {
          const record = 'balloon' in ev ? ev.balloon.record : ev.customer.record
          const golden = record.golden && record.wrongPresses.length === 0 && !record.hinted
          if (golden) sfx.combo()
          else sfx.correct()
          setFlash({ midi: e.midi, mark: 'correct' })
          react(
            true,
            golden
              ? ev.type === 'serve'
                ? '🌟 Altın müşteri! Bahşiş: bonus XP.'
                : '🌟 Altın balon! Bonus XP kazandın.'
              : ev.type === 'serve'
                ? 'Afiyet olsun!'
                : undefined,
            record.target,
          )
        } else {
          sfx.wrong()
          setFlash({ midi: e.midi, mark: 'wrong' })
          react(
            false,
            game instanceof BarGame
              ? `${solfegeName(e.midi)} kimsenin notası değil! Bara en yakın müşteriye bak.`
              : `${solfegeName(e.midi)} değil! En üstteki balona bak.`,
          )
        }
      }),
    [game, react, miss, sing, announceTune],
  )

  const create = useCallback(
    (app: Application) =>
      game instanceof BarGame
        ? createBarScene(
            app,
            game,
            {
              spans: noteSpans(lesson.notes, lesson.bothStaves ?? []),
              order: (c) => ({ clef: c.record.clef ?? 'treble', notes: [c.record.target] }),
            },
            (events) => {
              for (const ev of events) {
                if (ev.type === 'angry') {
                  sfx.wrong()
                  react(false, `Müşteri ${solfegeName(ev.customer.record.target)} istiyordu, kızdı gitti!`)
                }
              }
            },
          )
        : game instanceof FrogGame
          ? createFrogScene(
              app,
              game,
              lesson.clef,
              lesson.notes,
              (events) => {
                for (const ev of events) {
                  if (ev.type === 'splash') {
                    sfx.wrong()
                    react(
                      false,
                      `Yaprak battı! ${jumpLabel(ev.pad.from, ev.pad.record.target)}: ${solfegeName(ev.pad.record.target)} idi.`,
                    )
                  }
                }
              },
              setStaff,
            )
          : game instanceof TrainGame
            ? createTrainScene(
                app,
                game,
                lesson.clef,
                lesson.notes,
                (events) => {
                  for (const ev of events) {
                    if (ev.type === 'derail') {
                      sfx.wrong()
                      react(false, `Vagon raydan çıktı: notası ${solfegeName(ev.wagon.record.target)} idi.`)
                    }
                  }
                  announceTune()
                },
                setStaff,
              )
            : game instanceof ChirpGame
              ? createChirpScene(app, game, lesson.notes, (events) => {
                  for (const ev of events) {
                    if (ev.type === 'sing') sing(ev.bird.record.target)
                    else if (ev.type === 'lost') {
                      sfx.wrong()
                      react(false, `Kuş uçup gitti. ${solfegeName(ev.bird.record.target)} ötüyordu.`)
                      sing(ev.bird.record.target, 300)
                    }
                  }
                })
              : game instanceof BirdGame
                ? createBirdScene(
                    app,
                    game,
                    lesson.clef,
                    lesson.notes,
                    (events) => {
                      for (const ev of events) {
                        if (ev.type === 'pass') {
                          sfx.correct()
                          // With songs the message keeps the song's name.
                          react(true, tunes ? undefined : 'Harika geçiş!', ev.pipe.record.target)
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
    [game, lesson.clef, lesson.notes, lesson.bothStaves, react, sing, announceTune, tunes],
  )

  const marks: Partial<Record<number, KeyMark>> = {}
  if (glow !== null) marks[glow] = 'glow'
  if (flash) marks[flash.midi] = flash.mark

  return (
    <div className="game arcade">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Oyundan çık">
          ✕
        </button>
        {endless ? (
          <div className="endless-bar" aria-label="Sonsuz oyun">
            ♾️ Sonsuz oyun{record ? ` · rekor ${record}` : ''}
          </div>
        ) : (
          <div className="progress" role="progressbar" aria-valuenow={Math.round(hud.progress * 100)}>
            <div className="progress-fill" style={{ width: `${hud.progress * 100}%` }}>
              {/* A highlight sweeps along the bar each time it grows (a new key per step restarts it). */}
              {hud.progress > 0 && <span className="progress-shine" key={hud.progress} />}
            </div>
          </div>
        )}
        <span className="hearts" aria-label={`${hud.hearts} can`}>
          ❤️ {hud.hearts}
        </span>
      </header>

      <div className="arcade-info">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={56} />
        <p className="arcade-message">{message}</p>
        {pace !== 1 && (
          <span className={`pace-chip ${pace > 1 ? 'up' : 'down'}`} title="Son oyunlarına göre ayarlanan hız">
            Hız {paceText(pace)}
          </span>
        )}
        {ghost && <GhostChip ghost={ghost} at={trace.second} mine={hud.score} />}
        <ArcadeChips combo={combo} record={endless ? undefined : record} />
        <span className="arcade-score">⭐ {hud.score}</span>
      </div>

      <PixiStage create={create} className="pixi-stage" fever={combo >= FEVER_AT} surprise={surprise}>
        {game instanceof ChirpGame && (
          <button
            className="replay-chirp"
            aria-label="Kuşu tekrar dinle"
            onClick={() => {
              const [ev] = game.replay()
              if (ev?.type === 'sing') sing(ev.bird.record.target)
            }}
          >
            🔊
          </button>
        )}
        {staff && (kind === 'bird' || kind === 'train' || kind === 'frog') && (
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
