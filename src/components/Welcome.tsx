import { useState } from 'react'
import { useMidi } from '../midi/midiStore'
import { useProfile } from '../state/profile'
import { useSettings } from '../state/settings'
import { markWelcomed } from './welcomeState'
import { Mascot, type MascotMood } from './Mascot'

type Keyboard = 'piano' | 'small' | 'screen'

const KEYBOARDS: { id: Keyboard; icon: string; title: string; text: string }[] = [
  { id: 'piano', icon: '🎹', title: 'Dijital piyano', text: 'USB ya da Bluetooth MIDI ile bağlanır' },
  { id: 'small', icon: '🎛️', title: 'Küçük MIDI klavye', text: '25 tuşlu bir kontrol klavyesi' },
  { id: 'screen', icon: '📱', title: 'Ekran klavyesi', text: 'Şimdilik ekrandan ya da bilgisayar tuşlarıyla' },
]

const GOALS = [
  { xp: 10, name: 'Rahat', text: '1 kısa ders' },
  { xp: 20, name: 'Normal', text: '2 ders' },
  { xp: 30, name: 'Kararlı', text: '3 ders' },
  { xp: 50, name: 'Hırslı', text: '5 ders' },
]

interface Props {
  onDone: () => void
}

/** First launch: Notiş says hello, asks about the keyboard and the daily goal, then the map opens. */
export function Welcome({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [keyboard, setKeyboard] = useState<Keyboard | null>(null)
  const { dailyGoal, setDailyGoal } = useProfile()
  const set = useSettings((s) => s.set)
  const connect = useMidi((s) => s.connect)
  const status = useMidi((s) => s.status)
  const steps = 3

  const finish = () => {
    markWelcomed()
    onDone()
  }

  const pickKeyboard = (k: Keyboard) => {
    setKeyboard(k)
    // A 25-key controller cannot reach every octave: accept the right note in any octave.
    set({ ignoreOctave: k === 'small' })
  }

  let mood: MascotMood = 'happy'
  let say: string
  let body: React.ReactNode
  if (step === 0) {
    say = 'Merhaba, ben Notiş! Sana piyano çalmayı oyunlarla öğreteceğim.'
    body = (
      <p className="welcome-text">
        Notaları okumayı, ritmi, gamları ve akorları küçük derslerle ve mini oyunlarla öğreneceksin. Önce iki kısa soru
        soracağım.
      </p>
    )
  } else if (step === 1) {
    mood = 'think'
    say = 'Hangi klavyeyle çalışacaksın?'
    body = (
      <>
        <div className="welcome-options" role="radiogroup" aria-label="Klavye">
          {KEYBOARDS.map((k) => (
            <button
              key={k.id}
              className={`welcome-option ${keyboard === k.id ? 'on' : ''}`}
              role="radio"
              aria-checked={keyboard === k.id}
              data-welcome-keyboard={k.id}
              onClick={() => pickKeyboard(k.id)}
            >
              <span className="welcome-option-icon" aria-hidden>
                {k.icon}
              </span>
              <span>
                <b>{k.title}</b>
                <span className="muted">{k.text}</span>
              </span>
            </button>
          ))}
        </div>
        {keyboard && keyboard !== 'screen' && (
          <button
            className="btn btn-small welcome-connect"
            onClick={() => void connect()}
            disabled={status === 'requesting' || status === 'ready'}
          >
            {status === 'ready' ? 'MIDI hazır ✓' : 'Şimdi bağlan'}
          </button>
        )}
      </>
    )
  } else {
    say = 'Günde ne kadar çalışmak istersin?'
    body = (
      <div className="welcome-options" role="radiogroup" aria-label="Günlük hedef">
        {GOALS.map((g) => (
          <button
            key={g.xp}
            className={`welcome-option ${dailyGoal === g.xp ? 'on' : ''}`}
            role="radio"
            aria-checked={dailyGoal === g.xp}
            data-welcome-goal={g.xp}
            onClick={() => setDailyGoal(g.xp)}
          >
            <span className="welcome-option-icon" aria-hidden>
              🔥
            </span>
            <span>
              <b>
                {g.name}: {g.xp} XP
              </b>
              <span className="muted">{g.text}</span>
            </span>
          </button>
        ))}
      </div>
    )
  }

  const last = step === steps - 1
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Hoş geldin">
      <div className="welcome-card">
        <div className="welcome-dots" aria-hidden>
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <div className="welcome-say">
          <Mascot mood={mood} size={96} pulse={step} />
          <p className="greeting-say">{say}</p>
        </div>
        {body}
        <div className="welcome-actions">
          <button className="btn welcome-next" onClick={() => (last ? finish() : setStep(step + 1))}>
            {last ? 'Haritaya geç' : step === 0 ? 'Tanıştık!' : 'Devam'}
          </button>
          {!last && (
            <button className="link welcome-skip" onClick={finish}>
              Şimdilik geç
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
