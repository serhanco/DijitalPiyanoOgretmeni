import { useEffect, useMemo, useRef, useState } from 'react'
import { pianoAttack, pianoRelease } from '../audio/piano'
import { Mascot, type MascotMood } from '../components/Mascot'
import { gameTimeout } from '../input/gameClock'
import { subscribe } from '../input/inputBus'
import { subscribePedal } from '../input/pedal'
import { useMidi } from '../midi/midiStore'
import { BluetoothScan } from '../midi/BluetoothScan'
import { isNativeApp } from '../midi/nativeMidi'
import {
  chordCheck,
  type KeyRange,
  LOUD_FROM,
  platformOf,
  type Press,
  rangeText,
  reportMarkdown,
  SOFT_BELOW,
  type SetupReport,
  touchCheck,
} from '../midi/setupCheck'
import { solfegeName } from '../music/notes'
import { useSettings } from '../state/settings'
import { copyText, downloadText, today } from '../testing/share'

const STEPS = ['connect', 'keys', 'chord', 'touch', 'pedal', 'sound', 'latency', 'report'] as const
type Step = (typeof STEPS)[number]

interface Progress {
  step: Step
  range: KeyRange | null
  chord: { ok: boolean; spreadMs: number } | null
  velocities: number[]
  pedal: boolean | null | undefined
  pianoSound: boolean | null
}

const fresh = (): Progress => ({
  step: 'connect',
  range: null,
  chord: null,
  velocities: [],
  pedal: undefined,
  pianoSound: null,
})

// Kept while the app runs, so coming back from the latency measurement goes on where it left off.
let saved: Progress | null = null

export const REPORT_KEY = 'dpo-keyboard-report'

interface Props {
  onBack: () => void
  onCalibrate: () => void
}

/** Klavye bağlantı sihirbazı: connect a real keyboard and check keys, chords, touch, pedal, sound and latency. */
export function KeyboardSetupScreen({ onBack, onCalibrate }: Props) {
  const { status, devices, output, error, connect } = useMidi()
  const [p, setP] = useState<Progress>(() => saved ?? fresh())
  const update = (patch: Partial<Progress>) => setP((cur) => ({ ...cur, ...patch }))
  const deviceLatency = useSettings((s) => s.deviceLatency)
  const midiLatency = useSettings((s) => s.latency.midi)
  const [copied, setCopied] = useState(false)
  const [lastVelocity, setLastVelocity] = useState<number | null>(null)
  const held = useRef(new Map<number, number>())

  useEffect(() => {
    saved = p
  }, [p])

  const device = devices[0] ?? null
  const stepIndex = STEPS.indexOf(p.step)
  const next = () => update({ step: STEPS[Math.min(stepIndex + 1, STEPS.length - 1)] })

  // Keys from the MIDI keyboard feed the step on screen.
  useEffect(
    () =>
      subscribe((e) => {
        if (e.source !== 'midi') return
        if (e.type === 'off') {
          held.current.delete(e.midi)
          return
        }
        held.current.set(e.midi, e.time)
        setP((cur) => {
          if (cur.step === 'keys') {
            const r = cur.range
            return {
              ...cur,
              range: r
                ? { lowest: Math.min(r.lowest, e.midi), highest: Math.max(r.highest, e.midi) }
                : { lowest: e.midi, highest: e.midi },
            }
          }
          if (cur.step === 'chord') {
            const presses: Press[] = [...held.current].map(([midi, time]) => ({ midi, time }))
            const check = chordCheck(presses)
            return check.ok ? { ...cur, chord: check } : cur
          }
          if (cur.step === 'touch') return { ...cur, velocities: [...cur.velocities, e.velocity] }
          return cur
        })
        setLastVelocity(e.velocity)
      }),
    [],
  )

  useEffect(
    () =>
      subscribePedal((e) => {
        if (e.down) setP((cur) => (cur.step === 'pedal' ? { ...cur, pedal: true } : cur))
      }),
    [],
  )

  const latency = device ? (deviceLatency[device.name] ?? null) : null
  const touch = touchCheck(p.velocities)

  const report: SetupReport = useMemo(
    () => ({
      device: device && { name: device.name, manufacturer: device.manufacturer, keyboard: device.keyboard?.name },
      output,
      range: p.range,
      chord: p.chord,
      touch,
      pedal: p.pedal ?? null,
      pianoSound: p.pianoSound,
      latencyMs: latency ?? (midiLatency ? midiLatency : null),
      platform: platformOf(navigator.userAgent),
      date: today(),
    }),
    [device, output, p, touch, latency, midiLatency],
  )

  const playTriad = () => {
    const notes = [60, 64, 67]
    notes.forEach((n, i) => gameTimeout(() => pianoAttack(n, 0.7), i * 350))
    gameTimeout(() => notes.forEach(pianoRelease), notes.length * 350 + 600)
  }

  const finish = () => {
    try {
      localStorage.setItem(REPORT_KEY, JSON.stringify(report))
    } catch {
      // Private mode: the report is still on screen to copy.
    }
    saved = null
    onBack()
  }

  let mood: MascotMood = 'think'
  let say = ''
  let body: React.ReactNode = null
  let canNext = true

  if (p.step === 'connect') {
    say = 'Piyanonu bağlayalım. USB kablo en sağlam yoldur.'
    canNext = devices.length > 0
    body = (
      <>
        {status === 'unsupported' && (
          <p>Bu tarayıcı MIDI desteklemiyor. Bilgisayarda Chrome ya da Edge, Android’de Chrome kullan.</p>
        )}
        {(status === 'idle' || status === 'denied') && (
          <button className="btn" onClick={() => void connect()} data-setup-connect>
            MIDI’ye bağlan
          </button>
        )}
        {status === 'denied' && <p className="muted small">İzin verilmedi. {error}</p>}
        {status === 'requesting' && <p className="muted">Bağlanıyor…</p>}
        {status === 'ready' && devices.length === 0 && (
          <p>MIDI hazır ama klavye görünmüyor. Kabloyu tak ya da piyanonun Bluetooth’unu aç; kendiliğinden görünür.</p>
        )}
        {isNativeApp() && status === 'ready' && <BluetoothScan />}
        {devices.length > 0 && (
          <ul className="setup-devices" data-setup-devices>
            {devices.map((d) => (
              <li key={d.id}>
                🎹 <b>{d.keyboard?.name ?? d.name}</b>
                {d.keyboard && <span className="muted small"> ({d.name})</span>}
              </li>
            ))}
          </ul>
        )}
      </>
    )
  } else if (p.step === 'keys') {
    say = p.range ? 'Şimdi en sağdaki tuşa bas.' : 'En soldaki tuşa bas.'
    canNext = !!p.range && p.range.highest > p.range.lowest
    const check = p.range && rangeText(p.range, device?.keyboard?.keys)
    body = (
      <>
        <p>Klavyenin en soldaki, sonra en sağdaki tuşuna bas. Böylece kaç tuşun geldiğini görürüm.</p>
        {check && (
          <p className={`setup-result ${check.ok ? 'good' : 'bad'}`} data-setup-range>
            {check.text}
          </p>
        )}
      </>
    )
  } else if (p.step === 'chord') {
    say = 'Do, Mi ve Sol’e aynı anda bas.'
    mood = p.chord ? 'happy' : 'think'
    canNext = !!p.chord
    body = (
      <>
        <p>Herhangi bir oktavda Do-Mi-Sol akorunu bas. Akor derslerinde tuşların birlikte geldiğini böyle anlarım.</p>
        {p.chord && (
          <p className="setup-result good" data-setup-chord>
            Akoru duydum ✓ İlk ve son tuş arasında {p.chord.spreadMs} ms.
          </p>
        )}
      </>
    )
  } else if (p.step === 'touch') {
    say = 'Bir tuşa çok hafif, sonra çok sert bas.'
    mood = touch?.ok ? 'happy' : 'think'
    body = (
      <>
        <p>
          Dijital piyanolar tuşa ne kadar güçlü bastığını da gönderir. İleride piyano/forte dersleri bunu kullanacak.
        </p>
        <div className="velocity-meter" aria-label="Son basış gücü">
          <span style={{ width: `${Math.round((lastVelocity ?? 0) * 100)}%` }} />
        </div>
        {touch && (
          <p className={`setup-result ${touch.ok ? 'good' : 'muted'}`} data-setup-touch>
            En hafif %{Math.round(touch.soft * 100)}, en sert %{Math.round(touch.loud * 100)}.
            {touch.ok
              ? ' Tuş hassasiyeti çalışıyor ✓'
              : ` Biraz daha fark yarat: %${SOFT_BELOW * 100}'in altı ve %${LOUD_FROM * 100} üstü.`}
          </p>
        )}
      </>
    )
  } else if (p.step === 'pedal') {
    say = 'Sustain pedalına bas ve bırak.'
    mood = p.pedal ? 'happy' : 'think'
    body = (
      <>
        <p>Ritim derslerinde pedal basılıyken tuşu bıraksan da nota tutulmuş sayılır, çünkü piyano sesi sürdürür.</p>
        {p.pedal && (
          <p className="setup-result good" data-setup-pedal>
            Pedalı gördüm ✓
          </p>
        )}
        {!p.pedal && (
          <button className="link" onClick={() => update({ pedal: null, step: 'sound' })}>
            Pedalım yok
          </button>
        )}
      </>
    )
  } else if (p.step === 'sound') {
    say = output ? 'Örnek notaları piyanondan çalabilirim. Dinle!' : 'Örnek notalar uygulamadan çalacak.'
    body = output ? (
      <>
        <p>
          Yankı, Melodi Hafızası ve kulak derslerinde benim çaldığım notalar piyanonun hoparlöründen gelebilir.
          Do-Mi-Sol çalıyorum, duydun mu?
        </p>
        <button className="btn btn-small" onClick={playTriad} data-setup-play>
          🔊 Piyanodan çal
        </button>
        <div className="setup-choice">
          <button
            className={`pill ${p.pianoSound === true ? 'on' : ''}`}
            onClick={() => {
              useSettings.getState().set({ demoOnPiano: true })
              update({ pianoSound: true })
            }}
          >
            Duydum
          </button>
          <button
            className={`pill ${p.pianoSound === false ? 'on' : ''}`}
            onClick={() => {
              useSettings.getState().set({ demoOnPiano: false })
              update({ pianoSound: false })
            }}
          >
            Duymadım, uygulamadan çalsın
          </button>
        </div>
      </>
    ) : (
      <p>Piyanonun MIDI çıkışını bulamadım (ya da bu klavyenin kendi sesi yok). Bu hiç sorun değil.</p>
    )
  } else if (p.step === 'latency') {
    say = 'Son olarak gecikmeyi ölçelim.'
    body = (
      <>
        <p>
          Bastığın tuşun bana ulaşması biraz sürer; Bluetooth’ta daha uzun. Ritim derslerinin adil olması için bunu bir
          kez ölçerim: metronomla birlikte 16 kez bas.
        </p>
        <p className="setup-result" data-setup-latency>
          {latency !== null ? `Bu klavye için kayıtlı: ${latency} ms ✓` : 'Bu klavye için henüz ölçülmedi.'}
        </p>
        <button className="btn btn-small" onClick={onCalibrate}>
          ⏱ {latency !== null ? 'Yeniden ölç' : 'Gecikmeyi ölç'}
        </button>
      </>
    )
  } else {
    mood = 'happy'
    say = 'Hazırız! Bu raporu bana yapıştırırsan klavyeni daha iyi tanırım.'
    const md = reportMarkdown(report)
    body = (
      <>
        <pre className="setup-report" data-setup-report>
          {md}
        </pre>
        <div className="setup-choice">
          <button className="btn btn-small" onClick={() => void copyText(md).then(setCopied)}>
            {copied ? 'Kopyalandı ✓' : '📋 Raporu kopyala'}
          </button>
          <button
            className="btn btn-small btn-secondary"
            onClick={() => downloadText(`klavye-raporu-${today()}.md`, md)}
          >
            İndir
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="game setup" data-setup-step={p.step}>
      <header className="game-top">
        <button className="icon-btn" onClick={onBack} aria-label="Geri">
          ✕
        </button>
        <h1 className="calib-title">Piyanonu bağla</h1>
      </header>
      <div className="welcome-dots setup-dots" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={i <= stepIndex ? 'on' : ''} />
        ))}
      </div>
      <div className="arcade-info">
        <Mascot mood={mood} size={56} pulse={stepIndex} />
        <p className="arcade-message">{say}</p>
      </div>
      <section className="card setup-body">{body}</section>
      <div className="setup-actions">
        {stepIndex > 0 && (
          <button className="btn btn-secondary" onClick={() => update({ step: STEPS[stepIndex - 1] })}>
            Geri
          </button>
        )}
        {p.step === 'report' ? (
          <button className="btn" onClick={finish} data-setup-done>
            Bitti
          </button>
        ) : (
          <button className="btn" onClick={next} disabled={!canNext} data-setup-next>
            {canNext || p.step === 'connect' ? 'Devam' : 'Bekliyorum…'}
          </button>
        )}
        {!canNext && p.step !== 'connect' && (
          <button className="link" onClick={next}>
            Atla
          </button>
        )}
      </div>
      {p.step === 'keys' && p.range && (
        <p className="muted small center">
          Şimdiye kadar: {solfegeName(p.range.lowest)} – {solfegeName(p.range.highest)}
        </p>
      )}
    </div>
  )
}
