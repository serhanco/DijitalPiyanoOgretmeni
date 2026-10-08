import { gameNow } from '../input/gameClock'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Metronome, prepareMetronome, startMetronome } from '../audio/metronome'
import { Mascot } from '../components/Mascot'
import { PianoKeyboard } from '../components/PianoKeyboard'
import { type InputSource, subscribe } from '../input/inputBus'
import { keyboardOf } from '../midi/midiStore'
import { parseNote } from '../music/notes'
import {
  CALIBRATION_BEATS,
  CALIBRATION_BPM,
  calibrate,
  type CalibrationResult,
  offsetFromBeat,
} from '../rhythm/calibration'
import { beatMs as beatLength } from '../rhythm/timing'
import { useSettings } from '../state/settings'

const COUNT_IN = 4
const LEAD_MS = 500
const BEAT_MS = beatLength(CALIBRATION_BPM)

const SOURCE_LABELS: Record<InputSource, string> = {
  midi: 'MIDI piyano',
  screen: 'Ekran klavyesi',
  computer: 'Bilgisayar klavyesi',
}

interface Tap {
  beat: number
  offsetMs: number
  source: InputSource
  /** MIDI only: the keyboard's port name. */
  device?: string
}

const deviceLabel = (device: string) => keyboardOf(device)?.name ?? device

type Phase = { name: 'ready' } | { name: 'running'; startAt: number } | { name: 'result'; taps: Tap[] }

export function CalibrationScreen({ onBack }: { onBack: () => void }) {
  const { latency, deviceLatency, set } = useSettings()
  const [phase, setPhase] = useState<Phase>({ name: 'ready' })
  const [now, setNow] = useState(0)
  const [saved, setSaved] = useState(false)
  const taps = useRef<Tap[]>([])
  const metronome = useRef<Metronome | null>(null)

  useEffect(() => () => metronome.current?.stop(), [])

  const start = useCallback(async () => {
    await prepareMetronome()
    taps.current = []
    setSaved(false)
    const startAt = gameNow() + LEAD_MS + COUNT_IN * BEAT_MS
    ;(window as unknown as { __dpoCalibration?: unknown }).__dpoCalibration = { startAt, beatMs: BEAT_MS }
    setPhase({ name: 'running', startAt })
    metronome.current?.stop()
    metronome.current = await startMetronome({
      force: true,
      bpm: CALIBRATION_BPM,
      beatsPerBar: 4,
      firstClickAt: startAt - COUNT_IN * BEAT_MS,
      fromBeat: -COUNT_IN,
      toBeat: CALIBRATION_BEATS - 1,
    })
  }, [])

  // Taps: raw times (no correction), one per beat.
  useEffect(() => {
    if (phase.name !== 'running') return
    return subscribe((e) => {
      if (e.type !== 'on') return
      const { beat, offsetMs } = offsetFromBeat(e.time, phase.startAt, BEAT_MS)
      if (beat < 0 || beat >= CALIBRATION_BEATS || taps.current.some((t) => t.beat === beat)) return
      taps.current.push({ beat, offsetMs, source: e.source, device: e.device })
    })
  }, [phase])

  useEffect(() => {
    if (phase.name !== 'running') return
    let raf = 0
    const end = phase.startAt + (CALIBRATION_BEATS - 0.5) * BEAT_MS
    const loop = () => {
      const t = gameNow()
      setNow(t)
      if (t > end) {
        metronome.current?.stop()
        setPhase({ name: 'result', taps: [...taps.current] })
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  let body
  if (phase.name === 'running') {
    const beat = Math.floor((now - phase.startAt) / BEAT_MS + 0.0001)
    const sinceBeat = (now - phase.startAt) / BEAT_MS - beat
    const counting = beat < 0
    body = (
      <div className="calib-run">
        <div
          className={`calib-pulse ${counting ? 'count' : ''}`}
          style={{ transform: `scale(${1.25 - Math.min(1, sinceBeat * 2.5) * 0.25})` }}
        >
          {counting ? -beat : beat + 1}
        </div>
        <p className="muted">
          {counting ? 'Dinle… sayım bitince her vuruşta bir tuşa bas.' : 'Her tıkta bir tuşa bas!'}
        </p>
      </div>
    )
  } else if (phase.name === 'result') {
    const result: CalibrationResult | null = calibrate(phase.taps.map((t) => t.offsetMs))
    const counts = new Map<InputSource, number>()
    for (const t of phase.taps) counts.set(t.source, (counts.get(t.source) ?? 0) + 1)
    const source = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'screen'
    // A MIDI measurement also belongs to the keyboard it was made with.
    const device = source === 'midi' ? phase.taps.find((t) => t.source === 'midi')?.device : undefined
    body = (
      <div className="calib-result">
        {result ? (
          <>
            <p className="calib-big" data-latency={result.latencyMs}>
              {result.latencyMs} ms
            </p>
            <p>
              {device ? deviceLabel(device) : SOURCE_LABELS[source]} için ölçülen gecikme ({result.used} vuruş, ±
              {Math.round(result.spreadMs)} ms sapma).
            </p>
            <div className="offset-strip" aria-hidden>
              <span className="offset-zero" />
              {phase.taps.map((t) => (
                <span
                  key={t.beat}
                  className="offset-dot"
                  style={{ left: `${50 + Math.max(-50, Math.min(50, t.offsetMs / 4))}%` }}
                />
              ))}
            </div>
            <p className="small muted offset-axis">
              <span>200 ms erken</span>
              <span>vuruş</span>
              <span>200 ms geç</span>
            </p>
            {result.ok ? (
              <button
                className="btn"
                disabled={saved}
                onClick={() => {
                  set({
                    latency: { ...latency, [source]: result.latencyMs },
                    ...(device && { deviceLatency: { ...deviceLatency, [device]: result.latencyMs } }),
                  })
                  setSaved(true)
                }}
              >
                {saved ? 'Kaydedildi ✓' : 'Bu gecikmeyi kullan'}
              </button>
            ) : (
              <p className="feedback bad">
                Vuruşların biraz dağınık oldu. Metronomu dinleyip her tıkta tek bir kez basarak tekrar dene.
              </p>
            )}
          </>
        ) : (
          <p className="feedback bad">Hiç basış gelmedi. Klavyen bağlı mı?</p>
        )}
        <button className="btn btn-secondary" onClick={() => void start()}>
          Tekrar ölç
        </button>
      </div>
    )
  } else {
    body = (
      <div className="calib-ready">
        <p>
          Bluetooth MIDI ve bazı ekranlar basışları birkaç milisaniye geç iletir. Bunu bir kez ölçelim: metronom 4 kez
          sayacak, sonra {CALIBRATION_BEATS} vuruş boyunca her tıkta piyanonda bir tuşa bas. Her klavye (ve aynı
          piyanonun USB ve Bluetooth bağlantısı) ayrı kaydedilir.
        </p>
        <button className="btn" onClick={() => void start()}>
          Ölçmeye başla
        </button>
      </div>
    )
  }

  return (
    <div className="game calibration">
      <header className="game-top">
        <button className="icon-btn" onClick={onBack} aria-label="Geri">
          ✕
        </button>
        <h1 className="calib-title">Gecikme ayarı</h1>
      </header>
      <div className="arcade-info">
        <Mascot mood={phase.name === 'result' ? 'happy' : 'think'} size={56} />
        <p className="arcade-message">Ritim derslerinde zamanlamayı adil ölçebilmem için bu ayar önemli.</p>
      </div>
      <section className="card">{body}</section>
      <section className="card small">
        <h2>Kayıtlı gecikmeler</h2>
        <ul className="latency-list">
          {(Object.keys(SOURCE_LABELS) as InputSource[]).map((s) => (
            <li key={s}>
              {SOURCE_LABELS[s]}: <b>{latency[s] ?? 0} ms</b>
            </li>
          ))}
          {Object.entries(deviceLatency).map(([d, ms]) => (
            <li key={d}>
              {deviceLabel(d)}: <b>{ms} ms</b>
            </li>
          ))}
        </ul>
        <button
          className="btn btn-small btn-secondary"
          onClick={() => set({ latency: { midi: 0, screen: 0, computer: 0 }, deviceLatency: {} })}
        >
          Sıfırla
        </button>
      </section>
      <PianoKeyboard low={parseNote('C4')} high={parseNote('C5')} />
    </div>
  )
}
