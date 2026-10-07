import { useEffect, useState } from 'react'
import { subscribe } from '../input/inputBus'
import { octaveAdvice } from '../midi/keyboards'
import { useMidi } from '../midi/midiStore'

/** For a 25-key controller: the next key pressed is taken as its leftmost key. */
function OctaveCheck({ device }: { device: string }) {
  const [advice, setAdvice] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type === 'on' && e.source === 'midi' && e.device === device) setAdvice(octaveAdvice(e.midi))
      }),
    [device],
  )
  return (
    <p className={`small octave-check ${advice ? (advice.ok ? 'good' : 'bad') : 'muted'}`}>
      {advice ? advice.text : 'Oktav ipucu: klavyenin en soldaki tuşuna bas.'}
    </p>
  )
}

function OwnKeyboardsHelp() {
  return (
    <>
      <li>
        <b>Evde, Yamaha CLP-845:</b> USB ve Bluetooth MIDI ikisi de var.
        <ul>
          <li>
            En sağlam yol USB kablo: piyanodaki kare <b>USB TO HOST</b> girişinden bilgisayara (USB-B kablo). Android
            tablet ya da telefon için USB-C ucu olan bir USB-B kablo ya da OTG adaptörü kullan.
          </li>
          <li>
            Bluetooth MIDI: piyanoyu telefonun Bluetooth ayarlarından eşleştirmek yalnızca <b>ses</b> bağlantısı kurar,
            notalar gelmez. Android’de "MIDI BLE Connect" gibi bir uygulamayla bağla, Mac’te Audio MIDI Setup → MIDI
            Stüdyosu → Bluetooth ile. Windows’ta tarayıcı Bluetooth MIDI’yi genelde görmez, orada USB kullan.
          </li>
          <li>Menüsünde Bluetooth yoksa: bazı ülkelerde satılan CLP-845’lerde Bluetooth bulunmuyor, USB ile bağla.</li>
          <li>Piyano kendi sesini çıkarır; uygulamanın piyano sesi kapalı kalır.</li>
        </ul>
      </li>
      <li>
        <b>Ofiste, Akai MPK Mini MK3:</b> yalnızca USB, Bluetooth’u yok. Kutusundaki USB kabloyla bilgisayara tak,
        sürücü gerekmez. Kendi sesi olmadığı için uygulama piyano sesini çalar. 25 tuş var: dersler için en soldaki Do,
        orta Do olmalı; <b>OCTAVE</b> düğmeleriyle kaydır.
      </li>
    </>
  )
}

export function MidiPanel() {
  const { status, devices, error, connect } = useMidi()
  const [showHelp, setShowHelp] = useState(false)

  let text: string
  let tone: 'ok' | 'warn' | 'off'
  if (status === 'unsupported') {
    text = 'Bu tarayıcı MIDI desteklemiyor. Ekran klavyesiyle devam edebilirsin.'
    tone = 'off'
  } else if (status === 'denied') {
    text = 'MIDI izni verilmedi.'
    tone = 'warn'
  } else if (status === 'ready' && devices.length > 0) {
    text = `Bağlı: ${devices.map((d) => d.keyboard?.name ?? d.name).join(', ')}`
    tone = 'ok'
  } else if (status === 'ready') {
    text = 'MIDI hazır, ama bağlı klavye yok. Klavyeni bağla, kendiliğinden görünecek.'
    tone = 'warn'
  } else {
    text = 'Piyanonu USB ya da Bluetooth MIDI ile bağla.'
    tone = 'off'
  }

  return (
    <section className={`card midi-panel midi-${tone}`}>
      <div className="midi-row">
        <span className="midi-dot" aria-hidden />
        <p>{text}</p>
        {(status === 'idle' || status === 'denied') && (
          <button className="btn btn-small" onClick={() => void connect()}>
            Bağlan
          </button>
        )}
        {status === 'requesting' && <span className="muted">Bağlanıyor…</span>}
      </div>
      {error && <p className="muted small">{error}</p>}
      {devices
        .filter((d) => d.keyboard)
        .map((d) => (
          <div key={d.id} className="keyboard-tip">
            <p className="small">{d.keyboard!.tip}</p>
            {d.keyboard!.keys <= 25 && <OctaveCheck device={d.name} />}
          </div>
        ))}
      <button className="link" onClick={() => setShowHelp((v) => !v)}>
        {showHelp ? 'Yardımı gizle' : 'Klavyemi nasıl bağlarım?'}
      </button>
      {showHelp && (
        <ul className="help small">
          <OwnKeyboardsHelp />
          <li>
            <b>Android:</b> Chrome kullan. USB kablo takınca Bağlan’a dokun. Bluetooth MIDI klavyeyi önce "MIDI BLE
            Connect" gibi bir uygulamayla eşleştir, sonra buraya dönüp Bağlan’a dokun.
          </li>
          <li>
            <b>Mac:</b> Chrome ya da Edge kullan. Bluetooth için Audio MIDI Setup → Pencere → MIDI Stüdyosu → Bluetooth
            simgesi ile piyanoyu bağla.
          </li>
          <li>
            <b>Windows:</b> Chrome ya da Edge ile USB kablo en sorunsuz yoldur.
          </li>
          <li>
            <b>iPhone / iPad:</b> Safari şu an MIDI desteklemiyor. Uygulamanın iOS sürümüne kadar ekran klavyesini
            kullan.
          </li>
          <li>
            Klavye yoksa bilgisayar klavyesi de çalışır: <kbd>A</kbd> Do, <kbd>S</kbd> Re, <kbd>D</kbd> Mi… <kbd>Z</kbd>
            /<kbd>X</kbd> oktav değiştirir.
          </li>
        </ul>
      )}
    </section>
  )
}
