import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Metronome, prepareMetronome, startMetronome } from '../audio/metronome'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { type DuetEvent, duetReport, DuetSession, type DuetRound } from '../games/duet/session'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { gameNow, gameTimeout } from '../input/gameClock'
import { subscribe } from '../input/inputBus'
import { correctedTime } from '../rhythm/calibration'
import { VALUE_BEATS } from '../rhythm/rhythm'
import { beatMs } from '../rhythm/timing'
import { useSettings } from '../state/settings'
import { useFinishRequest } from '../testing/finishRequest'

const LEAD_MS = 500
const FINISH_DELAY_MS = 900
/** Notiş's drum sounds low on the piano. */
const DRUM_MIDI = 48

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

type Turn = 'count' | 'listen' | 'echo' | 'free' | 'done'

const TURN_TEXT: Record<Exclude<Turn, 'done'>, string> = {
  count: 'Hazır ol…',
  listen: '🎧 Notiş çalıyor, dinle',
  echo: '🥁 Sıra sende: aynısını çal',
  free: '🥁 Sıra sende: kendi cevabını çal',
}

/** One bar as eight (or six) eighth cells: Notiş's notes, and the learner's taps. */
function BarStrip({
  session,
  round,
  part,
  now,
}: {
  session: DuetSession
  round: DuetRound
  part: 'call' | 'answer'
  now: number
}) {
  const cells = session.beatsPerBar * 2
  const start = part === 'call' ? round.callStart : round.answerStart
  const at = (now - start) / (session.beatMs / 2)
  // Echo answers show Notiş's call faintly to copy; free answers start empty.
  const ghost = part === 'call' || round.turn === 'echo'
  const taps = part === 'answer' ? round.presses.map((p) => session.gridOf(round, p)) : []
  return (
    <div className="duet-strip" data-part={part} style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}>
      {Array.from({ length: cells }, (_, i) => {
        const beat = i / 2
        const note = round.onsets.includes(beat)
        const tap = taps.find((t) => t.beat === beat)
        const length = note ? VALUE_BEATS[round.call[round.onsets.indexOf(beat)] ?? 'q'] : 0
        return (
          <span
            key={i}
            className={`duet-cell ${i % 2 === 0 ? 'beat' : ''} ${Math.floor(at) === i ? 'now' : ''}`}
            data-note={note && ghost ? (part === 'call' ? 'call' : 'ghost') : undefined}
            data-tap={tap ? (Math.abs(tap.offsetMs) <= 120 ? 'on' : 'off') : undefined}
          >
            {note && ghost && <i style={{ width: `${Math.min(length * 2, 2) * 50}%` }} />}
          </span>
        )
      })}
    </div>
  )
}

export function DuetScreen({ lesson, onFinish, onExit }: Props) {
  const spec = lesson.duet!
  const { showKeyLabels } = useSettings()
  const [bpm] = useState(() => useSettings.getState().tempo[lesson.id] ?? spec.bpm)
  const [session, setSession] = useState<DuetSession | null>(null)
  const sessionRef = useRef<DuetSession | null>(null)
  const [now, setNow] = useState(0)
  const [message, setMessage] = useState(
    'Notiş bir ölçü davul çalar, sonraki ölçüde sen cevap verirsin. Önce aynısını, sonra kendi ritmini çal!',
  )
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [flash, setFlash] = useState<{ midi: number; mark: KeyMark } | null>(null)
  const [lastTap, setLastTap] = useState(-Infinity)
  const [starting, setStarting] = useState(false)
  const metronomeRef = useRef<Metronome | null>(null)
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => void import('tone').catch(() => undefined), [])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    metronomeRef.current?.stop()
    const s = sessionRef.current
    onFinishRef.current(s ? duetReport(s) : duetReport(new DuetSession({ ...spec, turns: [] }, 0)))
  }, [spec])

  useFinishRequest(finish)

  useEffect(
    () => () => {
      finished.current = true
      metronomeRef.current?.stop()
    },
    [],
  )

  const start = useCallback(async () => {
    if (sessionRef.current || starting) return
    setStarting(true)
    await prepareMetronome()
    if (finished.current) return
    const b = beatMs(bpm)
    const countIn = spec.beatsPerBar
    const startAt = gameNow() + LEAD_MS + countIn * b
    const s = new DuetSession(spec, startAt, bpm)
    sessionRef.current = s
    ;(window as unknown as { __dpoDuet?: DuetSession }).__dpoDuet = s
    setSession(s)
    const totalBeats = s.rounds.length * 2 * spec.beatsPerBar
    metronomeRef.current = await startMetronome({
      bpm,
      beatsPerBar: spec.beatsPerBar,
      firstClickAt: startAt - countIn * b,
      fromBeat: -countIn,
      toBeat: totalBeats - 1,
      cues: s.rounds.flatMap((r) =>
        r.onsets.map((o, i) => ({
          beat: r.index * 2 * spec.beatsPerBar + o,
          midi: DRUM_MIDI,
          beats: Math.min(1, VALUE_BEATS[r.call.filter((v) => v !== 'qr')[i] ?? 'q']),
        })),
      ),
    })
    if (finished.current) metronomeRef.current.stop()
  }, [bpm, spec, starting])

  const react = useCallback((events: DuetEvent[]) => {
    for (const ev of events) {
      if (ev.type === 'tap' && ev.onGrid === false) setMessage('Vuruşun dışında kaldı: sekizlik ızgaraya otur.')
      if (ev.type === 'stray') setMessage('Notiş çalarken dinle, sıra sana gelince çal!')
      if (ev.type !== 'judged') continue
      const r = ev.round.result!
      const pct = Math.round(r.score * 100)
      if (ev.round.turn === 'echo') {
        setMessage(
          r.ok
            ? `Yankı tamam! %${pct} aynı.`
            : `Yankı %${pct}. ${r.notes!.some((n) => n.judgement === 'miss') ? 'Kaçan vuruşlar var, ' : ''}Notiş’i dikkatle dinle.`,
        )
      } else {
        setMessage(
          r.quiet
            ? 'Cevap çok kısa kaldı: en az 3 nota çal.'
            : r.ok
              ? r.own
                ? `Harika cevap, kendi ritmin! %${pct} vuruşunda.`
                : `Güzel, vuruşundaydı (%${pct}). Bir dahakine kendi ritmini dene!`
              : `Cevabın %${pct} vuruşunda. Vuruşları içinden say.`,
        )
      }
      if (r.ok) sfx.correct()
      else sfx.wrong()
      setMood((m) => ({
        mood: r.ok ? (ev.round.turn === 'free' && r.own ? 'cheer' : 'happy') : 'sad',
        pulse: m.pulse + 1,
      }))
    }
  }, [])

  useEffect(
    () =>
      subscribe((e) => {
        const s = sessionRef.current
        if (!s || e.type !== 'on') return
        const { latency, deviceLatency } = useSettings.getState()
        const time = correctedTime(e.time, e.source, latency, e.device, deviceLatency)
        const events = s.press(time)
        const ev = events[0]
        if (ev.type === 'tap') {
          setLastTap(gameNow())
          setFlash({ midi: e.midi, mark: ev.onGrid === false ? 'wrong' : 'correct' })
        }
        react(events)
      }),
    [react],
  )

  useEffect(() => {
    if (!session) return
    let raf = 0
    let over = false
    const loop = () => {
      const t = gameNow()
      react(session.update(t))
      setNow(t)
      if (session.done && !over) {
        over = true
        gameTimeout(finish, FINISH_DELAY_MS)
      }
      if (!over) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [session, react, finish])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1500 : 800)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 180)
    return () => clearTimeout(t)
  }, [flash])

  const at = session?.turnAt(now) ?? null
  const turn: Turn = !session
    ? 'count'
    : session.done
      ? 'done'
      : !at
        ? 'count'
        : at.part === 'call'
          ? 'listen'
          : at.round.turn
  // Notiş's drum is hit when a call note starts.
  const notisHit = useMemo(() => {
    if (!session || !at || at.part !== 'call') return false
    const beat = (now - at.round.callStart) / session.beatMs
    return at.round.onsets.some((o) => beat >= o && beat < o + 0.25)
  }, [session, at, now])
  const myHit = now - lastTap < 150
  const marks: Partial<Record<number, KeyMark>> = flash ? { [flash.midi]: flash.mark } : {}
  const roundNo = at ? at.round.index + 1 : session ? session.attempted.length : 0

  return (
    <div className="game duet">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round((session?.progress ?? 0) * 100)}>
          <div className="progress-fill" style={{ width: `${(session?.progress ?? 0) * 100}%` }} />
        </div>
        <span className="counter">
          {roundNo}/{spec.turns.length}
        </span>
      </header>

      <div className="arcade-info">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={56} />
        <p className="arcade-message">{message}</p>
      </div>

      <div className="duet-stage" data-turn={turn}>
        {session ? (
          <>
            <p className={`duet-turn ${turn}`} data-turn={turn}>
              {turn === 'done' ? '🎉 Düet bitti!' : TURN_TEXT[turn]}
            </p>
            <div className="duet-drums">
              <div className={`duet-drum notis ${notisHit ? 'hit' : ''}`} aria-label="Notiş’in davulu">
                <span className="drum-face" />
                <b>Notiş</b>
              </div>
              <div className={`duet-drum me ${myHit ? 'hit' : ''}`} aria-label="Senin davulun">
                <span className="drum-face" />
                <b>Sen</b>
              </div>
            </div>
            {at && <BarStrip session={session} round={at.round} part={at.part} now={now} />}
            <p className="small muted duet-legend">
              {session.bpm} BPM · {spec.beatsPerBar}/4 · Kalın çizgiler vuruş, ince çizgiler sekizlik
            </p>
          </>
        ) : (
          <div className="card beat-ready duet-ready">
            <p>
              <b>Nasıl oynanır?</b> Notiş bir ölçü davul çalar 🎧, sonraki ölçüde sen herhangi bir tuşla cevap verirsin
              🥁. İlk turlarda aynısını çal; sonra cevap senin: ölçüyü kendi ritminle doldur, yeter ki vuruşta kal.
            </p>
            <p className="small muted">
              {bpm} BPM · {spec.turns.length} tur · önce {spec.beatsPerBar} vuruş sayılır.
            </p>
            <button className="btn beat-start" onClick={() => void start()} disabled={starting}>
              Başla
            </button>
          </div>
        )}
      </div>

      <PianoKeyboard low={lesson.keyboard.low} high={lesson.keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
